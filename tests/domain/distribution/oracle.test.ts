import {
  allocateLaterStack,
  measureMix,
  planInitialDistribution,
  reserveCapacity,
} from '@/domain/distribution';
import type { ChipMix } from '@/domain/types';

import {
  type BruteRule,
  bruteCanPay,
  bruteCapacity,
  bruteCoverage,
  bruteLater,
  brutePlan,
  type Pref,
  rng,
} from './oracle';

const asMix = (values: number[], counts: number[]): ChipMix => values.map((value, i) => ({ value, count: counts[i] }));
const countsOf = (mix: ChipMix) => mix.map((entry) => entry.count);

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}
function int(random: () => number, lo: number, hi: number): number {
  return lo + Math.floor(random() * (hi - lo + 1));
}
/** Distinct ascending denominations; the first pool entry is included more often (usually 1). */
function denominations(random: () => number, pool: number[], min: number, max: number): number[] {
  const n = int(random, min, max);
  const chosen = new Set<number>();
  if (random() < 0.6) chosen.add(pool[0]);
  while (chosen.size < n) chosen.add(pick(random, pool));
  return [...chosen].sort((a, b) => a - b);
}

describe('initial distribution matches the exhaustive oracle', () => {
  const cases = 500;
  it(`agrees on ${cases} generated small chip sets`, () => {
    for (let seed = 1; seed <= cases; seed++) {
      const random = rng(seed);
      const values = denominations(random, [1, 2, 3, 4, 5, 10], 1, 3);
      const counts = values.map(() => int(random, 2, 16));
      const players = int(random, 1, 3);
      const k = int(random, 1, 2);
      const reserveTarget = int(random, 0, 2);
      const requestedDepth = int(random, 2, 10);
      const preference: Pref = random() < 0.5 ? 'fewer' : 'more';
      const label = `seed ${seed}: ${JSON.stringify({ values, counts, players, k, reserveTarget, requestedDepth, preference })}`;

      const expected = brutePlan({ values, counts }, players, requestedDepth, k, reserveTarget, preference);
      const actual = planInitialDistribution({
        chipSet: asMix(values, counts),
        players,
        requestedDepth,
        coverage: k,
        reserveTarget,
        preference,
      });
      if (expected === null) {
        expect({ label, kind: actual.kind }).toEqual({ label, kind: 'noValidDistribution' });
        continue;
      }
      if (actual.kind !== 'planned') throw new Error(`${label}: expected a plan, got ${actual.kind}`);
      const d = actual.distribution;
      expect({ label, depth: d.depth, small: d.blinds.small, big: d.blinds.big, mix: countsOf(d.stackMix), reserve: d.reserve }).toEqual({
        label,
        depth: expected.depth,
        small: expected.small,
        big: expected.big,
        mix: expected.mix,
        reserve: expected.reserve,
      });
      expect(countsOf(d.bank)).toEqual(counts.map((c, i) => c - players * expected.mix[i]));
    }
  });
});

describe('later stacks match the exhaustive oracle', () => {
  const cases = 400;
  it(`agrees on ${cases} generated banks`, () => {
    for (let seed = 1; seed <= cases; seed++) {
      const random = rng(10_000 + seed);
      const values = denominations(random, [1, 2, 3, 5, 10, 25], 1, 3);
      const bank = values.map(() => int(random, 0, 14));
      const small = pick(random, [1, 1, 1, 2, 3, 5]);
      const big = small * 2 + pick(random, [0, 0, 1]);
      const k = int(random, 1, 2);
      const total = big * int(random, k + 1, 5);
      const keep = int(random, 0, 2);
      const preference: Pref = random() < 0.5 ? 'fewer' : 'more';
      const allowReducedCoverage = random() < 0.7;
      const rule: BruteRule = { values, total, small, big, k };
      const label = `seed ${seed}: ${JSON.stringify({ values, bank, small, big, k, total, keep, preference, allowReducedCoverage })}`;

      const expected = bruteLater(rule, bank, keep, preference, allowReducedCoverage);
      const actual = allocateLaterStack({
        bank: asMix(values, bank),
        blinds: { small, big },
        stackValue: total,
        coverage: k,
        preference,
        reserveToKeep: keep,
        allowReducedCoverage,
      });
      switch (expected.kind) {
        case 'qualifying':
          if (actual.kind !== 'qualifying') throw new Error(`${label}: expected qualifying, got ${actual.kind}`);
          expect({ label, mix: countsOf(actual.mix), after: actual.reserveAfter }).toEqual({ label, mix: expected.mix, after: expected.reserveAfter });
          expect(actual.reserveWeakened).toBe(expected.reserveAfter < keep);
          break;
        case 'reducedCoverage':
          if (actual.kind !== 'reducedCoverage') throw new Error(`${label}: expected reducedCoverage, got ${actual.kind}`);
          expect({ label, mix: countsOf(actual.mix), c: actual.achievedCoverage }).toEqual({ label, mix: expected.mix, c: expected.coverage });
          expect(actual.canPaySmallBlind).toBe(bruteCanPay(values, expected.mix, small));
          expect(actual.canPayBigBlind).toBe(bruteCanPay(values, expected.mix, big));
          break;
        case 'impossible':
          expect({ label, actual }).toEqual({ label, actual: expected });
          break;
      }
    }
  });
});

describe('measurements and capacity match the exhaustive oracle', () => {
  it('measures coverage, qualification and single payments of generated mixes', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const random = rng(20_000 + seed);
      const values = denominations(random, [1, 2, 3, 4, 5, 10], 1, 4);
      const mix = values.map(() => int(random, 0, 7));
      const small = pick(random, [1, 2, 3, 5]);
      const big = small * 2 + pick(random, [0, 1, 2]);
      const k = int(random, 1, 4);
      const value = mix.reduce((sum, c, i) => sum + c * values[i], 0);
      const stackValue = random() < 0.6 ? Math.max(1, value) : Math.max(1, value + 1);
      const label = `seed ${seed}: ${JSON.stringify({ values, mix, small, big, k, stackValue })}`;
      const coverage = bruteCoverage(values, mix, small, big, k);
      const actual = measureMix({ mix: asMix(values, mix), blinds: { small, big }, stackValue, coverage: k });
      expect({ label, actual }).toEqual({
        label,
        actual: {
          kind: 'measured',
          value,
          chips: mix.reduce((sum, c) => sum + c, 0),
          coverage,
          qualifies: value === stackValue && coverage === k,
          canPaySmallBlind: bruteCanPay(values, mix, small),
          canPayBigBlind: bruteCanPay(values, mix, big),
        },
      });
    }
  });

  it('counts simultaneously formable qualifying stacks of generated banks', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const random = rng(30_000 + seed);
      const values = denominations(random, [1, 2, 3, 5, 10], 1, 3);
      const bank = values.map(() => int(random, 0, 12));
      const small = pick(random, [1, 1, 2, 3]);
      const big = small * 2 + pick(random, [0, 0, 1]);
      const k = int(random, 1, 2);
      const total = big * int(random, k + 1, 6);
      const max = int(random, 0, 4);
      const rule: BruteRule = { values, total, small, big, k };
      const label = `seed ${seed}: ${JSON.stringify({ values, bank, small, big, k, total, max })}`;
      const actual = reserveCapacity({ bank: asMix(values, bank), blinds: { small, big }, stackValue: total, coverage: k, max });
      expect({ label, actual }).toEqual({ label, actual: { kind: 'measured', stacks: bruteCapacity(rule, bank, max) } });
    }
  });
});
