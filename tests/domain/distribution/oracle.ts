/**
 * Independent brute-force reference for small inventories. Shares no code with the solver:
 * every mix, every blind pair and every reserve combination is enumerated directly from the
 * spec's definitions. Only usable for tiny inputs.
 */

export type Pref = 'fewer' | 'more';

export interface BruteChipSet {
  values: number[];
  counts: number[];
}

const valueOf = (values: number[], mix: number[]) => mix.reduce((sum, c, i) => sum + c * values[i], 0);
const chipsOf = (mix: number[]) => mix.reduce((sum, c) => sum + c, 0);

/** Every vector 0 ≤ x ≤ caps. */
export function allVectors(caps: number[]): number[][] {
  let out: number[][] = [[]];
  for (const cap of caps) {
    const next: number[][] = [];
    for (const prefix of out) for (let c = 0; c <= cap; c++) next.push([...prefix, c]);
    out = next;
  }
  return out;
}

/** Whether `amount` is a sum of the given denominations with unlimited repetition. */
function representable(denominations: number[], amount: number): boolean {
  const ok = new Array<boolean>(amount + 1).fill(false);
  ok[0] = true;
  for (let v = 1; v <= amount; v++) ok[v] = denominations.some((d) => d <= v && ok[v - d]);
  return ok[amount];
}

/** Largest positive representable amount ≤ big / 2, using denominations with chips; 0 if none. */
export function bruteSmallBlind(set: BruteChipSet, big: number): number {
  const available = set.values.filter((_, i) => set.counts[i] > 0);
  for (let s = Math.floor(big / 2); s >= 1; s--) if (representable(available, s)) return s;
  return 0;
}

/** Whether disjoint groups with the listed exact amounts can be taken from `rest`. */
function canForm(values: number[], rest: number[], amounts: number[], memo: Map<string, boolean>): boolean {
  if (amounts.length === 0) return true;
  const key = `${rest.join(',')}|${amounts.join(',')}`;
  const known = memo.get(key);
  if (known !== undefined) return known;
  const [amount, ...others] = amounts;
  let ok = false;
  for (const group of allVectors(rest)) {
    if (valueOf(values, group) !== amount) continue;
    if (canForm(values, rest.map((c, i) => c - group[i]), others, memo)) {
      ok = true;
      break;
    }
  }
  memo.set(key, ok);
  return ok;
}

/** Largest c ≤ cap such that c small-blind and c big-blind payments use disjoint chips of `mix`. */
export function bruteCoverage(values: number[], mix: number[], small: number, big: number, cap: number): number {
  const memo = new Map<string, boolean>();
  let c = 0;
  while (c < cap) {
    const amounts = [...new Array<number>(c + 1).fill(big), ...new Array<number>(c + 1).fill(small)];
    if (!canForm(values, mix, amounts, memo)) break;
    c++;
  }
  return c;
}

export function bruteCanPay(values: number[], mix: number[], amount: number): boolean {
  return canForm(values, mix, [amount], new Map());
}

export interface BruteRule {
  values: number[];
  total: number;
  small: number;
  big: number;
  k: number;
}

const coverageCache = new Map<string, number>();
function coverageOf(rule: BruteRule, mix: number[], cap: number): number {
  const key = `${rule.values.join(',')}|${rule.small}/${rule.big}|${mix.join(',')}|${cap}`;
  let c = coverageCache.get(key);
  if (c === undefined) {
    c = bruteCoverage(rule.values, mix, rule.small, rule.big, cap);
    coverageCache.set(key, c);
  }
  return c;
}

/** Every qualifying mix (exact value, coverage ≥ k) within `caps`. */
export function qualifyingMixes(rule: BruteRule, caps: number[]): number[][] {
  return allVectors(caps).filter((x) => valueOf(rule.values, x) === rule.total && coverageOf(rule, x, rule.k) >= rule.k);
}

/** Most qualifying stacks (each its own mix) that fit `inventory` at once, up to `cap`. */
export function bruteCapacity(rule: BruteRule, inventory: number[], cap: number): number {
  const options = qualifyingMixes(rule, inventory);
  let best = 0;
  const walk = (rest: number[], from: number, taken: number) => {
    best = Math.max(best, taken);
    if (best >= cap) return;
    for (let j = from; j < options.length; j++) {
      const option = options[j];
      if (option.every((c, i) => c <= rest[i])) walk(rest.map((c, i) => c - option[i]), j, taken + 1);
      if (best >= cap) return;
    }
  };
  walk(inventory, 0, 0);
  return Math.min(best, cap);
}

