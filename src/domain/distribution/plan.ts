import type { DistributionPreference } from '../types';
import { gcd, prefixValueCeilings, prefixValueFloors, readChips, Representability, requireWhole, toMix, totalValue } from './engine/arith';
import { type Budget, withBudget } from './engine/budget';
import { CapacitySolver } from './engine/capacity';
import { CoverageOracle, PaymentPruner } from './engine/coverage';
import { visitStacks } from './engine/stacks';
import { SEARCH_STEP_LIMIT } from './limits';
import type {
  InitialDistributionRequest,
  InitialDistributionResult,
  NoDistributionReason,
} from './types';

/**
 * Recommends the initial distribution: blinds, accepted depth, the identical starting stack and
 * the achieved reserve, following the spec's hierarchy exactly.
 *
 * 1. Find depths D at which N identical qualifying stacks (exact value T = D × BB, coverage k)
 *    and the full reserve target R (further qualifying stacks, mixes may differ) fit the chip set
 *    at the same time. Among all feasible (depth, big blind, mix) candidates choose by:
 *    (1) smallest |D − requested depth|, (2) lower D, (3) fewest/most chips in one starting stack
 *    per the preference, (4) exact-half small blind over a rounded one, (5) smaller big blind,
 *    (6) more chips of the smaller denomination at the first difference in ascending order.
 * 2. If no depth supports R, use the largest achievable reserve r < R (down to 0) with the same
 *    ranking.
 * 3. If N qualifying stacks fit at no depth even with r = 0, report `noValidDistribution` with
 *    its reason (see `NoDistributionReason`).
 *
 * For a big blind B the small blind is the largest positive amount ≤ B / 2 that the
 * denominations with available chips can represent; B is skipped if there is none, and a small
 * blind that the chips cannot actually pay disqualifies B rather than being lowered further.
 * Deterministic; never returns an inexact stack, a reused chip or an unproven reserve.
 */
export function planInitialDistribution(request: InitialDistributionRequest): InitialDistributionResult {
  const { values, counts } = readChips(request.chipSet, 'chipSet');
  requireWhole(request.players, 1, 'players');
  requireWhole(request.requestedDepth, 1, 'requestedDepth');
  requireWhole(request.coverage, 1, 'coverage');
  requireWhole(request.reserveTarget, 0, 'reserveTarget');
  if (request.preference !== 'fewer' && request.preference !== 'more') throw new RangeError('preference must be fewer or more');
  return withBudget(SEARCH_STEP_LIMIT, (budget) =>
    new Planner(values, counts, request.players, request.requestedDepth, request.coverage, request.reserveTarget, request.preference, budget).run(),
  );
}

interface BigBlind {
  big: number;
  small: number;
  half: boolean;
  /** Smallest depth whose stack can hold k small-blind plus k big-blind payments. */
  minDepth: number;
  /** Fewest chips k small-blind plus k big-blind payments can take (unlimited chips). */
  paymentChips: number;
  oracle: CoverageOracle;
  /** Whether one player's share of chips can form the k + k blind payments (lazy). */
  kernelOk?: boolean;
  /** Totals over the whole chip set for cheap reserve bounds. */
  valueLeBig: number;
  countLeBig: number;
  valueLeSmall: number;
  countLeSmall: number;
}

interface Candidate {
  bb: BigBlind;
  depth: number;
  mix: number[];
  chips: number;
}

class Planner {
  private readonly value: number;
  private readonly share: number[];
  private readonly shareValue: number;
  private readonly smallestAvailable: number;
  /** Gcd of the available denominations. */
  private readonly unit: number;
  private readonly representable: Representability;
  private readonly bigBlinds = new Map<number, BigBlind | null>();
  private readonly fewer: boolean;
  /** fewestChips[a]: fewest chips of available denominations worth exactly a (grown lazily). */
  private readonly fewestChips: number[] = [0];

