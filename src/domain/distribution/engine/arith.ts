import type { ChipMix } from '../../types';

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const r = a % b;
    a = b;
    b = r;
  }
  return a;
}

/** Nonnegative remainder. */
export function mod(a: number, m: number): number {
  const r = a % m;
  return r < 0 ? r + m : r;
}

/** Inverse of `a` modulo `m` for coprime a, m (m ≥ 1). */
export function modInverse(a: number, m: number): number {
  if (m === 1) return 0;
  // Extended Euclid. (No array destructuring: hot path, and transpiled destructuring is slow.)
  let oldR = mod(a, m);
  let r = m;
  let oldS = 1;
  let s = 0;
  while (r !== 0) {
    const q = Math.floor(oldR / r);
    const nextR = oldR - q * r;
    oldR = r;
    r = nextR;
    const nextS = oldS - q * s;
    oldS = s;
    s = nextS;
  }
  return mod(oldS, m);
}

/** A validated inventory or mix split into parallel arrays. */
export interface Chips {
  values: number[];
  counts: number[];
}

/** Validates the module's input contract for a mix/inventory and splits it. Throws RangeError. */
export function readChips(mix: ChipMix, what: string): Chips {
  if (!Array.isArray(mix) || mix.length === 0) throw new RangeError(`${what} must list at least one denomination`);
  const values: number[] = [];
  const counts: number[] = [];
  for (const entry of mix) {
    if (!Number.isSafeInteger(entry.value) || entry.value <= 0) {
      throw new RangeError(`${what}: denomination values must be positive whole numbers`);
    }
    if (!Number.isSafeInteger(entry.count) || entry.count < 0) {
      throw new RangeError(`${what}: counts must be nonnegative whole numbers`);
    }
    if (values.length > 0 && entry.value <= values[values.length - 1]) {
      throw new RangeError(`${what}: denominations must be strictly ascending`);
    }
    values.push(entry.value);
    counts.push(entry.count);
  }
  return { values, counts };
}

export function requireWhole(value: number, min: number, what: string): void {
  if (!Number.isSafeInteger(value) || value < min) throw new RangeError(`${what} must be a whole number ≥ ${min}`);
}

export function toMix(values: readonly number[], counts: readonly number[]): ChipMix {
  return values.map((value, i) => ({ value, count: counts[i] }));
}

export function totalValue(values: readonly number[], counts: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i] * counts[i];
  return sum;
}

export function totalCount(counts: readonly number[]): number {
  let sum = 0;
  for (const c of counts) sum += c;
  return sum;
}

/**
 * Which amounts are sums of the given denominations with unlimited repetition. After dividing by
 * the gcd, `least[r]` is the smallest representable amount congruent to r modulo the smallest
 * denomination a; an amount v is representable exactly when v ≥ least[v mod a]. Building the
 * table costs O(a · denominations) steps, charged to the caller's budget.
 */
export class Representability {
  private readonly g: number;
  private readonly a: number;
  private readonly least: Float64Array;

  constructor(denominations: readonly number[], spend: (steps: number) => void) {
    let g = 0;
    for (const d of denominations) g = gcd(g, d);
    this.g = g;
    if (denominations.length === 0) {
      this.a = 1;
      this.least = new Float64Array(1);
      return;
    }
    const scaled = denominations.map((d) => d / g);
    const a = scaled[0];
    spend(a * scaled.length);
    this.a = a;
    const least = new Float64Array(a).fill(Infinity);
    least[0] = 0;
    // Round-robin relaxation (Böcker & Lipták): for each denomination, walk every residue cycle
    // twice so that each class is relaxed from its best predecessor.
    for (let j = 1; j < scaled.length; j++) {
      const d = scaled[j];
      const step = d % a;
      if (step === 0) continue;
      const cycles = gcd(step, a);
      for (let start = 0; start < cycles; start++) {
        // Find the minimum in this cycle to start from.
        let best = start;
        for (let r = (start + step) % a; r !== start; r = (r + step) % a) if (least[r] < least[best]) best = r;
        if (least[best] === Infinity) continue;
        let r = best;
        for (let n = 0; n < a / cycles; n++) {
          const next = (r + step) % a;
          const candidate = least[r] + d;
          if (candidate < least[next]) least[next] = candidate;
          r = next;
        }
      }
    }
    this.least = least;
  }

  /** Whether `amount` (≥ 0) is a sum of denominations. */
  has(amount: number): boolean {
    if (this.g === 0) return amount === 0;
    if (amount % this.g !== 0) return false;
    const s = amount / this.g;
    return s >= this.least[s % this.a];
  }

  /** Largest representable amount ≤ `amount`, or 0 when none is positive. O(smallest denomination). */
  largestAtMost(amount: number): number {
    if (this.g === 0 || amount < this.g) return 0;
    const s = Math.floor(amount / this.g);
    const a = this.a;
    let best = 0;
    for (let r = 0; r < a; r++) {
      const least = this.least[r];
      if (least > s) continue;
      const candidate = s - mod(s - r, a);
      if (candidate >= least && candidate > best) best = candidate;
    }
    return best * this.g;
  }
}

/**
 * Lower bounds on how much value of a qualifying stack must come from its smallest
 * denominations. Entry i bounds the value from denominations 0..i: chips above i are all
 * multiples of g = gcd(values i+1..), so that portion is congruent to `total` modulo g. Each
 * blind payment's portion from 0..i is likewise congruent to its amount modulo g (and is the
 * whole amount if no larger chip can be part of it), so the portion is at least k times those
 * residues. The last entry is `total` itself.
 */
export function prefixValueFloors(values: readonly number[], total: number, small: number, big: number, k: number): number[] {
  const m = values.length;
  const floors = new Array<number>(m);
  let g = 0;
  for (let i = m - 1; i >= 0; i--) {
    if (i === m - 1) {
      floors[i] = total;
    } else {
      const next = values[i + 1];
      const smallPart = next > small ? small : small % g;
      const bigPart = next > big ? big : big % g;
      const forced = k * (smallPart + bigPart);
      // Smallest amount ≥ forced congruent to total (mod g), capped at total.
      floors[i] = Math.min(total, forced + mod(total - forced, g));
    }
    g = gcd(g, values[i]);
  }
  return floors;
}

/**
 * Upper bounds on each prefix value of a mix taken `copies` times from `inventory` such that the
 * leftover can still hold `reserve` stacks with the given prefix floors.
 */
export function prefixValueCeilings(
  values: readonly number[],
  inventory: readonly number[],
  copies: number,
  reserve: number,
  floors: readonly number[],
): number[] {
  const ceilings = new Array<number>(values.length);
  let available = 0;
  for (let i = 0; i < values.length; i++) {
    available += values[i] * inventory[i];
    ceilings[i] = Math.floor((available - reserve * floors[i]) / copies);
  }
  return ceilings;
}
