import type { Budget } from './budget';
import { gcd } from './arith';
import { provablyUnpackable } from './lp';
import { ReductionFamily } from './reduction';

/** Search steps a pruning-only payment packing may take before it is treated as unknown. */
export const PRUNING_PACK_STEPS = 300;
/** Search steps an exact packing decision takes before the LP certificate is consulted. */
const QUICK_PACK_STEPS = 2_000;

/**
 * Exact disjoint blind-payment packing for one blind pair.
 *
 * Only chips worth at most the big blind can take part in a payment. A "small part" is the
 * count vector of the first `smallEnd` denominations (those ≤ big blind). `canPay(part, nBig,
 * nSmall)` decides whether nBig exact big-blind payments and nSmall exact small-blind payments
 * can be formed from disjoint chips of `part`; each payment may use several chips.
 *
 * Every question is first simplified exactly by `ResidueReduction`, which removes residue
 * (parity-like) constraints. The remaining core is decided by search: one payment at a time (big blinds first, larger chips
 * first), memoizing every (remaining chips, payments left) state. Cheap value and count bounds
 * reject hopeless states. When a short search does not settle a question, the LP certificate of
 * `provablyUnpackable` is tried before the search runs to completion; both are exact.
 */
export class CoverageOracle {
  readonly smallEnd: number;
  /** The real denominations ≤ big blind. */
  private readonly realValues: readonly number[];
  private readonly cores: ReductionFamily<Core>;
  private readonly coverageMemo = new Map<string, { value: number; cap: number }>();

  constructor(
    values: readonly number[],
    readonly small: number,
    readonly big: number,
    private readonly budget: Budget,
  ) {
    let smallEnd = 0;
    while (smallEnd < values.length && values[smallEnd] <= big) smallEnd++;
    this.smallEnd = smallEnd;
    this.realValues = values.slice(0, smallEnd);
    this.cores = new ReductionFamily(this.realValues, [big, small], (reduction) => {
      const coreValues = reduction.values;
      const [coreBig, coreSmall] = reduction.amounts;
      const prefixGcd: number[] = [];
      let g = 0;
      for (const v of coreValues) prefixGcd.push((g = gcd(g, v)));
      return {
        values: coreValues,
        big: coreBig,
        small: coreSmall,
        bigEnd: coreValues.filter((v) => v <= coreBig).length,
        sbEnd: coreValues.filter((v) => v <= coreSmall).length,
        prefixGcd,
        memo: new Map<string, boolean>(),
      };
    });
  }

  /** Largest c ≤ cap with c small-blind and c big-blind payments from disjoint chips of `part`. */
  maxCoverage(part: readonly number[], cap: number): number {
    this.budget.spend();
    let key = '';
    for (let i = 0; i < this.smallEnd; i++) key += `${part[i]},`;
    const known = this.coverageMemo.get(key);
    if (known && (known.value < known.cap || known.value >= cap)) return Math.min(known.value, cap);
    const pairValue = this.small + this.big;
    let valueLeBig = 0;
    for (let i = 0; i < this.smallEnd; i++) valueLeBig += part[i] * this.realValues[i];
    let hi = Math.min(cap, Math.floor(valueLeBig / pairValue));
    let lo = known ? known.value : 0;
    // Feasibility is monotone in c: binary search for the largest feasible c in [lo, hi].
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (this.canPay(part, mid, mid)) lo = mid;
      else hi = mid - 1;
    }
    this.coverageMemo.set(key, { value: lo, cap });
    return lo;
  }

  /** Whether nBig big-blind and nSmall small-blind payments can be made from disjoint chips. */
  canPay(part: readonly number[], nBig: number, nSmall: number): boolean {
    const quick = this.canPayWithin(part, nBig, nSmall, QUICK_PACK_STEPS);
    if (quick !== undefined) return quick;
    if (this.provablyUnpayable(part, nBig, nSmall)) return false;
    const reduced = this.reduce(part, nBig, nSmall);
    return reduced !== null && search(reduced.core, this.budget, reduced.rest, reduced.nBig, reduced.nSmall);
  }

  /**
   * `canPay` for use as a pruning bound only: gives up after `steps` search steps and returns
   * undefined ("unknown"). Deterministic. States finished before giving up stay memoized.
   */
  canPayWithin(part: readonly number[], nBig: number, nSmall: number, steps: number): boolean | undefined {
    const reduced = this.reduce(part, nBig, nSmall);
    if (reduced === null) return false;
    return this.budget.within(steps, () => search(reduced.core, this.budget, reduced.rest, reduced.nBig, reduced.nSmall));
  }

  /** Whether an exact LP certificate proves the payments impossible (see `provablyUnpackable`). */
  provablyUnpayable(part: readonly number[], nBig: number, nSmall: number): boolean {
    const reduced = this.reduce(part, nBig, nSmall);
    if (reduced === null) return true;
    const { core, rest } = reduced;
    return provablyUnpackable(core.values, rest, [core.big, core.small], [reduced.nBig, reduced.nSmall], this.budget);
  }

  /** The reduced question, or null if the forced chips cannot be met. */
  private reduce(
    part: readonly number[],
    nBig: number,
    nSmall: number,
  ): { core: Core; rest: number[]; nBig: number; nSmall: number } | null {
    const own = part.slice(0, this.smallEnd);
    const { reduction, extra: core } = this.cores.forInventory(own);
    this.budget.spend(reduction.size);
    const rest = reduction.reduce(own, [nBig, nSmall]);
    if (rest === null) return null;
    // A payment whose whole amount is forced is complete.
    return { core, rest, nBig: core.big > 0 ? nBig : 0, nSmall: core.small > 0 ? nSmall : 0 };
  }
}

