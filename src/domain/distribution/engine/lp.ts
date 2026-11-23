import type { Budget } from './budget';
import { gcd } from './arith';

/** Knapsack table cells charged as one search step (a cell costs far less than a search node). */
const CELLS_PER_STEP = 32;

/**
 * Proves, when it can, that an inventory cannot supply disjoint groups of chips with exact
 * amounts: `counts[t]` groups worth `amounts[t]` each.
 *
 * Every set of j qualifying stacks is exactly j·k big-blind payments, j·k small-blind payments
 * and j fillers worth T − k·(SB + BB), all disjoint, so reserve questions reduce to this.
 *
 * Method: the linear-programming relaxation over group compositions (cutting-stock style),
 * solved with a small floating-point simplex and column generation. Floating point is used only
 * to *find* weights wᵢ ≥ 0 per denomination; the conclusion rests on an exact integer check of
 * the resulting certificate: if every composition of amount t (within the inventory) weighs at
 * least αₜ, and Σₜ countsₜ·αₜ > Σᵢ wᵢ·inventoryᵢ, the groups cannot all exist. Returns true only
 * when such a certificate is verified; false means "not proven" (the groups may or may not fit).
 * A verified certificate's integer weights (one per denomination) are passed to `found`, so a
 * caller can re-check them cheaply against other inventories (see `CertificateCache`).
 */
