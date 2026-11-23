import type { Budget } from './budget';
import { prefixValueCeilings, prefixValueFloors, totalValue } from './arith';
import type { CoverageOracle } from './coverage';
import { CertificateCache, provablyUnpackable } from './lp';
import { ReductionFamily } from './reduction';
import { visitStacks } from './stacks';

/** Steps a decision may take as a plain search before the LP certificate is consulted. */
const QUICK_SEARCH_STEPS = 3_000;

/**
 * Exact answers to "can this inventory supply j qualifying stacks (value `total`, coverage ≥
 * `coverage`) at the same time, each stack with its own mix and no chip used twice?".
 *
 * `canForm(inventory, j)` decides it in three stages, each exact:
 * 1. a short depth-first search, which settles most questions either way;
 * 2. the LP certificate of `provablyUnpackable` (j stacks are exactly j·k big-blind payments,
 *    j·k small-blind payments and j fillers worth T − k·(SB + BB), all disjoint), applied after
 *    the exact `ResidueReduction` of that packing, which proves most "no" answers that need it;
 * 3. the same depth-first search to completion.
 *
 * The search takes one stack at a time. Stacks are interchangeable, so proven answers are
 * memoized per remaining inventory. Every candidate stack must leave the per-prefix value the
 * remaining stacks need (`prefixValueFloors`), and its counts are tried outward from the same
 * fraction of every denomination (the fraction whose value is T), which finds balanced packings
 * early. Upper bounds from value and from blind-paying chips cut hopeless states. Verified LP
 * certificates are kept and re-checked first on later inventories (`CertificateCache`); every
 * inventory asked about must lie within `universe`.
 */
export class CapacitySolver {
  /** Per inventory key: the most stacks proven formable, and the fewest proven not formable. */
  private readonly proven = new Map<string, { yes: number; no: number }>();
  private readonly pair: number;
  /** Value of a stack beyond its k + k blind payments; negative when no stack can qualify. */
  private readonly filler: number;
  /** Per-prefix minimum value of one qualifying stack (`prefixValueFloors`). */
  readonly floors: number[];
  /** Per set of present denominations: the residue reduction and its certificate cache. */
  private readonly reductions: ReductionFamily<CertificateCache>;

  constructor(
    private readonly values: readonly number[],
    universe: readonly number[],
    private readonly total: number,
    private readonly oracle: CoverageOracle,
    private readonly coverage: number,
    private readonly budget: Budget,
  ) {
    this.pair = oracle.small + oracle.big;
    this.floors = prefixValueFloors(values, total, oracle.small, oracle.big, coverage);
    this.filler = total - coverage * this.pair;
    const amounts = [Math.max(0, this.filler), oracle.big, oracle.small];
    // Reduced inventories only shrink with the inventory and with the groups asked for, so the
    // reduced universe (restricted to the same denominations) without groups contains them all.
    this.reductions = new ReductionFamily(values, amounts, (reduction) => {
      const present = reduction.presentMask;
      const within = universe.map((count, i) => (present[i] ? count : 0));
      return new CertificateCache(reduction.values, reduction.reduce(within, [0, 0, 0])!, reduction.amounts, budget);
    });
  }

  /** Largest s ≤ cap such that s qualifying stacks fit `inventory` at the same time. */
  maxStacks(inventory: readonly number[], cap: number): number {
    // Feasibility is monotone in s. Try the bound itself first (the common outcome), then
    // binary search.
    let lo = 0;
    let hi = Math.min(cap, this.upperBound(inventory));
    let first = true;
    while (lo < hi) {
      const mid = first ? hi : Math.ceil((lo + hi) / 2);
      first = false;
      if (this.canForm(inventory, mid)) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  /** Whether `stacks` qualifying stacks fit `inventory` at the same time. */
  canForm(inventory: readonly number[], stacks: number): boolean {
    if (stacks <= 0) return true;
    if (this.filler < 0 || stacks > this.upperBound(inventory)) return false;
    const quick = this.budget.within(QUICK_SEARCH_STEPS, () => this.reach(inventory, stacks));
    if (quick !== undefined) return quick;
    if (this.provablyFewerThan(inventory, stacks)) return false;
    return this.reach(inventory, stacks);
  }

  /** Whether an exact certificate shows that `stacks` qualifying stacks do not fit. */
  provablyFewerThan(inventory: readonly number[], stacks: number): boolean {
    if (this.filler < 0) return true;
    const payments = stacks * this.coverage;
    const { reduction, extra: certificates } = this.reductions.forInventory(inventory);
    this.budget.spend(reduction.size);
    const reduced = reduction.reduce(inventory, [stacks, payments, payments]);
    if (reduced === null) return true;
    const counts = reduction.amounts.map((amount, t) => (amount > 0 ? [stacks, payments, payments][t] : 0));
    if (certificates.proves(reduced, counts)) return true;
    return provablyUnpackable(reduction.values, reduced, reduction.amounts, counts, this.budget, (weights) =>
      certificates.add(weights),
    );
  }

  private upperBound(inventory: readonly number[]): number {
    const { values, oracle, coverage: k } = this;
    let value = 0;
    let prefixBound = Infinity;
    let valueLeBig = 0;
    let countLeBig = 0;
    let valueLeSmall = 0;
    let countLeSmall = 0;
    for (let i = 0; i < values.length; i++) {
      const v = inventory[i] * values[i];
      value += v;
      if (this.floors[i] > 0) prefixBound = Math.min(prefixBound, Math.floor(value / this.floors[i]));
      if (values[i] <= oracle.big) {
        valueLeBig += v;
        countLeBig += inventory[i];
      }
      if (values[i] <= oracle.small) {
        valueLeSmall += v;
        countLeSmall += inventory[i];
      }
    }
    return Math.min(
      prefixBound,
      Math.floor(valueLeBig / (k * this.pair)),
      Math.floor(valueLeSmall / (k * oracle.small)),
      Math.floor(countLeBig / (2 * k)),
      Math.floor(countLeSmall / k),
    );
  }

  /** Exhaustive decision: can `want` stacks be taken from `inventory`? */
  private reach(inventory: readonly number[], want: number): boolean {
    if (want <= 0) return true;
    this.budget.spend();
    if (want > this.upperBound(inventory)) return false;
    const key = inventory.join(',');
    const known = this.proven.get(key) ?? { yes: 0, no: Infinity };
    if (want <= known.yes) return true;
    if (want >= known.no) return false;
    let reached = false;
    visitStacks(
      {
        values: this.values,
        caps: inventory,
        total: this.total,
        preference: 'any',
        aim: inventory.map((count) => (count * this.total) / totalValue(this.values, inventory)),
        oracle: this.oracle,
        minCoverage: this.coverage,
        prefixMin: this.floors,
        prefixMax: prefixValueCeilings(this.values, inventory, 1, want - 1, this.floors),
        budget: this.budget,
      },
      (stack) => {
        reached = this.reach(
          inventory.map((count, i) => count - stack[i]),
          want - 1,
        );
        return reached;
      },
    );
    if (reached) known.yes = Math.max(known.yes, want);
    else known.no = Math.min(known.no, want);
    this.proven.set(key, known);
    return reached;
  }
}
