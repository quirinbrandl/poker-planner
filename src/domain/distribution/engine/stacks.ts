import type { DistributionPreference } from '../../types';
import type { Budget } from './budget';
import { gcd, mod, modInverse } from './arith';
import type { CoverageOracle } from './coverage';

export interface StackQuery {
  values: readonly number[];
  /** Upper bound per denomination (an inventory, or a per-player share of one). */
  caps: readonly number[];
  /** Exact value every visited mix has. */
  total: number;
  /** Rank order to visit in; 'any' visits in an unspecified (but deterministic) order, faster. */
  preference: DistributionPreference | 'any';
  /** Blind pair to measure coverage with; required when `minCoverage > 0` or `acceptSmallPart` is set. */
  oracle: CoverageOracle | null;
  /** Visit only mixes with at least this coverage (0: every exact-value mix). */
  minCoverage: number;
  /**
   * Optional pruning hook, called once the counts of all denominations ≤ big blind are fixed
   * (those are the only chips coverage depends on). Returning false skips every mix with that
   * small part.
   */
  acceptSmallPart?: (mix: readonly number[]) => boolean;
  /**
   * Optional bounds on the value of each prefix of the mix: for every i, the value of
   * denominations 0..i must lie in [prefixMin[i], prefixMax[i]].
   */
  prefixMin?: readonly number[];
  prefixMax?: readonly number[];
  /**
   * Only for preference 'any': per-denomination counts to try first; other counts follow in
   * order of distance from it (lower first on ties). Every count is still tried.
   */
  aim?: readonly number[];
  /** Optional bounds on the chip count of visited mixes (chip-count orders only). */
  minChips?: number;
  maxChips?: number;
  budget: Budget;
}

/**
 * Visits every mix x with Σ xᵢ·valueᵢ = total, 0 ≤ xᵢ ≤ capsᵢ and coverage ≥ minCoverage, in rank
 * order: chip count ascending ('fewer') or descending ('more'), then more chips of the smaller
 * denomination at the first difference in ascending order. `visit` receives a scratch array it
 * must copy to keep; returning true stops the walk. Returns whether the walk was stopped.
 *
 * The walk fixes the chip count n first, then counts from the smallest denomination up, each
 * from high to low. Every node is pruned by exact necessary conditions on the remaining value v
 * and count c for the remaining denominations: c within the caps, v between the smallest and
 * largest value c chips can have, and v − c·dᵢ divisible by the gcd of the remaining value gaps
 * (solved as a linear congruence so infeasible counts are skipped, not tried). Once the
 * coverage-relevant prefix is fixed, the rest is purely structural: whether (index, v, c) can be
 * completed at all is memoized, and the coverage and `acceptSmallPart` checks run only for
 * prefixes that can be completed (each prefix checked once). Optional prefix-value bounds cut the
 * count range of each denomination directly.
 */