  constructor(
    private readonly values: number[],
    private readonly counts: number[],
    private readonly players: number,
    private readonly requestedDepth: number,
    private readonly k: number,
    private readonly reserveTarget: number,
    private readonly preference: DistributionPreference,
    private readonly budget: Budget,
  ) {
    this.value = totalValue(values, counts);
    this.share = counts.map((c) => Math.floor(c / players));
    this.shareValue = totalValue(values, this.share);
    const available = values.filter((_, i) => counts[i] > 0);
    this.smallestAvailable = available.length > 0 ? available[0] : 0;
    this.unit = available.reduce((g, v) => gcd(g, v), 0) || 1;
    this.representable = new Representability(available, (steps) => budget.spend(steps));
    this.fewer = preference === 'fewer';
  }

  run(): InitialDistributionResult {
    if (this.smallestAvailable === 0) return { kind: 'noValidDistribution', reason: this.classify() };
    // Every qualifying stack holds k·(SB + BB) ≥ 3k × smallest chip.
    const stacksBound = Math.floor(this.value / (3 * this.k * this.smallestAvailable));
    for (let reserve = Math.min(this.reserveTarget, Math.max(0, stacksBound - this.players)); reserve >= 0; reserve--) {
      const found = this.searchDepths(reserve);
      if (found) return this.result(found, reserve);
    }
    return { kind: 'noValidDistribution', reason: this.classify() };
  }

  private result(found: Candidate, reserve: number): InitialDistributionResult {
    const { bb, depth, mix, chips } = found;
    const bank = this.counts.map((c, i) => c - this.players * mix[i]);
    return {
      kind: 'planned',
      distribution: {
        depth,
        requestedDepth: this.requestedDepth,
        depthAdjusted: depth !== this.requestedDepth,
        blinds: { small: bb.small, big: bb.big },
        smallBlindIsHalf: bb.half,
        stackValue: depth * bb.big,
        stackMix: toMix(this.values, mix),
        chipsPerStack: chips,
        reserve,
        reserveTarget: this.reserveTarget,
        reserveReduced: reserve < this.reserveTarget,
        bank: toMix(this.values, bank),
      },
    };
  }

  /** The big-blind facts for B, or null when B is not a valid big blind for this chip set. */
  private bigBlind(big: number): BigBlind | null {
    const known = this.bigBlinds.get(big);
    if (known !== undefined) return known;
    this.budget.spend();
    let info: BigBlind | null = null;
    const small = this.representable.largestAtMost(Math.floor(big / 2));
    if (small > 0 && this.representable.has(big)) {
      let valueLeBig = 0;
      let countLeBig = 0;
      let valueLeSmall = 0;
      let countLeSmall = 0;
      for (let i = 0; i < this.values.length; i++) {
        if (this.values[i] <= big) {
          valueLeBig += this.values[i] * this.counts[i];
          countLeBig += this.counts[i];
        }
        if (this.values[i] <= small) {
          valueLeSmall += this.values[i] * this.counts[i];
          countLeSmall += this.counts[i];
        }
      }
      info = {
        big,
        small,
        half: small * 2 === big,
        minDepth: Math.ceil((this.k * (big + small)) / big),
        paymentChips: this.k * (this.fewest(small) + this.fewest(big)),
        oracle: new CoverageOracle(this.values, small, big, this.budget),
        valueLeBig,
        countLeBig,
        valueLeSmall,
        countLeSmall,
      };
    }
    this.bigBlinds.set(big, info);
    return info;
  }

  private kernelOk(bb: BigBlind): boolean {
    if (bb.kernelOk === undefined) bb.kernelOk = bb.oracle.maxCoverage(this.share, this.k) >= this.k;
    return bb.kernelOk;
  }

  /** Cheap necessary condition: the whole chip set can pay the blinds of `stacks` stacks. */
  private blindChipsSuffice(bb: BigBlind, stacks: number): boolean {
    const payments = stacks * this.k;
    return (
      bb.valueLeBig >= payments * (bb.big + bb.small) &&
      bb.valueLeSmall >= payments * bb.small &&
      bb.countLeBig >= 2 * payments &&
      bb.countLeSmall >= payments
    );
  }

