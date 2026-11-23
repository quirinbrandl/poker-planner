import {
  allocateLaterStack,
  type InitialDistribution,
  type InitialDistributionRequest,
  type LaterStackRequest,
  measureMix,
  planInitialDistribution,
  reserveCapacity,
} from '@/domain/distribution';
import type { ChipMix } from '@/domain/types';

/** `[[value, count], …]` → ChipMix. */
const chips = (pairs: [number, number][]): ChipMix => pairs.map(([value, count]) => ({ value, count }));
const counts = (mix: ChipMix) => mix.map((entry) => entry.count);

function plan(request: Partial<InitialDistributionRequest> & Pick<InitialDistributionRequest, 'chipSet'>): InitialDistribution {
  const result = planInitialDistribution({ players: 1, requestedDepth: 100, coverage: 4, reserveTarget: 0, preference: 'fewer', ...request });
  if (result.kind !== 'planned') throw new Error(`expected a plan, got ${JSON.stringify(result)}`);
  return result.distribution;
}

function later(request: Partial<LaterStackRequest> & Pick<LaterStackRequest, 'bank'>) {
  return allocateLaterStack({
    blinds: { small: 1, big: 2 },
    stackValue: 200,
    coverage: 4,
    preference: 'fewer',
    reserveToKeep: 0,
    allowReducedCoverage: true,
    ...request,
  });
}

const measure = (mix: [number, number][], small: number, big: number, coverage: number, stackValue?: number) => {
  const m = chips(mix);
  const value = mix.reduce((sum, [v, c]) => sum + v * c, 0);
  return measureMix({ mix: m, blinds: { small, big }, stackValue: stackValue ?? value, coverage });
};

describe('blind-payment coverage', () => {
  it('twelve 1-unit chips cover four small and four big blinds at 1/2', () => {
    expect(measure([[1, 12]], 1, 2, 4)).toMatchObject({ coverage: 4, qualifies: true });
    expect(measure([[1, 11]], 1, 2, 4)).toMatchObject({ coverage: 3, qualifies: false });
  });

  it('coverage six needs eighteen 1-unit chips at 1/2', () => {
    expect(measure([[1, 18]], 1, 2, 6)).toMatchObject({ coverage: 6, qualifies: true });
    expect(measure([[1, 17]], 1, 2, 6)).toMatchObject({ coverage: 5, qualifies: false });
  });

  it('lets a payment use several chips: 2/5 blinds paid from 1s and 2s', () => {
    // Two small blinds (one 2-chip each) and two big blinds (5 = 2 + 2 + 1 each) need all
    // 2 ones and 6 twos; with one 2-chip fewer only one pair remains.
    expect(measure([[1, 2], [2, 6]], 2, 5, 2)).toMatchObject({ coverage: 2, qualifies: true });
    expect(measure([[1, 2], [2, 5]], 2, 5, 2)).toMatchObject({ coverage: 1, qualifies: false });
  });

  it('never counts a chip twice', () => {
    // One 1-chip and two 2-chips at 1/2: each blind is payable alone, and a big blind could be
    // paid twice, but two small blinds need two 1-units: only one pair is disjoint.
    expect(measure([[1, 1], [2, 2]], 1, 2, 2)).toEqual({
      kind: 'measured',
      value: 5,
      chips: 3,
      coverage: 1,
      qualifies: false,
      canPaySmallBlind: true,
      canPayBigBlind: true,
    });
  });

  it('reports value and the single-payment flags of a mix that cannot pay either blind', () => {
    expect(measure([[100, 2]], 1, 2, 4, 200)).toEqual({
      kind: 'measured',
      value: 200,
      chips: 2,
      coverage: 0,
      qualifies: false,
      canPaySmallBlind: false,
      canPayBigBlind: false,
    });
  });
});