export function visitStacks(q: StackQuery, visit: (mix: readonly number[], chips: number) => boolean): boolean {
  const { values, caps, total, budget, oracle, minCoverage, acceptSmallPart, prefixMin, prefixMax } = q;
  const m = values.length;
  const smallEnd = oracle ? oracle.smallEnd : 0;
  const checkSmall = oracle !== null && (minCoverage > 0 || acceptSmallPart !== undefined);

  const suffixCap: number[] = new Array(m + 1).fill(0);
  for (let i = m - 1; i >= 0; i--) suffixCap[i] = suffixCap[i + 1] + caps[i];
  // gaps[i] = gcd over j > i of (dⱼ − dᵢ); 0 for the last denomination.
  const gaps: number[] = new Array(m).fill(0);
  for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) gaps[i] = gcd(gaps[i], values[j] - values[i]);

  const minValue = (i: number, c: number): number => {
    let value = 0;
    for (let j = i; j < m && c > 0; j++) {
      const take = Math.min(c, caps[j]);
      value += take * values[j];
      c -= take;
    }
    return c > 0 ? Infinity : value;
  };
  const maxValue = (i: number, c: number): number => {
    let value = 0;
    for (let j = m - 1; j >= i && c > 0; j--) {
      const take = Math.min(c, caps[j]);
      value += take * values[j];
      c -= take;
    }
    return c > 0 ? -Infinity : value;
  };
  const feasible = (i: number, v: number, c: number): boolean => {
    if (c < 0 || v < 0) return false;
    if (i === m) return v === 0 && c === 0;
    if (c > suffixCap[i] || v < c * values[i]) return false;
    if (gaps[i] === 0) return v === c * values[i];
    if ((v - c * values[i]) % gaps[i] !== 0) return false;
    return minValue(i, c) <= v && v <= maxValue(i, c);
  };

  // Range of chip counts that any exact mix (ignoring coverage) can have.
  const anyCount = suffixCap[0];
  let lowest = 0;
  let highest = -1;
  {
    let lo = 0;
    let hi = anyCount;
    if (maxValue(0, hi) < total) return false;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (maxValue(0, mid) >= total) hi = mid;
      else lo = mid + 1;
    }
    lowest = lo;
    lo = 0;
    hi = anyCount;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (minValue(0, mid) <= total) lo = mid;
      else hi = mid - 1;
    }
    highest = lo;
  }
  if (minCoverage > 0) lowest = Math.max(lowest, 2 * minCoverage);
  if (q.minChips !== undefined) lowest = Math.max(lowest, q.minChips);
  if (q.maxChips !== undefined) highest = Math.min(highest, q.maxChips);
  if (lowest > highest) return false;

  const x: number[] = new Array(m).fill(0);
  let level = 0;

  // Per index, the congruence of `range` below: xᵢ·Δ ≡ rhs (mod G) with Δ = d₊₁ − d and
  // G = gaps[i + 1] is solvable iff g = gcd(Δ, G) divides rhs; solutions step by M = G / g.
  const congruenceG = new Array<number>(m).fill(0);
  const congruenceM = new Array<number>(m).fill(1);
  const congruenceInverse = new Array<number>(m).fill(0);
  for (let i = 0; i + 1 < m; i++) {
    const G = gaps[i + 1];
    if (G === 0) continue;
    const delta = mod(values[i + 1] - values[i], G);
    const g = gcd(delta, G);
    congruenceG[i] = g;
    congruenceM[i] = G / g;
    congruenceInverse[i] = modInverse(delta / g, G / g);
  }

  // `range` and `counts` report their result here (callers copy it out before recursing).
  let spanHi = 0;
  let spanLo = 0;
  let spanStep = 1;
  const none = (): void => {
    spanHi = -1;
    spanLo = 0;
    spanStep = 1;
  };

  /**
   * Counts of denomination i to try, as `spanHi, spanHi − spanStep, …, ≥ spanLo`, given
   * remaining value v and count c; `spanHi < spanLo` when there are none.
   */
  const range = (i: number, v: number, c: number): void => {
    const d = values[i];
    const prefix = total - v;
    if (i === m - 1) {
      const ok = v === c * d && c <= caps[i] && (!prefixMax || prefixMax[i] >= total) && (!prefixMin || prefixMin[i] <= total);
      if (!ok) return none();
      spanHi = c;
      spanLo = c;
      spanStep = 1;
      return;
    }
    const next = values[i + 1];
    const top = values[m - 1];
    let hi = Math.min(caps[i], c, Math.floor(v / d), Math.floor((c * top - v) / (top - d)));
    let lo = Math.max(0, c - suffixCap[i + 1], Math.ceil((c * next - v) / (next - d)));
    if (prefixMax) hi = Math.min(hi, Math.floor((prefixMax[i] - prefix) / d));
    if (prefixMin) lo = Math.max(lo, Math.ceil((prefixMin[i] - prefix) / d));
    if (hi < lo) return none();
    if (gaps[i + 1] === 0) {
      // Only the last denomination remains: its count and ours are determined.
      const numerator = c * next - v;
      if (numerator % (next - d) !== 0) return none();
      const only = numerator / (next - d);
      if (only > hi || only < lo) return none();
      spanHi = only;
      spanLo = only;
      spanStep = 1;
      return;
    }
    // (v − xᵢd) − (c − xᵢ)·d₊₁ ≡ 0 (mod G)  ⇔  xᵢ·(d₊₁ − d) ≡ c·d₊₁ − v (mod G)
    const rhs = mod(c * next - v, gaps[i + 1]);
    const g = congruenceG[i];
    if (rhs % g !== 0) return none();
    const M = congruenceM[i];
    const x0 = M === 1 ? 0 : mod((rhs / g) * congruenceInverse[i], M);
    spanHi = hi - mod(hi - x0, M);
    spanLo = lo;
    spanStep = M;
  };

  /** Whether counts for denominations i.. exist with value v and count c (coverage ignored). */
  const completable = new Map<string, boolean>();
  const canComplete = (i: number, v: number, c: number): boolean => {
    if (i === m) return v === 0 && c === 0;
    const key = `${i},${v},${c}`;
    const known = completable.get(key);
    if (known !== undefined) return known;
    budget.spend();
    let ok = false;
    if (feasible(i, v, c)) {
      range(i, v, c);
      const hi = spanHi;
      const lo = spanLo;
      const step = spanStep;
      for (let xi = hi; xi >= lo && !ok; xi -= step) ok = canComplete(i + 1, v - xi * values[i], c - xi);
    }
    completable.set(key, ok);
    return ok;
  };

  const accepted = new Map<string, boolean>();
  const smallPartOk = (): boolean => {
    let key = '';
    for (let j = 0; j < smallEnd; j++) key += `${x[j]},`;
    const known = accepted.get(key);
    if (known !== undefined) return known;
    const ok =
      (minCoverage === 0 || oracle!.maxCoverage(x, minCoverage) >= minCoverage) &&
      (acceptSmallPart === undefined || acceptSmallPart(x));
    accepted.set(key, ok);
    return ok;
  };

  const NONE = 0;
  const FOUND = 1;
  const STOP = 2;

  // Below the coverage-relevant prefix only cheap bounds apply; from it on, exact completability.
  const boundary = checkSmall ? smallEnd : 0;
  const dfs = (i: number, v: number, c: number): number => {
    budget.spend();
    if (i >= boundary ? !canComplete(i, v, c) : !feasible(i, v, c)) return NONE;
    if (checkSmall && i === smallEnd && !smallPartOk()) return NONE;
    if (i === m) return visit(x, level) ? STOP : FOUND;
    range(i, v, c);
    const hi = spanHi;
    const lo = spanLo;
    const step = spanStep;
    let found = NONE;
    for (let xi = hi; xi >= lo; xi -= step) {
      x[i] = xi;
      const result = dfs(i + 1, v - xi * values[i], c - xi);
      if (result === STOP) {
        x[i] = 0;
        return STOP;
      }
      if (result === FOUND) found = FOUND;
    }
    x[i] = 0;
    return found;
  };

  if (q.preference === 'any') return anyOrder(q, smallEnd, checkSmall, smallPartOk, x, visit);

  const fewer = q.preference === 'fewer';
  for (let n = fewer ? lowest : highest; fewer ? n <= highest : n >= lowest; n += fewer ? 1 : -1) {
    level = n;
    if (dfs(0, total, n) === STOP) return true;
  }
  return false;
}