/** One reduced payment question shape: core denominations, amounts and its memo. */
interface Core {
  values: readonly number[];
  big: number;
  small: number;
  /** Number of core denominations ≤ big / ≤ small amount. */
  bigEnd: number;
  sbEnd: number;
  prefixGcd: number[];
  memo: Map<string, boolean>;
}

function search(core: Core, budget: Budget, rest: number[], nBig: number, nSmall: number): boolean {
  if (nBig === 0 && nSmall === 0) return true;
  budget.spend();
  const { values, big, small, bigEnd, sbEnd } = core;
  let valueAll = 0;
  let countAll = 0;
  let valueLeBig = 0;
  let countLeBig = 0;
  let valueLeSmall = 0;
  let countLeSmall = 0;
  const end = Math.max(nBig > 0 ? bigEnd : 0, nSmall > 0 ? sbEnd : 0);
  for (let i = 0; i < end; i++) {
    const v = rest[i] * values[i];
    valueAll += v;
    countAll += rest[i];
    if (i < bigEnd) {
      valueLeBig += v;
      countLeBig += rest[i];
    }
    if (i < sbEnd) {
      valueLeSmall += v;
      countLeSmall += rest[i];
    }
  }
  if (
    valueAll < nBig * big + nSmall * small ||
    valueLeBig < nBig * big ||
    valueLeSmall < nSmall * small ||
    countAll < nBig + nSmall ||
    countLeBig < nBig ||
    countLeSmall < nSmall
  ) {
    return false;
  }
  const key = `${rest.join(',')}|${nBig}|${nSmall}`;
  const known = core.memo.get(key);
  if (known !== undefined) return known;
  const payingBig = nBig > 0;
  const target = payingBig ? big : small;
  const top = (payingBig ? bigEnd : sbEnd) - 1;
  const next = () => search(core, budget, rest, payingBig ? nBig - 1 : nBig, payingBig ? nSmall : nSmall - 1);
  const found = compose(core, budget, rest, top, target, next);
  core.memo.set(key, found);
  return found;
}

/** Tries every exact composition of `left` from denominations 0..j of `rest`, larger chips first. */
function compose(core: Core, budget: Budget, rest: number[], j: number, left: number, next: () => boolean): boolean {
  if (left === 0) return next();
  if (j < 0 || left % core.prefixGcd[j] !== 0) return false;
  budget.spend();
  const { values } = core;
  let below = 0;
  for (let i = 0; i < j; i++) below += rest[i] * values[i];
  const d = values[j];
  const most = Math.min(rest[j], Math.floor(left / d));
  const least = Math.max(0, Math.ceil((left - below) / d));
  for (let c = most; c >= least; c--) {
    rest[j] -= c;
    const ok = compose(core, budget, rest, j - 1, left - c * d, next);
    rest[j] += c;
    if (ok) return true;
  }
  return false;
}

/**
 * Pruning filter for "can these leftover chips still pay `payments` big blinds and `payments`
 * small blinds?". Answers false only when that is proven: by a short exact search, or by the LP
 * certificate. The certificate is skipped after it has failed to prove anything several times
 * in a row, so a filter that cannot help stops costing time. Deterministic.
 */
export class PaymentPruner {
  private misses = 0;

  constructor(
    private readonly oracle: CoverageOracle,
    private readonly payments: number,
  ) {}

  mayPay(rest: readonly number[]): boolean {
    if (this.payments <= 0) return true;
    const quick = this.oracle.canPayWithin(rest, this.payments, this.payments, PRUNING_PACK_STEPS);
    if (quick !== undefined) return quick;
    if (this.misses >= 3) return true;
    if (this.oracle.provablyUnpayable(rest, this.payments, this.payments)) {
      this.misses = 0;
      return false;
    }
    this.misses++;
    return true;
  }
}
