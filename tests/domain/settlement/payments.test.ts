import { EXACT_SETTLEMENT_LIMIT, settlePayments, type PlayerBalance } from '@/domain/settlement';
import {
  bruteForceMinimumPayments,
  expectValidPlan,
  randomInt,
  randomNonzeroBalances,
  referenceLargestFirst,
  seededRandom,
  withIds,
} from './helpers';

const plan = (values: readonly number[]) => settlePayments(withIds(values));
const positions = (balances: readonly PlayerBalance[], values: ReturnType<typeof settlePayments>) => {
  const index = new Map(balances.map((b, i) => [b.id, i]));
  return values.map((p) => ({ from: index.get(p.fromId)!, to: index.get(p.toId)!, amount: p.amount }));
};

function shuffle<T>(random: () => number, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

describe('Payments: worked examples', () => {
  it('needs no payments when every balance is zero', () => {
    expect(plan([0, 0, 0])).toEqual([]);
    expect(plan([])).toEqual([]);
  });

  it('settles debts 8 / 7 / 6 against credits 13 / 8 with three payments, not four', () => {
    const balances = withIds([-800, -700, -600, 1300, 800]);
    const result = settlePayments(balances);
    expectValidPlan(balances, result);
    expect(result).toEqual([
      { fromId: 'p0', toId: 'p4', amount: 800 },
      { fromId: 'p1', toId: 'p3', amount: 700 },
      { fromId: 'p2', toId: 'p3', amount: 600 },
    ]);
    expect(referenceLargestFirst([-800, -700, -600, 1300, 800])).toHaveLength(4);
  });

  it('chooses between equally small plans by joining order: earliest debtor pays earliest matching creditor', () => {
    // Both {p0→p2, p1→p3} and {p0→p3, p1→p2} use two payments.
    expect(plan([-500, -500, 500, 500])).toEqual([
      { fromId: 'p0', toId: 'p2', amount: 500 },
      { fromId: 'p1', toId: 'p3', amount: 500 },
    ]);
  });

  it('ignores zero-balance players and returns instructions by payer then receiver joining order', () => {
    const balances = withIds([0, 300, -100, 0, -200, 0]);
    expect(settlePayments(balances)).toEqual([
      { fromId: 'p2', toId: 'p1', amount: 100 },
      { fromId: 'p4', toId: 'p1', amount: 200 },
    ]);
  });

  it('throws when balances do not sum to zero or ids repeat', () => {
    expect(() => plan([100, -99])).toThrow(/zero/);
    expect(() =>
      settlePayments([
        { id: 'a', balance: 1 },
        { id: 'a', balance: -1 },
      ]),
    ).toThrow(/duplicate/);
  });
});

describe('Payments: exact minimum against an independent exhaustive oracle', () => {
  it.each([
    ['8/7/6 vs 13/8', [-8, -7, -6, 13, 8]],
    ['two hidden pairs behind a big creditor', [-10, -3, -3, 7, 3, 6]],
    ['largest-first splits a perfect match', [-6, -5, -4, 9, 6]],
    ['three zero-sum triples interleaved', [-5, -4, 9, -7, -2, 9, -3, -1, 4]],
    ['one irreducible group', [-11, -13, -17, 19, 22]],
  ])('%s', (_name, values) => {
    const balances = withIds(values);
    const result = settlePayments(balances);
    expectValidPlan(balances, result);
    expect(result).toHaveLength(bruteForceMinimumPayments(values));
  });

  it('matches the oracle on seeded generated balance sets up to 8 players', () => {
    const random = seededRandom(107);
    let beatsHeuristic = 0;
    for (let round = 0; round < 400; round++) {
      const n = randomInt(random, 2, 8);
      const values = randomNonzeroBalances(random, n, randomInt(random, 3, 12));
      const balances = withIds(values);
      const result = settlePayments(balances);
      expectValidPlan(balances, result);
      const minimum = bruteForceMinimumPayments(values);
      expect(result).toHaveLength(minimum);
      if (referenceLargestFirst(values).length > minimum) beatsHeuristic++;
    }
    // The generated set includes many adversarial cases where largest-first is not optimal.
    expect(beatsHeuristic).toBeGreaterThan(10);
  });

  it('matches the oracle on a few 9-player sets', () => {
    const random = seededRandom(9);
    for (let round = 0; round < 6; round++) {
      const values = randomNonzeroBalances(random, 9, 6);
      const balances = withIds(values);
      const result = settlePayments(balances);
      expectValidPlan(balances, result);
      expect(result).toHaveLength(bruteForceMinimumPayments(values));
    }
  });
});

describe('Payments: the 16 / 17 nonzero-balance threshold', () => {
  // Groups whose optimum is known: 5 players settle in 3, a pair in 1. Scaled so groups never mix.
  const fiveGroup = (scale: number) => [-8, -7, -6, 13, 8].map((v) => v * scale);
  const pair = (amount: number) => [-amount, amount];
  const sixteen = [...fiveGroup(100), ...fiveGroup(1000), ...pair(70001), ...pair(90001), ...pair(110003)];
  const seventeen = [...fiveGroup(100), ...fiveGroup(1000), ...fiveGroup(10000), ...pair(700001)];

  it('uses the exact solver at 16 nonzero balances, even with zero balances in the roster', () => {
    expect(EXACT_SETTLEMENT_LIMIT).toBe(16);
    const values = [0, ...sixteen.slice(0, 8), 0, 0, ...sixteen.slice(8), 0];
    const balances = withIds(values);
    const result = settlePayments(balances);
    expectValidPlan(balances, result);
    expect(result).toHaveLength(3 + 3 + 1 + 1 + 1);
    expect(referenceLargestFirst(values).length).toBeGreaterThan(9);
  });

  it('uses the largest-first heuristic at 17 nonzero balances, even with zero balances in the roster', () => {
    const values = [...seventeen.slice(0, 5), 0, 0, ...seventeen.slice(5), 0];
    const balances = withIds(values);
    const result = settlePayments(balances);
    expectValidPlan(balances, result);
    expect(positions(balances, result)).toEqual(referenceLargestFirst(values));
    expect(result.length).toBeGreaterThan(3 + 3 + 3 + 1);
  });

  it('breaks equal residuals in the heuristic by joining order', () => {
    // 9 debtors of 100 and 8 creditors: two of 200 (p9, p10) and six of 50... arranged to tie.
    const values = [...Array(9).fill(-100), 200, 200, 100, 100, 100, 50, 50, 100];
    const balances = withIds(values);
    const result = settlePayments(balances);
    expectValidPlan(balances, result);
    expect(positions(balances, result)).toEqual(referenceLargestFirst(values));
    // First step: the earliest of the tied largest debts (p0) pays the earliest largest credit (p9).
    expect(result[0]).toEqual({ fromId: 'p0', toId: 'p9', amount: 100 });
  });

  it('matches the reference heuristic and every invariant on generated rosters above 16', () => {
    const random = seededRandom(1716);
    for (let round = 0; round < 200; round++) {
      const nonzero = randomInt(random, 17, 40);
      const values = randomNonzeroBalances(random, nonzero, randomInt(random, 2, 5000));
      const zeros = randomInt(random, 0, 5);
      for (let z = 0; z < zeros; z++) values.splice(randomInt(random, 0, values.length), 0, 0);
      const balances = withIds(values);
      const result = settlePayments(balances);
      expectValidPlan(balances, result);
      expect(positions(balances, result)).toEqual(referenceLargestFirst(values));
    }
  });

  it('keeps every invariant on generated exact-branch rosters of 10–16 nonzero balances', () => {
    const random = seededRandom(1610);
    for (let round = 0; round < 60; round++) {
      const values = randomNonzeroBalances(random, randomInt(random, 10, 16), randomInt(random, 2, 30));
      const zeros = randomInt(random, 0, 4);
      for (let z = 0; z < zeros; z++) values.splice(randomInt(random, 0, values.length), 0, 0);
      const balances = withIds(values);
      const result = settlePayments(balances);
      expectValidPlan(balances, result);
      expect(result.length).toBeLessThanOrEqual(referenceLargestFirst(values).length);
    }
  });
});

describe('Payments: determinism', () => {
  it('returns identical plans on repeated calls and when only ids change', () => {
    const random = seededRandom(42);
    for (let round = 0; round < 100; round++) {
      const n = randomInt(random, 2, round % 2 ? 16 : 24);
      const values = randomNonzeroBalances(random, n, randomInt(random, 2, 20));
      const original = withIds(values);
      const first = positions(original, settlePayments(original));
      expect(positions(original, settlePayments(original))).toEqual(first);
      // Same joining order, new opaque ids in a random spelling: the plan by position is unchanged.
      const renamed = shuffle(random, values.map((_, i) => `id-${i}`)).map((id, i) => ({ id, balance: values[i] }));
      expect(positions(renamed, settlePayments(renamed))).toEqual(first);
    }
  });
});

describe('Payments: exact solver timing', () => {
  it('settles demanding 16-balance inputs quickly', () => {
    const random = seededRandom(16);
    const cases: number[][] = [
      // One irreducible group: the largest search for the first group.
      randomNonzeroBalances(random, 16, 1_000_000),
      // Many small zero-sum subsets: many alternatives with the same optimum.
      randomNonzeroBalances(random, 16, 3),
      [...Array(8).fill(-1), ...Array(8).fill(1)],
      [-8, -7, -6, 13, 8, -80, -70, -60, 130, 80, -300, -400, 700, -3000, -4000, 7000],
    ];
    for (const values of cases) {
      expect(values.filter((v) => v !== 0)).toHaveLength(16);
      expect(values.reduce((a, b) => a + b, 0)).toBe(0);
    }
    const timings = cases.map((values) => {
      const balances = withIds(values);
      settlePayments(balances); // warm-up
      const start = performance.now();
      const runs = 5;
      for (let i = 0; i < runs; i++) settlePayments(balances);
      return (performance.now() - start) / runs;
    });
    // eslint-disable-next-line no-console
    console.log(`exact solver, 16 nonzero balances, ms per call: ${timings.map((t) => t.toFixed(1)).join(', ')}`);
    for (const ms of timings) expect(ms).toBeLessThan(500);
  });
});