/** Negative when a ranks before b: chip count by preference, then more of the smaller denomination first. */
export function compareMixes(a: number[], b: number[], pref: Pref): number {
  const ca = chipsOf(a);
  const cb = chipsOf(b);
  if (ca !== cb) return pref === 'fewer' ? ca - cb : cb - ca;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] - a[i];
  return 0;
}

export interface BrutePlan {
  depth: number;
  small: number;
  big: number;
  mix: number[];
  reserve: number;
}

/** The spec's ranking applied to every feasible (depth, big blind, mix) at each reserve level. */
export function brutePlan(set: BruteChipSet, players: number, requested: number, k: number, reserveTarget: number, pref: Pref): BrutePlan | null {
  const { values, counts } = set;
  const total = valueOf(values, counts);
  const share = counts.map((c) => Math.floor(c / players));
  const byValue = new Map<number, number[][]>();
  for (const x of allVectors(share)) {
    const v = valueOf(values, x);
    if (!byValue.has(v)) byValue.set(v, []);
    byValue.get(v)!.push(x);
  }
  for (let reserve = reserveTarget; reserve >= 0; reserve--) {
    let best: (BrutePlan & { chips: number }) | null = null;
    for (let depth = 1; depth <= total; depth++) {
      for (let big = 1; depth * big * players <= total; big++) {
        const small = bruteSmallBlind(set, big);
        if (small === 0) continue;
        const rule: BruteRule = { values, total: depth * big, small, big, k };
        for (const x of byValue.get(depth * big) ?? []) {
          if (coverageOf(rule, x, k) < k) continue;
          const rest = counts.map((c, i) => c - players * x[i]);
          if (reserve > 0 && bruteCapacity(rule, rest, reserve) < reserve) continue;
          const candidate = { depth, small, big, mix: x, reserve, chips: chipsOf(x) };
          if (!best || rankPlan(candidate, best, requested, pref) < 0) best = candidate;
        }
      }
    }
    if (best) return { depth: best.depth, small: best.small, big: best.big, mix: best.mix, reserve: best.reserve };
  }
  return null;
}

function rankPlan(a: BrutePlan, b: BrutePlan, requested: number, pref: Pref): number {
  const da = Math.abs(a.depth - requested);
  const db = Math.abs(b.depth - requested);
  if (da !== db) return da - db;
  if (a.depth !== b.depth) return a.depth - b.depth;
  const ca = chipsOf(a.mix);
  const cb = chipsOf(b.mix);
  if (ca !== cb) return pref === 'fewer' ? ca - cb : cb - ca;
  const ha = a.small * 2 === a.big;
  const hb = b.small * 2 === b.big;
  if (ha !== hb) return ha ? -1 : 1;
  if (a.big !== b.big) return a.big - b.big;
  return compareMixes(a.mix, b.mix, pref);
}

export type BruteLater =
  | { kind: 'qualifying'; mix: number[]; reserveAfter: number }
  | { kind: 'reducedCoverage'; mix: number[]; coverage: number }
  | { kind: 'impossible'; reason: 'insufficientValue' | 'unsuitableDenominations' | 'coverageShortage'; achievableCoverage: number | null };

export function bruteLater(rule: BruteRule, bank: number[], keep: number, pref: Pref, allowReduced: boolean): BruteLater {
  const { values, total, k } = rule;
  if (valueOf(values, bank) < total) return { kind: 'impossible', reason: 'insufficientValue', achievableCoverage: null };
  const formable = bruteCapacity(rule, bank, keep + 1);
  if (formable >= 1) {
    const protect = Math.min(keep, formable - 1);
    const options = qualifyingMixes(rule, bank)
      .filter((y) => bruteCapacity(rule, bank.map((c, i) => c - y[i]), protect) >= protect)
      .sort((a, b) => compareMixes(a, b, pref));
    return { kind: 'qualifying', mix: options[0], reserveAfter: protect };
  }
  const exact = allVectors(bank).filter((y) => valueOf(values, y) === total);
  if (exact.length === 0) return { kind: 'impossible', reason: 'unsuitableDenominations', achievableCoverage: null };
  const scored = exact.map((y) => ({ y, c: coverageOf(rule, y, k) }));
  const top = Math.max(...scored.map((s) => s.c));
  if (!allowReduced) return { kind: 'impossible', reason: 'coverageShortage', achievableCoverage: top };
  const best = scored.filter((s) => s.c === top).map((s) => s.y).sort((a, b) => compareMixes(a, b, pref))[0];
  return { kind: 'reducedCoverage', mix: best, coverage: top };
}

/** Deterministic PRNG (mulberry32) so failures reproduce from the printed seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
