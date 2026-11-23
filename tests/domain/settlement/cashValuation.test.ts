import { formatEurPerUnit, formatExactEur, formatSignedExactEur } from '@/domain/money';
import { allocateCashResults, cashRate, exactChipValue, exactWinLoss } from '@/domain/settlement';
import { randomInt, seededRandom } from './helpers';

describe('exact cash-game valuation', () => {
  it('EUR 20 at 100 BB with a 2-unit BB is EUR 0.10 per unit', () => {
    const rate = cashRate(2000, 200);
    expect(rate).toEqual({ numerator: 10, denominator: 1 });
    expect(formatEurPerUnit(rate)).toBe('EUR 0.10 / unit');
  });

  it('keeps sub-cent rates exact', () => {
    const rate = cashRate(2040, 200);
    expect(rate).toEqual({ numerator: 51, denominator: 5 });
    expect(formatEurPerUnit(rate)).toBe('EUR 0.102 / unit');
    expect(exactChipValue(150, rate)).toEqual({ numerator: 1530, denominator: 1 });
    expect(exactChipValue(1, rate)).toEqual({ numerator: 51, denominator: 5 });
  });

  it('values a one-unit discrepancy exactly even when it is below a cent', () => {
    const rate = cashRate(1000, 2000); // half a cent per unit
    expect(exactChipValue(-1, rate)).toEqual({ numerator: -1, denominator: 2 });
    expect(formatExactEur(exactChipValue(-1, rate))).toBe('−EUR 0.005');
  });

  it('gives the exact win or loss against contributions', () => {
    const rate = cashRate(1000, 2000);
    expect(exactWinLoss(2469, 1000, rate)).toEqual({ numerator: 469, denominator: 2 });
    expect(formatSignedExactEur(exactWinLoss(2469, 1000, rate))).toBe('+EUR 2.345');
    expect(formatSignedExactEur(exactWinLoss(1462, 1000, rate))).toBe('−EUR 2.69');
    expect(formatSignedExactEur(exactWinLoss(2000, 1000, rate))).toBe('EUR 0.00');
  });

  it('rejects non-positive rate inputs as programming errors', () => {
    expect(() => cashRate(0, 200)).toThrow();
    expect(() => cashRate(2000, 0)).toThrow();
    expect(() => cashRate(20.5, 200)).toThrow();
  });
});

describe('cash-game cent allocation', () => {
  // Rate: EUR 10 buy-in over a 2000-unit stack = half a cent per unit.
  const halfCent = cashRate(1000, 2000);

  it('turns EUR 12.345 / 10.345 / 7.310 into 12.35 / 10.34 / 7.31 when the first player joined earlier', () => {
    const players = [
      { id: 'a', finalUnits: 2469 }, // EUR 12.345
      { id: 'b', finalUnits: 2069 }, // EUR 10.345
      { id: 'c', finalUnits: 1462 }, // EUR 7.31
    ];
    expect(allocateCashResults(halfCent, players, 3000)).toEqual([
      { id: 'a', finalResult: 1235 },
      { id: 'b', finalResult: 1034 },
      { id: 'c', finalResult: 731 },
    ]);
  });

  it('gives the cent to the later player when they joined earlier (joining order, not ids or values)', () => {
    const players = [
      { id: 'b', finalUnits: 2069 },
      { id: 'a', finalUnits: 2469 },
      { id: 'c', finalUnits: 1462 },
    ];
    expect(allocateCashResults(halfCent, players, 3000)).toEqual([
      { id: 'b', finalResult: 1035 },
      { id: 'a', finalResult: 1234 },
      { id: 'c', finalResult: 731 },
    ]);
  });

  it('hands out leftover cents by descending discarded remainder', () => {
    // EUR 1 over 300 units: a third of a cent per unit. Remainders: 1/3, 2/3, 0, 2/3, 1/3.
    const third = cashRate(100, 300);
    const players = [
      { id: 'p0', finalUnits: 301 }, // 100 1/3
      { id: 'p1', finalUnits: 302 }, // 100 2/3
      { id: 'p2', finalUnits: 300 }, // 100
      { id: 'p3', finalUnits: 299 }, // 99 2/3
      { id: 'p4', finalUnits: 298 }, // 99 1/3
    ];
    // Floors sum to 498; two cents remain; they go to the two 2/3 remainders.
    expect(allocateCashResults(third, players, 500).map((r) => r.finalResult)).toEqual([100, 101, 100, 100, 99]);
  });

  it('breaks equal remainders by joining order, earliest first', () => {
    const third = cashRate(100, 300);
    const players = [
      { id: 'z', finalUnits: 1 }, // 1/3
      { id: 'y', finalUnits: 1 }, // 1/3
      { id: 'x', finalUnits: 1 }, // 1/3
      { id: 'w', finalUnits: 897 }, // 299
    ];
    expect(allocateCashResults(third, players, 300).map((r) => r.finalResult)).toEqual([1, 0, 0, 299]);
  });

  it('leaves whole-cent results untouched and allows zero chips', () => {
    const rate = cashRate(2000, 200);
    expect(
      allocateCashResults(
        rate,
        [
          { id: 'a', finalUnits: 400 },
          { id: 'b', finalUnits: 0 },
        ],
        4000,
      ),
    ).toEqual([
      { id: 'a', finalResult: 4000 },
      { id: 'b', finalResult: 0 },
    ]);
  });

  it('throws when chip accounting does not balance, even by one unit worth less than a cent', () => {
    expect(() =>
      allocateCashResults(
        halfCent,
        [
          { id: 'a', finalUnits: 2000 },
          { id: 'b', finalUnits: 1999 },
        ],
        2000,
      ),
    ).toThrow(/chip accounting must balance/);
  });

  it('throws on duplicate ids', () => {
    expect(() =>
      allocateCashResults(
        cashRate(1000, 100),
        [
          { id: 'a', finalUnits: 100 },
          { id: 'a', finalUnits: 100 },
        ],
        2000,
      ),
    ).toThrow(/duplicate/);
  });

  it('conserves every cent and stays within one cent of the exact value (generated cases)', () => {
    const random = seededRandom(24);
    for (let round = 0; round < 500; round++) {
      const buyIn = randomInt(random, 1, 10000);
      const stack = randomInt(random, 1, 5000);
      const rate = cashRate(buyIn, stack);
      const players = randomInt(random, 1, 12);
      const entries = randomInt(random, players, players * 3);
      const totalUnits = entries * stack;
      // Split totalUnits randomly among players.
      const cuts = Array.from({ length: players - 1 }, () => randomInt(random, 0, totalUnits)).sort((a, b) => a - b);
      const units = [...cuts, totalUnits].map((cut, i) => cut - (i === 0 ? 0 : cuts[i - 1]));
      const input = units.map((finalUnits, i) => ({ id: `p${i}`, finalUnits }));
      const results = allocateCashResults(rate, input, entries * buyIn);
      expect(results.reduce((s, r) => s + r.finalResult, 0)).toBe(entries * buyIn);
      results.forEach((r, i) => {
        const exactTimesStack = units[i] * buyIn;
        expect(r.finalResult * stack).toBeGreaterThanOrEqual(exactTimesStack - stack + 1);
        expect(Math.floor(exactTimesStack / stack) + 1).toBeGreaterThanOrEqual(r.finalResult);
        expect(r.finalResult).toBeGreaterThanOrEqual(Math.floor(exactTimesStack / stack));
      });
    }
  });
});