describe('deriving the small blind', () => {
  it('with denominations 1, 5, 25 and BB 5 the small blind is 2', () => {
    const d = plan({ chipSet: chips([[1, 40], [5, 40], [25, 40]]), players: 2, requestedDepth: 10, coverage: 2 });
    expect(d.blinds).toEqual({ small: 2, big: 5 });
    expect(d.smallBlindIsHalf).toBe(false);
  });

  it('with denominations 5, 25 and BB 25 the small blind is 10', () => {
    // Smaller big blinds would need more 5-chips than the eight available.
    const d = plan({ chipSet: chips([[5, 8], [25, 40]]), requestedDepth: 20, coverage: 2 });
    expect(d.blinds).toEqual({ small: 10, big: 25 });
    expect(d.smallBlindIsHalf).toBe(false);
    expect(counts(d.stackMix)).toEqual([5, 19]);
  });

  it('rejects a big blind without a positive small blind: no 5-unit BB from 5-chips alone', () => {
    // The 2-chips have no physical quantity, so BB 5 has no small blind ≤ 2.5 and BB 10 is used.
    const d = plan({ chipSet: chips([[2, 0], [5, 40]]), requestedDepth: 4, coverage: 1 });
    expect(d.blinds).toEqual({ small: 5, big: 10 });
  });

  it('rejects a big blind whose derived small blind the chips cannot pay, instead of lowering it', () => {
    // One 2-chip and 26 3-chips, depth 10. BB 8 gives SB 4 (= 2 + 2), which needs two 2-chips.
    // Lowering SB to 3 would make BB 8 feasible (the whole set: 3/8 blinds, as measured below),
    // but the rule rejects BB 8, so the only candidate is BB 6.
    const chipSet = chips([[2, 1], [3, 26]]);
    expect(measureMix({ mix: chipSet, blinds: { small: 3, big: 8 }, stackValue: 80, coverage: 1 })).toMatchObject({ qualifies: true });
    const d = plan({ chipSet, requestedDepth: 10, coverage: 1, preference: 'more' });
    expect(d.depth).toBe(10);
    expect(d.blinds).toEqual({ small: 3, big: 6 });
  });
});

describe('initial distribution', () => {
  it('gives every player the identical exact mix and leaves the rest in the bank', () => {
    const d = plan({ chipSet: chips([[1, 40], [5, 40], [25, 40]]), players: 2, requestedDepth: 10, coverage: 2 });
    expect(d).toMatchObject({ depth: 10, depthAdjusted: false, stackValue: 50, chipsPerStack: 10, reserve: 0 });
    expect(counts(d.stackMix)).toEqual([5, 4, 1]);
    expect(counts(d.bank)).toEqual([30, 32, 38]);
  });

  it('allows denominations a stack does not use', () => {
    const d = plan({ chipSet: chips([[5, 10], [25, 10]]), requestedDepth: 5, coverage: 1 });
    expect(d.blinds).toEqual({ small: 5, big: 10 });
    expect(counts(d.stackMix)).toEqual([5, 1]);
    const tens = plan({ chipSet: chips([[1, 7], [5, 7], [10, 3]]), requestedDepth: 3, coverage: 2 });
    expect(counts(tens.stackMix)).toEqual([0, 2, 2]);
  });

  it('applies both chip-count objectives at the same depth', () => {
    const chipSet = chips([[1, 7], [5, 7], [10, 3]]);
    // Fewest chips: 5/10 blinds, 2 fives + 2 tens = 30 (BB 2 would need six 1-chips).
    const fewer = plan({ chipSet, requestedDepth: 3, coverage: 2, preference: 'fewer' });
    expect(fewer).toMatchObject({ depth: 3, blinds: { small: 5, big: 10 }, chipsPerStack: 4 });
    // Most chips: 11/22 blinds, value 66 from 15 chips.
    const more = plan({ chipSet, requestedDepth: 3, coverage: 2, preference: 'more' });
    expect(more).toMatchObject({ depth: 3, blinds: { small: 11, big: 22 }, chipsPerStack: 15 });
    expect(counts(more.stackMix)).toEqual([6, 6, 3]);
  });

  it('keeps the full reserve when it fits and reports the bank after issuing', () => {
    const d = plan({ chipSet: chips([[1, 45], [5, 40]]), players: 2, requestedDepth: 20, coverage: 4, reserveTarget: 1 });
    expect(d).toMatchObject({ depth: 20, blinds: { small: 1, big: 2 }, reserve: 1, reserveReduced: false });
    expect(counts(d.stackMix)).toEqual([15, 5]);
    expect(counts(d.bank)).toEqual([15, 30]);
    expect(reserveCapacity({ bank: d.bank, blinds: d.blinds, stackValue: d.stackValue, coverage: 4, max: 5 })).toEqual({ kind: 'measured', stacks: 1 });
  });

  it('moves to the nearest depth that supports the full reserve', () => {
    const d = plan({ chipSet: chips([[1, 45], [5, 40]]), players: 2, requestedDepth: 20, coverage: 4, reserveTarget: 2 });
    expect(d).toMatchObject({ depth: 12, requestedDepth: 20, depthAdjusted: true, blinds: { small: 2, big: 5 }, reserve: 2 });
  });

  it('falls back to the highest achievable reserve when no depth supports the target', () => {
    // Value would suffice for five 40-unit stacks at 20 BB (200 ≤ 245), but not with coverage
    // and identical mixes at once: no depth supports three reserve stacks.
    const d = plan({ chipSet: chips([[1, 45], [5, 40]]), players: 2, requestedDepth: 20, coverage: 4, reserveTarget: 3 });
    expect(d).toMatchObject({ depth: 12, reserve: 2, reserveTarget: 3, reserveReduced: true });
  });

  it('never weakens coverage: a reserve stack must qualify too', () => {
    const d = plan({ chipSet: chips([[1, 24], [5, 200]]), requestedDepth: 10, coverage: 4, reserveTarget: 2 });
    expect(d).toMatchObject({ depth: 10, blinds: { small: 5, big: 10 }, reserve: 2 });
    expect(reserveCapacity({ bank: d.bank, blinds: d.blinds, stackValue: d.stackValue, coverage: 4, max: 2 })).toEqual({ kind: 'measured', stacks: 2 });
  });
});

