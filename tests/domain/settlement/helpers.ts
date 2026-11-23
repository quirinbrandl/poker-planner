import type { PaymentInstruction, PlayerBalance } from '@/domain/settlement';

/** Deterministic PRNG (mulberry32) so generated cases are reproducible. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomInt = (random: () => number, min: number, max: number) =>
  min + Math.floor(random() * (max - min + 1));

/** `n` nonzero whole-cent balances summing to zero, amounts within ±maxAbs (last one may be larger). */
export function randomNonzeroBalances(random: () => number, n: number, maxAbs: number): number[] {
  for (;;) {
    const values: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      let v = 0;
      while (v === 0) v = randomInt(random, -maxAbs, maxAbs);
      values.push(v);
    }
    const last = -values.reduce((a, b) => a + b, 0);
    if (last !== 0) return [...values, last];
  }
}

/** Balances with ids p0, p1 … in joining order. */
export function withIds(values: readonly number[], prefix = 'p'): PlayerBalance[] {
  return values.map((balance, i) => ({ id: `${prefix}${i}`, balance }));
}

/**
 * Asserts every Payments invariant from Decision 15: positive whole cents, owing → receiving only,
 * no self-payment, zero-balance players absent, exact per-player net. Sum of balances is zero by input.
 */
export function expectValidPlan(balances: readonly PlayerBalance[], plan: readonly PaymentInstruction[]): void {
  const byId = new Map(balances.map((b) => [b.id, b.balance]));
  const net = new Map<string, number>();
  for (const { fromId, toId, amount } of plan) {
    expect(Number.isSafeInteger(amount) && amount > 0).toBe(true);
    expect(fromId).not.toBe(toId);
    expect(byId.get(fromId)!).toBeLessThan(0);
    expect(byId.get(toId)!).toBeGreaterThan(0);
    net.set(fromId, (net.get(fromId) ?? 0) - amount);
    net.set(toId, (net.get(toId) ?? 0) + amount);
  }
  for (const { id, balance } of balances) expect(net.get(id) ?? 0).toBe(balance);
}

/**
 * Independent oracle for the minimum number of payments, sharing nothing with the solver's method.
 * It tries edge sets of growing size k between debtors and creditors. Any feasible plan containing a
 * cycle can drop an edge by shifting flow around the cycle, so a minimum plan is a forest; on a
 * forest the amounts are forced, found by repeatedly settling a leaf. The first k with a forest whose
 * forced amounts are all positive is the minimum.
 */
export function bruteForceMinimumPayments(values: readonly number[]): number {
  const debtors = values.map((v, i) => [v, i] as const).filter(([v]) => v < 0).map(([, i]) => i);
  const creditors = values.map((v, i) => [v, i] as const).filter(([v]) => v > 0).map(([, i]) => i);
  const edges: [number, number][] = [];
  for (const d of debtors) for (const c of creditors) edges.push([d, c]);
  if (edges.length === 0) return 0;
  const maxK = debtors.length + creditors.length - 1;
  for (let k = 1; k <= maxK; k++) {
    if (someSubset(edges, k, (chosen) => forcedFlowIsPositive(values, chosen))) return k;
  }
  throw new Error('oracle: no plan found');
}

function someSubset<T>(items: readonly T[], k: number, test: (chosen: T[]) => boolean): boolean {
  const chosen: T[] = [];
  const walk = (start: number): boolean => {
    if (chosen.length === k) return test(chosen);
    for (let i = start; i <= items.length - (k - chosen.length); i++) {
      chosen.push(items[i]);
      if (walk(i + 1)) return true;
      chosen.pop();
    }
    return false;
  };
  return walk(0);
}

function forcedFlowIsPositive(values: readonly number[], edges: readonly [number, number][]): boolean {
  const remaining = values.slice();
  const live = edges.map(() => true);
  // Every nonzero player must be touched.
  const touched = new Set(edges.flat());
  if (values.some((v, i) => v !== 0 && !touched.has(i))) return false;
  for (let settled = 0; settled < edges.length; settled++) {
    const degree = new Map<number, number[]>();
    edges.forEach(([a, b], e) => {
      if (!live[e]) return;
      degree.set(a, [...(degree.get(a) ?? []), e]);
      degree.set(b, [...(degree.get(b) ?? []), e]);
    });
    const leaf = [...degree.entries()].find(([, list]) => list.length === 1);
    if (!leaf) return false; // a cycle: not a forest
    const [node, [e]] = leaf;
    const [from, to] = edges[e];
    const amount = node === from ? -remaining[from] : remaining[to];
    if (amount <= 0) return false;
    remaining[from] += amount;
    remaining[to] -= amount;
    live[e] = false;
  }
  return remaining.every((v) => v === 0);
}

/**
 * Straightforward reference for the >16 heuristic: sort residual debts and credits by size descending,
 * joining order ascending, transfer the smaller between the two heads, repeat.
 */
export function referenceLargestFirst(values: readonly number[]): { from: number; to: number; amount: number }[] {
  const residual = values.slice();
  const out: { from: number; to: number; amount: number }[] = [];
  const pick = (sign: 1 | -1) =>
    residual
      .map((v, i) => ({ size: sign * v, i }))
      .filter(({ size }) => size > 0)
      .sort((a, b) => b.size - a.size || a.i - b.i)[0];
  for (;;) {
    const debtor = pick(-1);
    const creditor = pick(1);
    if (!debtor || !creditor) break;
    const amount = Math.min(debtor.size, creditor.size);
    out.push({ from: debtor.i, to: creditor.i, amount });
    residual[debtor.i] += amount;
    residual[creditor.i] -= amount;
  }
  return out.sort((a, b) => a.from - b.from || a.to - b.to);
}