/**
 * Order-free walk for existence questions: no chip-count levels; counts are tried outward from
 * `aim` when given, otherwise from low to high. Same exact pruning, keyed on (index, remaining
 * value) only.
 */
function anyOrder(
  q: StackQuery,
  smallEnd: number,
  checkSmall: boolean,
  smallPartOk: () => boolean,
  x: number[],
  visit: (mix: readonly number[], chips: number) => boolean,
): boolean {
  const { values, caps, total, budget, prefixMin, prefixMax, aim } = q;
  const m = values.length;
  const suffixGcd: number[] = new Array(m + 1).fill(0);
  const suffixValue: number[] = new Array(m + 1).fill(0);
  for (let i = m - 1; i >= 0; i--) {
    suffixGcd[i] = gcd(suffixGcd[i + 1], values[i]);
    suffixValue[i] = suffixValue[i + 1] + caps[i] * values[i];
  }
  // Per index: xᵢ·d ≡ v (mod G), G = gcd of the remaining values, is solvable iff
  // g = gcd(d, G) divides v; solutions step by M = G / g.
  const congruenceG = new Array<number>(m).fill(1);
  const congruenceM = new Array<number>(m).fill(1);
  const congruenceInverse = new Array<number>(m).fill(0);
  for (let i = 0; i + 1 < m; i++) {
    const G = suffixGcd[i + 1];
    const g = gcd(values[i], G);
    congruenceG[i] = g;
    congruenceM[i] = G / g;
    congruenceInverse[i] = modInverse(values[i] / g, G / g);
  }
  // `counts` reports its result here (callers copy it out before recursing).
  let spanLo = 1;
  let spanHi = 0;
  let spanStep = 1;

  const completable = new Map<string, boolean>();
  const canComplete = (i: number, v: number): boolean => {
    if (i === m) return v === 0;
    if (v > suffixValue[i] || v % suffixGcd[i] !== 0) return false;
    const key = `${i},${v}`;
    const known = completable.get(key);
    if (known !== undefined) return known;
    budget.spend();
    let ok = false;
    counts(i, v);
    const lo = spanLo;
    const hi = spanHi;
    const step = spanStep;
    for (let xi = lo; xi <= hi && !ok; xi += step) ok = canComplete(i + 1, v - xi * values[i]);
    completable.set(key, ok);
    return ok;
  };
  /** Counts of denomination i to try: spanLo, spanLo + spanStep, …, ≤ spanHi. */
  const counts = (i: number, v: number): void => {
    const d = values[i];
    const prefix = total - v;
    let hi = Math.min(caps[i], Math.floor(v / d));
    let lo = Math.max(0, Math.ceil((v - suffixValue[i + 1]) / d));
    if (prefixMax) hi = Math.min(hi, Math.floor((prefixMax[i] - prefix) / d));
    if (prefixMin) lo = Math.max(lo, Math.ceil((prefixMin[i] - prefix) / d));
    spanLo = 1;
    spanHi = 0;
    spanStep = 1;
    if (i === m - 1) {
      if (v % d === 0 && v / d >= lo && v / d <= hi) spanLo = spanHi = v / d;
      return;
    }
    const g = congruenceG[i];
    if (v % g !== 0) return;
    const M = congruenceM[i];
    const x0 = M === 1 ? 0 : mod((v / g) * congruenceInverse[i], M);
    spanLo = lo + mod(x0 - lo, M);
    spanHi = hi;
    spanStep = M;
  };
  let chips = 0;
  const boundary = checkSmall ? smallEnd : 0;
  const dfs = (i: number, v: number): boolean => {
    budget.spend();
    if (i >= boundary ? !canComplete(i, v) : v > suffixValue[i] || v % suffixGcd[i] !== 0) return false;
    if (checkSmall && i === smallEnd && !smallPartOk()) return false;
    if (i === m) return visit(x, chips);
    counts(i, v);
    const lo = spanLo;
    const hi = spanHi;
    const step = spanStep;
    if (lo > hi) return false;
    // Start at the allowed count nearest the aim, then alternate outward (lower side first).
    const n = Math.floor((hi - lo) / step) + 1;
    let first = 0;
    if (aim) first = Math.min(n - 1, Math.max(0, Math.round((aim[i] - lo) / step)));
    let below = first - 1;
    let above = first + 1;
    for (let tried = 0; tried < n; tried++) {
      let index: number;
      if (tried === 0) index = first;
      else if (below >= 0 && (above >= n || first - below <= above - first)) index = below--;
      else index = above++;
      const xi = lo + index * step;
      x[i] = xi;
      chips += xi;
      const stop = dfs(i + 1, v - xi * values[i]);
      chips -= xi;
      if (stop) {
        x[i] = 0;
        return true;
      }
    }
    x[i] = 0;
    return false;
  };
  return dfs(0, total);
}