describe('recommendation ranking', () => {
  // [[1, 7], [5, 63]] with coverage 2: the value caps the big blind at 3, and BB 2 needs six or
  // seven 1-chips, so only depths with 2·D ≡ 1 or 2 (mod 5) work: 98 and 101, not 99 or 100.
  const nearSet = chips([[1, 7], [5, 63]]);

  it('for a request of 100, the feasible 101 is closer than 98', () => {
    const d = plan({ chipSet: nearSet, requestedDepth: 100, coverage: 2 });
    expect(d).toMatchObject({ depth: 101, requestedDepth: 100, depthAdjusted: true });
    expect(plan({ chipSet: nearSet, requestedDepth: 98, coverage: 2 }).depth).toBe(98);
  });

  it('no chip-count improvement outranks a closer depth', () => {
    // At 98 BB the stack has 44 chips, at 101 BB 46; 'fewer' still takes the closer 101.
    expect(plan({ chipSet: nearSet, requestedDepth: 98, coverage: 2 }).chipsPerStack).toBe(44);
    expect(plan({ chipSet: nearSet, requestedDepth: 100, coverage: 2, preference: 'fewer' })).toMatchObject({ depth: 101, chipsPerStack: 46 });
  });

  it('between equally close 98 and 102, the lower depth wins', () => {
    // [[1, 5], [10, 54]], coverage 1: 98 (BB 3) and 102 (BB 2) are feasible, 99–101 are not.
    const chipSet = chips([[1, 5], [10, 54]]);
    expect(plan({ chipSet, requestedDepth: 100, coverage: 1 })).toMatchObject({ depth: 98, blinds: { small: 1, big: 3 } });
    expect(plan({ chipSet, requestedDepth: 102, coverage: 1 })).toMatchObject({ depth: 102, blinds: { small: 1, big: 2 } });
    for (const depth of [99, 100, 101]) expect(plan({ chipSet, requestedDepth: depth, coverage: 1 }).depthAdjusted).toBe(true);
  });

  it('the chip-count objective comes before the blind pair', () => {
    // BB 2 at depth 3 needs six 1-chips; BB 10 needs four chips, so 'fewer' takes the larger BB.
    const d = plan({ chipSet: chips([[1, 7], [5, 7], [10, 3]]), requestedDepth: 3, coverage: 2 });
    expect(d).toMatchObject({ blinds: { small: 5, big: 10 }, chipsPerStack: 4 });
  });

  it('at equal chips, an exact-half small blind beats a rounded one with a smaller big blind', () => {
    // At depth 3, the most chips any stack reaches is 21: with BB 57 (SB rounded to 28) as
    // 11/6/4 and with BB 62 (SB exactly 31) as 11/5/5. The exact half wins over the smaller BB.
    const chipSet = chips([[1, 11], [10, 6], [25, 7]]);
    expect(measureMix({ mix: chips([[1, 11], [10, 6], [25, 4]]), blinds: { small: 28, big: 57 }, stackValue: 171, coverage: 2 })).toMatchObject({ qualifies: true, chips: 21 });
    const d = plan({ chipSet, requestedDepth: 3, coverage: 2, preference: 'more' });
    expect(d).toMatchObject({ blinds: { small: 31, big: 62 }, smallBlindIsHalf: true, chipsPerStack: 21 });
    expect(counts(d.stackMix)).toEqual([11, 5, 5]);
  });

  it('at equal chips and equal halving, the smaller big blind wins', () => {
    // 10/20 at depth 2 is four 10-chips; 25/50 would be four 25-chips: same count, both exact halves.
    const d = plan({ chipSet: chips([[10, 11], [25, 7]]), requestedDepth: 2, coverage: 1 });
    expect(d).toMatchObject({ blinds: { small: 10, big: 20 }, chipsPerStack: 4 });
    expect(counts(d.stackMix)).toEqual([4, 0]);
  });

  it('remaining ties take more chips of the smaller denomination first', () => {
    // At 2/6 blinds and depth 5, 30 units in five chips: 2·2 + 6 + 2·10 or 2 + 3·6 + 10. Both
    // qualify; the first has more 2-chips.
    expect(measureMix({ mix: chips([[2, 1], [6, 3], [10, 1]]), blinds: { small: 2, big: 6 }, stackValue: 30, coverage: 1 })).toMatchObject({ qualifies: true });
    const d = plan({ chipSet: chips([[2, 12], [6, 9], [10, 13]]), players: 2, requestedDepth: 5, coverage: 1 });
    expect(d).toMatchObject({ blinds: { small: 2, big: 6 }, chipsPerStack: 5 });
    expect(counts(d.stackMix)).toEqual([2, 1, 2]);
  });
});