export function provablyUnpackable(
  values: readonly number[],
  inventory: readonly number[],
  amounts: readonly number[],
  counts: readonly number[],
  budget: Budget,
  found?: (weights: number[]) => void,
): boolean {
  const types: number[] = [];
  for (let t = 0; t < amounts.length; t++) if (counts[t] > 0) types.push(t);
  if (types.length === 0) return false;
  const maxAmount = Math.max(...types.map((t) => amounts[t]));
  // Denominations that can appear in some group.
  const rowsD: number[] = [];
  for (let i = 0; i < values.length; i++) if (inventory[i] > 0 && values[i] <= maxAmount) rowsD.push(i);
  let g = 0;
  for (const i of rowsD) g = gcd(g, values[i]);
  for (const t of types) if (g === 0 || amounts[t] % g !== 0) return true; // no composition at all
  const scale = g;
  const dVals = rowsD.map((i) => values[i] / scale);
  const dCaps = rowsD.map((i) => inventory[i]);
  const tAmts = types.map((t) => amounts[t] / scale);
  const tNeed = types.map((t) => counts[t]);
  const nd = rowsD.length;
  const rows = nd + types.length;

  // Exact integer check of a weight vector (also used for the all-value weights first).
  const verify = (weights: number[]): boolean => {
    let available = 0;
    for (let i = 0; i < nd; i++) available += weights[i] * dCaps[i];
    let needed = 0;
    for (let t = 0; t < tAmts.length; t++) {
      budget.spend(Math.ceil((tAmts[t] * splitItems(dCaps, dVals, tAmts[t])) / CELLS_PER_STEP));
      const least = boundedKnapsack(dVals, dCaps, weights, tAmts[t], 'min').best;
      if (least === null) return true;
      needed += tNeed[t] * least;
      if (needed > available) return true;
    }
    return false;
  };
  if (verify(dVals.map(() => 0))) return true; // some amount has no composition

  // Phase-1 simplex: rows are denominations (Σ pᵢ·y ≤ capᵢ, slack) and types (Σ y = need,
  // artificial). Columns are generated compositions. Minimize the artificials.
  const binv: number[][] = Array.from({ length: rows }, (_, r) => Array.from({ length: rows }, (_, c) => (r === c ? 1 : 0)));
  const xB: number[] = [...dCaps, ...tNeed];
  // Basis entries: -1-r = slack/artificial of row r, otherwise an index into `columns`.
  const basis: number[] = Array.from({ length: rows }, (_, r) => -1 - r);
  const columns: number[][] = [];
  const cost = (b: number) => (b < 0 && -1 - b >= nd ? 1 : 0);
  const eps = 1e-9;

  for (let iteration = 0; iteration < 300; iteration++) {
    budget.spend(rows * rows);
    const pi = new Array<number>(rows).fill(0);
    for (let r = 0; r < rows; r++) {
      const c = cost(basis[r]);
      if (c !== 0) for (let k = 0; k < rows; k++) pi[k] += c * binv[r][k];
    }
    let objective = 0;
    for (let r = 0; r < rows; r++) objective += cost(basis[r]) * xB[r];
    if (objective <= 1e-7) return false; // relaxation feasible: nothing to prove

    // Pricing: a slack column enters if πᵢ > 0; a composition of type t if Σ πᵢpᵢ + π_t > 0.
    let bestGain = eps;
    let entering: number[] | null = null;
    for (let i = 0; i < nd; i++) {
      if (pi[i] > bestGain && !basis.includes(-1 - i)) {
        bestGain = pi[i];
        entering = unit(rows, i);
      }
    }
    for (let t = 0; t < tAmts.length; t++) {
      budget.spend(Math.ceil((tAmts[t] * splitItems(dCaps, dVals, tAmts[t])) / CELLS_PER_STEP));
      const { best, counts: pattern } = boundedKnapsack(dVals, dCaps, pi.slice(0, nd), tAmts[t], 'max');
      if (best === null || pattern === null) continue;
      const gain = best + pi[nd + t];
      if (gain > bestGain + 1e-9) {
        bestGain = gain;
        const column = new Array<number>(rows).fill(0);
        for (let i = 0; i < nd; i++) column[i] = pattern[i];
        column[nd + t] = 1;
        entering = column;
      }
    }

    if (!entering) {
      // Optimal with positive infeasibility: the duals give the weights wᵢ = −πᵢ ≥ 0.
      const w = pi.slice(0, nd).map((p) => Math.max(0, -p));
      const top = Math.max(...w);
      if (!(top > 0)) return false;
      for (const s of [1, 2, 3, 4, 6, 10, 12, 100, 1e3, 1e4, 1e5, 1e6]) {
        const weights = w.map((x) => Math.round((x / top) * s));
        if (verify(weights)) {
          if (found) {
            const full = new Array<number>(values.length).fill(0);
            rowsD.forEach((i, r) => (full[i] = weights[r]));
            found(full);
          }
          return true;
        }
      }
      return false;
    }

    // Ratio test.
    const u = new Array<number>(rows).fill(0);
    for (let r = 0; r < rows; r++) for (let k = 0; k < rows; k++) u[r] += binv[r][k] * entering[k];
    let leave = -1;
    let ratio = Infinity;
    for (let r = 0; r < rows; r++) {
      if (u[r] > eps) {
        const q = xB[r] / u[r];
        if (q < ratio - 1e-12 || (Math.abs(q - ratio) <= 1e-12 && basis[r] < basis[leave])) {
          ratio = q;
          leave = r;
        }
      }
    }
    if (leave < 0) return false; // unbounded cannot happen in phase 1; give up safely
    columns.push(entering);
    basis[leave] = columns.length - 1;
    const pivot = u[leave];
    for (let k = 0; k < rows; k++) binv[leave][k] /= pivot;
    xB[leave] /= pivot;
    for (let r = 0; r < rows; r++) {
      if (r === leave || u[r] === 0) continue;
      const f = u[r];
      for (let k = 0; k < rows; k++) binv[r][k] -= f * binv[leave][k];
      xB[r] -= f * xB[leave];
      if (xB[r] < 0 && xB[r] > -1e-9) xB[r] = 0;
    }
  }
  return false;
}

/** Number of items the binary splitting of `boundedKnapsack` creates (its work per amount unit). */
function splitItems(caps: readonly number[], values: readonly number[], amount: number): number {
  let items = 0;
  for (let i = 0; i < caps.length; i++) {
    const most = Math.min(caps[i], Math.floor(amount / values[i]));
    if (most > 0) items += Math.floor(Math.log2(most)) + 1;
  }
  return Math.max(items, 1);
}