  /**
   * Least value Pᵢ that denominations 0..i can contribute to one starting stack, for every i:
   * - the residue minimum of `prefixValueFloors`;
   * - what the share's larger chips cannot supply of T, of the k + k blind payments (paid only
   *   with chips ≤ big blind) and of the k small-blind payments (chips ≤ small blind).
   */
  private prefixLows(total: number, bb: BigBlind, floors: readonly number[]): number[] {
    const { values, share, k } = this;
    const m = values.length;
    const lows = new Array<number>(m);
    let above = 0;
    let aboveLeBig = 0;
    let aboveLeSmall = 0;
    for (let i = m - 1; i >= 0; i--) {
      lows[i] = Math.max(floors[i], total - above, k * (bb.big + bb.small) - aboveLeBig, k * bb.small - aboveLeSmall, 0);
      const v = share[i] * values[i];
      above += v;
      if (values[i] <= bb.big) aboveLeBig += v;
      if (values[i] <= bb.small) aboveLeSmall += v;
    }
    return lows;
  }

  /**
   * Necessary condition on prefix values: for every i, one starting stack's least prefix value
   * (`prefixLows`) fits one player's share and the per-stack ceiling that leaves `reserve` further
   * stacks their `prefixValueFloors` (`prefixValueCeilings`).
   */
  private prefixValuesSuffice(total: number, bb: BigBlind, reserve: number): boolean {
    const floors = prefixValueFloors(this.values, total, bb.small, bb.big, this.k);
    const lows = this.prefixLows(total, bb, floors);
    const ceilings = prefixValueCeilings(this.values, this.counts, this.players, reserve, floors);
    let shared = 0;
    for (let i = 0; i < this.values.length; i++) {
      shared += this.values[i] * this.share[i];
      if (lows[i] > shared || lows[i] > ceilings[i]) return false;
    }
    return true;
  }

  /** Nearest depth (lower first at equal distance) with a candidate supporting `reserve`. */
  private searchDepths(reserve: number): Candidate | null {
    const stacks = this.players + reserve;
    const maxStackValue = Math.min(Math.floor(this.value / stacks), this.shareValue);
    const lowest = this.k + 1;
    const highest = Math.floor(maxStackValue / (2 * this.smallestAvailable));
    if (highest < lowest) return null;
    const requested = this.requestedDepth;
    const start = requested > highest ? requested - highest : requested < lowest ? lowest - requested : 0;
    for (let distance = start; ; distance++) {
      const below = requested - distance;
      const above = requested + distance;
      if (below < lowest && above > highest) return null;
      if (below >= lowest && below <= highest) {
        const found = this.bestAtDepth(below, reserve, maxStackValue);
        if (found) return found;
      }
      if (distance > 0 && above >= lowest && above <= highest) {
        const found = this.bestAtDepth(above, reserve, maxStackValue);
        if (found) return found;
      }
    }
  }

  /** Best candidate at one depth: chip objective, exact half, smaller big blind, tie-break. */
  private bestAtDepth(depth: number, reserve: number, maxStackValue: number): Candidate | null {
    const stacks = this.players + reserve;
    const options: { bb: BigBlind; bound: number }[] = [];
    const highestBig = Math.floor(maxStackValue / depth);
    // A big blind must be representable, so a multiple of the gcd of the available denominations.
    for (let big = 2 * this.smallestAvailable; big <= highestBig; big += this.unit) {
      this.budget.spend();
      const bb = this.bigBlind(big);
      if (!bb || bb.minDepth > depth || !this.blindChipsSuffice(bb, stacks)) continue;
      if (!this.prefixValuesSuffice(depth * big, bb, reserve)) continue;
      options.push({ bb, bound: this.chipBound(depth * big, bb, reserve) });
    }
    options.sort(
      (a, b) =>
        (this.fewer ? a.bound - b.bound : b.bound - a.bound) ||
        Number(b.bb.half) - Number(a.bb.half) ||
        a.bb.big - b.bb.big,
    );
    let best: Candidate | null = null;
    for (const { bb, bound } of options) {
      let allowEqual = true;
      if (best) {
        if (this.fewer ? bound > best.chips : bound < best.chips) break;
        allowEqual = this.winsAtEqualChips(bb, best.bb);
        if (bound === best.chips && !allowEqual) continue;
      }
      if (!this.kernelOk(bb)) continue;
      const found = this.bestMix(depth, bb, reserve, best ? { chips: best.chips, allowEqual } : null);
      if (found) best = found;
    }
    return best;
  }