describe('no valid distribution', () => {
  it('insufficientValue: eighteen 1-unit chips are the minimum for coverage six', () => {
    expect(planInitialDistribution({ chipSet: chips([[1, 17]]), players: 1, requestedDepth: 8, coverage: 6, reserveTarget: 0, preference: 'fewer' })).toEqual({
      kind: 'noValidDistribution',
      reason: 'insufficientValue',
    });
    expect(plan({ chipSet: chips([[1, 18]]), requestedDepth: 8, coverage: 6 })).toMatchObject({ depth: 9, stackValue: 18 });
  });

  it('insufficientBlindChips: enough value, but too few chips small enough for the blinds', () => {
    // Each of 4 players gets 7 ones and 10 fives (57 units), but every affordable blind pair
    // needs more small chips per stack than that.
    expect(planInitialDistribution({ chipSet: chips([[1, 30], [5, 40]]), players: 4, requestedDepth: 10, coverage: 4, reserveTarget: 0, preference: 'fewer' })).toEqual({
      kind: 'noValidDistribution',
      reason: 'insufficientBlindChips',
    });
    expect(planInitialDistribution({ chipSet: chips([[1, 3], [100, 1]]), players: 1, requestedDepth: 10, coverage: 4, reserveTarget: 0, preference: 'fewer' })).toEqual({
      kind: 'noValidDistribution',
      reason: 'insufficientBlindChips',
    });
  });

  it('unsuitableDenominations: one 100-chip cannot form any blind pair a stack could hold', () => {
    expect(planInitialDistribution({ chipSet: chips([[100, 1]]), players: 1, requestedDepth: 10, coverage: 1, reserveTarget: 0, preference: 'fewer' })).toEqual({
      kind: 'noValidDistribution',
      reason: 'unsuitableDenominations',
    });
  });

  it('insufficientValue when there are no chips at all', () => {
    expect(planInitialDistribution({ chipSet: chips([[1, 0], [5, 0]]), players: 2, requestedDepth: 100, coverage: 4, reserveTarget: 0, preference: 'more' })).toEqual({
      kind: 'noValidDistribution',
      reason: 'insufficientValue',
    });
  });
});