/**
 * Verified LP certificates kept for re-use. Each entry holds integer weights wᵢ and, per group
 * type, the least weight αₜ of a composition of that amount within `universe` (an inventory every
 * later inventory is contained in). Since a smaller inventory only removes compositions, αₜ stays
 * a valid lower bound, and Σₜ countsₜ·αₜ > Σᵢ wᵢ·inventoryᵢ still proves infeasibility: an exact
 * check in O(denominations) per entry.
 */
export class CertificateCache {
  private readonly entries: { weights: number[]; least: (number | null)[] }[] = [];

  constructor(
    private readonly values: readonly number[],
    private readonly universe: readonly number[],
    private readonly amounts: readonly number[],
    private readonly budget: Budget,
  ) {}

  /** Stores a certificate found by `provablyUnpackable` for these amounts. */
  add(weights: number[]): void {
    if (this.entries.length >= 16) return;
    const least = this.amounts.map((amount) => {
      if (amount <= 0) return 0;
      const usable = this.values.map((v) => (v <= amount ? 1 : 0));
      this.budget.spend(Math.ceil((amount * splitItems(this.universe.map((c, i) => c * usable[i]), this.values, amount)) / CELLS_PER_STEP));
      return boundedKnapsack(this.values, this.universe, weights, amount, 'min').best;
    });
    this.entries.push({ weights, least });
  }

  /** Whether a stored certificate proves that the groups (`counts` per amount) do not fit. */
  proves(inventory: readonly number[], counts: readonly number[]): boolean {
    for (const { weights, least } of this.entries) {
      this.budget.spend();
      let available = 0;
      for (let i = 0; i < weights.length; i++) available += weights[i] * inventory[i];
      let needed = 0;
      let impossible = false;
      for (let t = 0; t < counts.length; t++) {
        if (counts[t] <= 0) continue;
        if (least[t] === null) impossible = true;
        else needed += counts[t] * least[t]!;
      }
      if (impossible || needed > available) return true;
    }
    return false;
  }
}

function unit(n: number, i: number): number[] {
  const v = new Array<number>(n).fill(0);
  v[i] = 1;
  return v;
}

/**
 * Best total weight of a composition of exactly `amount` with 0 ≤ countᵢ ≤ capsᵢ (binary
 * splitting of bounded counts). 'min' with integer weights is exact. Returns null if `amount`
 * has no composition; `counts` reconstructs an optimal composition.
 */
function boundedKnapsack(
  values: readonly number[],
  caps: readonly number[],
  weights: readonly number[],
  amount: number,
  sense: 'min' | 'max',
): { best: number | null; counts: number[] | null } {
  const items: { i: number; n: number }[] = [];
  for (let i = 0; i < values.length; i++) {
    let left = Math.min(caps[i], Math.floor(amount / values[i]));
    for (let n = 1; left > 0; n *= 2) {
      const take = Math.min(n, left);
      items.push({ i, n: take });
      left -= take;
    }
  }
  const worst = sense === 'min' ? Infinity : -Infinity;
  const better = sense === 'min' ? (a: number, b: number) => a < b : (a: number, b: number) => a > b;
  const best = new Float64Array(amount + 1).fill(worst);
  best[0] = 0;
  const took: Uint8Array[] = [];
  for (const { i, n } of items) {
    const size = values[i] * n;
    const gain = weights[i] * n;
    const mark = new Uint8Array(amount + 1);
    for (let a = amount; a >= size; a--) {
      const from = best[a - size];
      if (from === worst) continue;
      const candidate = from + gain;
      if (best[a] === worst || better(candidate, best[a])) {
        best[a] = candidate;
        mark[a] = 1;
      }
    }
    took.push(mark);
  }
  if (best[amount] === worst) return { best: null, counts: null };
  const counts = new Array<number>(values.length).fill(0);
  let a = amount;
  for (let it = items.length - 1; it >= 0 && a > 0; it--) {
    if (took[it][a]) {
      counts[items[it].i] += items[it].n;
      a -= values[items[it].i] * items[it].n;
    }
  }
  return { best: best[amount], counts };
}