  /** Ranking levels 4 and 5 between two big blinds whose stacks have equal chip counts. */
  private winsAtEqualChips(bb: BigBlind, incumbent: BigBlind): boolean {
    if (bb.half !== incumbent.half) return bb.half;
    return bb.big < incumbent.big;
  }

  /** Fewest chips of the available denominations (any number of each) worth exactly `amount`. */
  private fewest(amount: number): number {
    const table = this.fewestChips;
    const available = this.values.filter((_, i) => this.counts[i] > 0);
    if (table.length <= amount) this.budget.spend(Math.ceil(((amount + 1 - table.length) * available.length) / 8));
    for (let a = table.length; a <= amount; a++) {
      let best = Infinity;
      for (const d of available) if (d <= a && table[a - d] + 1 < best) best = table[a - d] + 1;
      table.push(best);
    }
    return table[amount];
  }

  /**
   * Optimistic chip count of a starting stack of value T (fewest for 'fewer', most for 'more')
   * when `reserve` further qualifying stacks must remain. Combines:
   * - the fewest chips of one player's share that reach T / the most that stay ≤ T;
   * - for 'fewer', the fewest chips of the k + k blind payments plus the fewest reaching the rest;
   * - prefix values: with Pᵢ the value of denominations 0..i in the stack (P of the last is T),
   *   the chip count is exactly Σᵢ Pᵢ·(1/dᵢ − 1/dᵢ₊₁) + T/d_last with positive coefficients, so
   *   it is bounded by the per-prefix bounds on Pᵢ: at most the share's prefix value and the
   *   `prefixValueCeilings` the reserve leaves, at least the `prefixValueFloors` and what the
   *   share's larger chips cannot cover.
   */
  private chipBound(total: number, bb: BigBlind, reserve: number): number {
    const { values, share, counts, players } = this;
    const m = values.length;
    const floors = prefixValueFloors(values, total, bb.small, bb.big, this.k);
    const ceilings = prefixValueCeilings(values, counts, players, reserve, floors);
    const lows = this.prefixLows(total, bb, floors);
    let shareBelow = 0;
    let sum = total / values[m - 1];
    for (let i = 0; i < m - 1; i++) {
      shareBelow += share[i] * values[i];
      const weight = 1 / values[i] - 1 / values[i + 1];
      const prefix = this.fewer ? lows[i] : Math.min(ceilings[i], shareBelow, total);
      sum += prefix * weight;
    }
    // A tolerance on the rounding can only loosen the bound.
    if (this.fewer) {
      const reach = Math.max(this.fewestReaching(total), bb.paymentChips + this.fewestReaching(total - this.k * (bb.big + bb.small)));
      return Math.max(reach, Math.ceil(sum - 1e-6));
    }
    let chips = 0;
    let value = 0;
    for (let i = 0; i < m; i++) {
      if (value + share[i] * values[i] > total) return Math.min(chips + Math.floor((total - value) / values[i]), Math.floor(sum + 1e-6));
      value += share[i] * values[i];
      chips += share[i];
    }
    return Math.min(chips, Math.floor(sum + 1e-6));
  }

