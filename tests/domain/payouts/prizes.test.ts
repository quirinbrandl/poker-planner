import { allocateCashResults, cashRate } from '@/domain/settlement';
import { prizeAmounts } from '@/domain/payouts';

describe('prize amounts', () => {
  it('EUR 20.01 at 50 / 30 / 20 gives 10.01 / 6.00 / 4.00', () => {
    expect(prizeAmounts(2001, [5000, 3000, 2000])).toEqual([1001, 600, 400]);
  });

  it('gives unpaid finishing places zero and always allocates the whole pool', () => {
    expect(prizeAmounts(12000, [7000, 3000], 6)).toEqual([8400, 3600, 0, 0, 0, 0]);
    expect(prizeAmounts(0, [10000], 2)).toEqual([0, 0]);
  });

  it('assigns leftover cents from first place down, not by largest remainder', () => {
    // EUR 0.07 at 40/25/20/10/5: exact 2.8 / 1.75 / 1.4 / 0.7 / 0.35 cents, floors 2/1/1/0/0, 3 left.
    expect(prizeAmounts(7, [4000, 2500, 2000, 1000, 500])).toEqual([3, 2, 2, 0, 0]);
    // Largest remainder would have given 3 / 2 / 1 / 1 / 0 (remainders .8, .75, .7 win).
    // The cash-game rule differs on the same exact values: model them as chip units at 1/100 cent.
    const cash = allocateCashResults(
      cashRate(1, 100),
      [280, 175, 140, 70, 35].map((finalUnits, i) => ({ id: `p${i}`, finalUnits })),
      7,
    );
    expect(cash.map((r) => r.finalResult)).toEqual([3, 2, 1, 1, 0]);
  });

  it('first-place-down still matches when remainders already favour the top', () => {
    expect(prizeAmounts(101, [7000, 3000])).toEqual([71, 30]);
  });

  it('conserves the pool for every preset and many pools', () => {
    const schedules = [[10000], [7000, 3000], [5000, 3000, 2000], [5000, 2500, 1500, 1000], [4000, 2500, 2000, 1000, 500], [3334, 3333, 3333]];
    for (const shares of schedules) {
      for (let pool = 0; pool < 3000; pool += 7) {
        const amounts = prizeAmounts(pool, shares);
        expect(amounts.reduce((a, b) => a + b, 0)).toBe(pool);
        amounts.forEach((amount, i) => {
          const floor = Math.floor((pool * shares[i]) / 10000);
          expect(amount === floor || amount === floor + 1).toBe(true);
        });
        // Leftover cents go to a prefix of the places.
        const extras = amounts.map((amount, i) => amount - Math.floor((pool * shares[i]) / 10000));
        expect(extras).toEqual([...extras].sort((a, b) => b - a));
      }
    }
  });

  it('throws on an invalid schedule or too few finishing places (programming errors)', () => {
    expect(() => prizeAmounts(100, [5000, 4000])).toThrow();
    expect(() => prizeAmounts(100, [])).toThrow();
    expect(() => prizeAmounts(100, [10000, 0])).toThrow();
    expect(() => prizeAmounts(100, [7000, 3000], 1)).toThrow();
    expect(() => prizeAmounts(-1, [10000])).toThrow();
  });
});