describe('later stacks', () => {
  // 1/2 blinds, T = 200, k = 4: a stack's 1-chips are a multiple of 5 and at least 12, so 15 or more.
  it('picks the preferred qualifying stack once the reserve target is exhausted', () => {
    const result = later({ bank: chips([[1, 36], [5, 120]]), preference: 'more', reserveToKeep: 0 });
    expect(result).toMatchObject({ kind: 'qualifying', chips: 68, reserveAfter: 0, reserveWeakened: false });
    if (result.kind === 'qualifying') expect(counts(result.mix)).toEqual([35, 33]);
  });

  it('protects the remaining reserve even when that costs the preferred chip count', () => {
    // Taking 35 ones would leave one: no further stack. Taking 20 leaves 16: one more stack.
    const result = later({ bank: chips([[1, 36], [5, 120]]), preference: 'more', reserveToKeep: 1 });
    expect(result).toMatchObject({ kind: 'qualifying', chips: 56, reserveAfter: 1, reserveWeakened: false });
    if (result.kind === 'qualifying') {
      expect(counts(result.mix)).toEqual([20, 36]);
      const bank = chips([[1, 16], [5, 84]]);
      expect(reserveCapacity({ bank, blinds: { small: 1, big: 2 }, stackValue: 200, coverage: 4, max: 3 })).toEqual({ kind: 'measured', stacks: 1 });
    }
  });

  it('protects what is achievable when history has weakened the guarantee', () => {
    // Five stacks should remain, but the bank can form only two qualifying stacks in total:
    // the proposal keeps one formable after itself.
    expect(reserveCapacity({ bank: chips([[1, 36], [5, 120]]), blinds: { small: 1, big: 2 }, stackValue: 200, coverage: 4, max: 6 })).toEqual({ kind: 'measured', stacks: 2 });
    expect(later({ bank: chips([[1, 36], [5, 120]]), preference: 'more', reserveToKeep: 5 })).toMatchObject({
      kind: 'qualifying',
      reserveAfter: 1,
      reserveWeakened: true,
    });
  });

  it('a rebuy maximizes reduced coverage before chip count', () => {
    // Twelve 1-chips, but exact 200 allows only 10 (or 5 or 0) of them: coverage 3 at 48 chips
    // beats 40 five-chips with coverage 0 even under 'fewer'.
    const result = later({ bank: chips([[1, 12], [5, 60]]), preference: 'fewer' });
    expect(result).toEqual({
      kind: 'reducedCoverage',
      mix: chips([[1, 10], [5, 38]]),
      chips: 48,
      achievedCoverage: 3,
      canPaySmallBlind: true,
      canPayBigBlind: true,
      reserveAfter: 0,
      reserveWeakened: false,
    });
  });

  it('a rebuy may have zero coverage, reporting each blind separately', () => {
    // Two 100-chips at 1/2 pay neither blind.
    expect(later({ bank: chips([[100, 2]]) })).toEqual({
      kind: 'reducedCoverage',
      mix: chips([[100, 2]]),
      chips: 2,
      achievedCoverage: 0,
      canPaySmallBlind: false,
      canPayBigBlind: false,
      reserveAfter: 0,
      reserveWeakened: false,
    });
    // With 2-chips a big blind is payable but no small blind: coverage stays 0. 'more' takes
    // the 2-chips (43 chips), 'fewer' does not (40 chips).
    expect(later({ bank: chips([[2, 5], [5, 60]]), preference: 'more' })).toMatchObject({
      kind: 'reducedCoverage',
      achievedCoverage: 0,
      chips: 43,
      canPaySmallBlind: false,
      canPayBigBlind: true,
    });
    expect(later({ bank: chips([[2, 5], [5, 60]]), preference: 'fewer' })).toMatchObject({ kind: 'reducedCoverage', chips: 40, canPayBigBlind: false });
  });

  it('late entry cannot use reduced coverage and reports the achievable coverage', () => {
    expect(later({ bank: chips([[1, 12], [5, 60]]), allowReducedCoverage: false })).toEqual({
      kind: 'impossible',
      reason: 'coverageShortage',
      achievableCoverage: 3,
    });
  });

  it('rejects a stack when the bank has too little value or no exact mix', () => {
    expect(later({ bank: chips([[1, 100]]) })).toEqual({ kind: 'impossible', reason: 'insufficientValue', achievableCoverage: null });
    expect(later({ bank: chips([[3, 100]]) })).toEqual({ kind: 'impossible', reason: 'unsuitableDenominations', achievableCoverage: null });
  });
});

describe('input validation', () => {
  it('throws RangeError for programmer errors and returns data for expected outcomes', () => {
    expect(() => planInitialDistribution({ chipSet: chips([[5, 1], [1, 1]]), players: 1, requestedDepth: 1, coverage: 1, reserveTarget: 0, preference: 'fewer' })).toThrow(RangeError);
    expect(() => measureMix({ mix: chips([[1, 1]]), blinds: { small: 2, big: 3 }, stackValue: 1, coverage: 1 })).toThrow(RangeError);
    expect(() => reserveCapacity({ bank: chips([[1, -1]]), blinds: { small: 1, big: 2 }, stackValue: 1, coverage: 1, max: 1 })).toThrow(RangeError);
  });
});