  /** Fewest chips of one player's share whose value reaches `amount` (largest chips first). */
  private fewestReaching(amount: number): number {
    const { values, share } = this;
    let chips = 0;
    let value = 0;
    if (amount <= 0) return 0;
    for (let i = values.length - 1; i >= 0; i--) {
      if (value + share[i] * values[i] >= amount) return chips + Math.ceil((amount - value) / values[i]);
      value += share[i] * values[i];
      chips += share[i];
    }
    return Infinity;
  }

  /**
   * The best identical mix for (depth, big blind) whose leftover chips still form `reserve`
   * qualifying stacks, or null. With an incumbent, only mixes that could beat it are examined.
   */
  private bestMix(
    depth: number,
    bb: BigBlind,
    reserve: number,
    incumbent: { chips: number; allowEqual: boolean } | null,
  ): Candidate | null {
    const total = depth * bb.big;
    const { values, counts, players, k } = this;
    const solver = new CapacitySolver(values, counts, total, bb.oracle, k, this.budget);
    let relaxationChecked = false;
    let hopeless = false;
    const smallEnd = bb.oracle.smallEnd;
    const pruner = new PaymentPruner(bb.oracle, reserve * k);
    const floors = prefixValueFloors(values, total, bb.small, bb.big, k);
    let found: Candidate | null = null;
    visitStacks(
      {
        values,
        caps: this.share,
        total,
        preference: this.preference,
        oracle: bb.oracle,
        minCoverage: k,
        acceptSmallPart:
          reserve > 0
            ? (mix) => {
                const rest = new Array<number>(smallEnd);
                for (let i = 0; i < smallEnd; i++) rest[i] = counts[i] - players * mix[i];
                return pruner.mayPay(rest);
              }
            : undefined,
        prefixMin: this.prefixLows(total, bb, floors),
        prefixMax: prefixValueCeilings(values, counts, players, reserve, floors),
        minChips: this.fewer ? this.chipBound(total, bb, reserve) : undefined,
        maxChips: this.fewer ? undefined : this.chipBound(total, bb, reserve),
        budget: this.budget,
      },
      (mix, chips) => {
        if (incumbent) {
          const worse = this.fewer ? chips > incumbent.chips : chips < incumbent.chips;
          if (worse || (chips === incumbent.chips && !incumbent.allowEqual)) return true;
        }
        if (reserve > 0) {
          const rest = counts.map((c, i) => c - players * mix[i]);
          if (!solver.canForm(rest, reserve)) {
            // Once a leftover falls short, check the relaxation without identical mixes:
            // if N + r qualifying stacks cannot fit the chip set at all, stop here.
            if (!relaxationChecked) {
              relaxationChecked = true;
              hopeless = solver.provablyFewerThan(counts, players + reserve);
            }
            return hopeless;
          }
        }
        found = { bb, depth, mix: mix.slice(), chips };
        return true;
      },
    );
    return found;
  }

  /** Reason for `noValidDistribution`; see `NoDistributionReason`. */
  private classify(): NoDistributionReason {
    const k = this.k;
    // Smallest conceivable qualifying stack: 1/2 blinds paid with 1-unit chips.
    const idealMinimum = 2 * Math.ceil((3 * k) / 2);
    if (this.shareValue < idealMinimum || this.smallestAvailable === 0) return 'insufficientValue';
    let affordable = false;
    let blindChips = false;
    const highestBig = Math.floor(this.shareValue / (k + 1));
    for (let big = 2 * this.smallestAvailable; big <= highestBig && !blindChips; big += this.unit) {
      this.budget.spend();
      const bb = this.bigBlind(big);
      if (!bb || bb.minDepth * big > this.shareValue) continue;
      affordable = true;
      if (this.kernelOk(bb)) blindChips = true;
    }
    if (!affordable) return 'unsuitableDenominations';
    if (!blindChips) return 'insufficientBlindChips';
    return 'unsuitableDenominations';
  }
}

