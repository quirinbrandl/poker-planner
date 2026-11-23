import { gcd, mod, modInverse } from './arith';

/** One exact reduction step, see `ResidueReduction`. */
interface Step {
  /** Slot whose chips are used up by this step. */
  slot: number;
  /** Chips of the slot every group of each type must take. */
  forced: number[];
  /** Leftover chips of the slot are bundled `bundle` at a time into one chip of slot `into`. */
  bundle: number;
  into: number;
}

/**
 * Exact simplification of "can disjoint groups with these exact amounts be taken from an
 * inventory?" that removes residue constraints.
 *
 * Let d be a denomination and G the gcd of all the others. In every group of amount a, the count
 * x of d-chips satisfies x·d ≡ a (mod G), so x = x₀ + t·M with x₀ the least solution and
 * M = G / gcd(d, G). Each group must therefore take x₀ chips, and every further use comes in
 * bundles of M chips worth M·d, a multiple of G. So the leftover d-chips are equivalent to
 * ⌊leftover / M⌋ chips of value M·d, and d leaves the problem. This repeats (smallest such d
 * first) while some denomination is not a multiple of the others' gcd; each step strictly
 * increases the gcd of all denominations, so it ends. The steps depend only on the
 * denominations and amounts, so they are planned once; `reduce` then applies them to any
 * inventory in O(denominations). A feasible packing maps to a feasible reduced packing and back.
 */
export class ResidueReduction {
  private readonly steps: Step[] = [];
  private readonly slotCount: number;
  private readonly coreSlots: number[];
  private readonly coreValues: number[];
  private readonly coreAmounts: number[];
  /** Group types that cannot be formed at all (a residue has no solution). */
  private readonly impossible: boolean[];
  private readonly inputs: number;
  /** The denominations this plan assumes chips of (others must be absent). */
  readonly presentMask: readonly boolean[];

  /**
   * Plans the reduction for inventories that hold chips exactly of the denominations marked in
   * `present` (absent ones take no part, which can enable further steps).
   */
  constructor(values: readonly number[], amounts: readonly number[], present: readonly boolean[]) {
    this.inputs = values.length;
    this.presentMask = present.slice();
    const slotValues = values.slice();
    let active = slotValues.map((_, i) => i).filter((i) => present[i]);
    const left = amounts.slice();
    const impossible = amounts.map(() => false);
    const least = (d: number, amount: number, G: number): number | null => {
      // Least x ≥ 0 with x·d ≡ amount (mod G) and x·d ≤ amount.
      const g = gcd(d, G);
      if (amount % g !== 0) return null;
      const M = G / g;
      const x = M === 1 ? 0 : mod((amount / g) * modInverse(d / g, M), M);
      return x * d <= amount ? x : null;
    };
    const othersGcd = (slot: number): number => {
      let G = 0;
      for (const other of active) if (other !== slot) G = gcd(G, slotValues[other]);
      return G;
    };
    while (active.length > 1) {
      const slot = active.find((s) => slotValues[s] % othersGcd(s) !== 0);
      if (slot === undefined) break;
      const d = slotValues[slot];
      const G = othersGcd(slot);
      const forced = left.map((amount, t) => {
        if (impossible[t]) return 0;
        const x = least(d, amount, G);
        if (x === null) {
          impossible[t] = true;
          left[t] = 0;
          return 0;
        }
        left[t] = amount - x * d;
        return x;
      });
      const bundle = G / gcd(d, G);
      const bundled = bundle * d;
      let into = active.find((s) => slotValues[s] === bundled);
      if (into === undefined) {
        into = slotValues.length;
        slotValues.push(bundled);
      }
      this.steps.push({ slot, forced, bundle, into });
      active = active.filter((s) => s !== slot);
      if (!active.includes(into)) active.push(into);
      active.sort((a, b) => slotValues[a] - slotValues[b]);
    }
    this.slotCount = slotValues.length;
    this.coreSlots = active;
    this.coreValues = active.map((s) => slotValues[s]);
    this.coreAmounts = left;
    this.impossible = impossible;
  }

  /** Denominations of every reduced packing (ascending). */
  get values(): readonly number[] {
    return this.coreValues;
  }

  /** Group amounts left after the forced chips (0 when a group is complete). */
  get amounts(): readonly number[] {
    return this.coreAmounts;
  }

  /**
   * The reduced inventory for `groups[t]` groups of each amount, or null when the forced chips
   * already exceed the inventory (or a needed group type cannot be formed at all).
   */
  reduce(inventory: readonly number[], groups: readonly number[]): number[] | null {
    for (let t = 0; t < groups.length; t++) if (groups[t] > 0 && this.impossible[t]) return null;
    const counts = new Array<number>(this.slotCount).fill(0);
    for (let i = 0; i < this.inputs; i++) counts[i] = inventory[i];
    for (const step of this.steps) {
      let leftover = counts[step.slot];
      for (let t = 0; t < groups.length; t++) leftover -= groups[t] * step.forced[t];
      if (leftover < 0) return null;
      counts[step.into] += Math.floor(leftover / step.bundle);
    }
    return this.coreSlots.map((s) => counts[s]);
  }

  /** Key of the denominations an inventory holds chips of (see `forInventory`). */
  static presence(inventory: readonly number[]): string {
    let key = '';
    for (const count of inventory) key += count > 0 ? '1' : '0';
    return key;
  }

  /** Number of planned steps (the cost of one `reduce`). */
  get size(): number {
    return this.steps.length + 1;
  }
}

/** Reductions for one packing question, planned once per set of present denominations. */
export class ReductionFamily<T> {
  private readonly plans = new Map<string, { reduction: ResidueReduction; extra: T }>();

  /** `extra` builds per-plan companion data (memo tables and the like). */
  constructor(
    private readonly values: readonly number[],
    private readonly amounts: readonly number[],
    private readonly extra: (reduction: ResidueReduction) => T,
  ) {}

  /** The plan for the denominations `inventory` holds chips of. */
  forInventory(inventory: readonly number[]): { reduction: ResidueReduction; extra: T } {
    const key = ResidueReduction.presence(inventory);
    let plan = this.plans.get(key);
    if (!plan) {
      const reduction = new ResidueReduction(
        this.values,
        this.amounts,
        inventory.map((count) => count > 0),
      );
      plan = { reduction, extra: this.extra(reduction) };
      this.plans.set(key, plan);
    }
    return plan;
  }
}
