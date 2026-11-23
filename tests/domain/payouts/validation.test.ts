import { validatePayoutSchedule } from '@/domain/payouts';

const errorOf = (rows: string[], index: number, players = 10) => validatePayoutSchedule(rows, players).fields[index].error;

describe('payout schedule validation', () => {
  it('accepts dot and comma decimals with up to two decimals and keeps the raw text', () => {
    const check = validatePayoutSchedule(['50', '30,5', ' 19.50 '], 5);
    expect(check.fields.map((f) => [f.raw, f.share, f.error])).toEqual([
      ['50', 5000, null],
      ['30,5', 3050, null],
      [' 19.50 ', 1950, null],
    ]);
    expect(check.total).toEqual({ kind: 'exact', total: 10000 });
    expect(check.schedule).toEqual({ valid: true, shares: [5000, 3050, 1950] });
  });

  it.each([
    ['', 'empty', 'Enter a percentage.'],
    ['   ', 'empty', 'Enter a percentage.'],
    ['abc', 'malformed', 'Enter a number, like 30 or 12.5.'],
    ['30%', 'malformed', 'Enter a number, like 30 or 12.5.'],
    ['1.000,5', 'malformed', 'Enter a number, like 30 or 12.5.'],
    ['12.', 'malformed', 'Enter a number, like 30 or 12.5.'],
    ['12.345', 'tooManyDecimals', 'Use at most 2 decimals, like 12.5.'],
    ['0', 'notPositive', 'Must be more than 0%.'],
    ['0,00', 'notPositive', 'Must be more than 0%.'],
    ['-5', 'notPositive', 'Must be more than 0%.'],
    ['100.01', 'overHundred', 'Can’t be more than 100%.'],
  ])('rejects %j as %s', (raw, code, message) => {
    expect(errorOf([raw], 0)).toEqual({ code, message });
  });

  it('rejects a share larger than the place above, naming that place', () => {
    expect(errorOf(['50', '20', '30'], 2)).toEqual({
      code: 'aboveHigherPlace',
      message: 'Can’t be more than 2nd place (20%).',
    });
    expect(errorOf(['40', '40.5', '19.5'], 1)?.message).toBe('Can’t be more than 1st place (40%).');
    expect(errorOf(['50', '12.5', '12.75', '24.75'], 2)?.message).toBe('Can’t be more than 2nd place (12.5%).');
    expect(validatePayoutSchedule(['50', '20', '30'], 5).schedule).toEqual({ valid: false });
  });

  it('skips the comparison when the place above holds no number', () => {
    expect(errorOf(['', '30'], 1)).toBeNull();
  });

  it('accepts equal shares and reports them', () => {
    const check = validatePayoutSchedule(['40', '30', '30'], 5);
    expect(check.hasEqualShares).toBe(true);
    expect(check.schedule).toEqual({ valid: true, shares: [4000, 3000, 3000] });
    expect(validatePayoutSchedule(['50', '30', '20'], 5).hasEqualShares).toBe(false);
  });

  it.each([
    [['100'], { kind: 'exact', total: 10000 }],
    [['70', '25'], { kind: 'under', total: 9500, left: 500 }],
    [['70', '35'], { kind: 'over', total: 10500, excess: 500 }],
    [['70', ''], { kind: 'incomplete', total: 7000 }],
    [['70', 'x', '40'], { kind: 'over', total: 11000, excess: 1000 }],
    [[], { kind: 'incomplete', total: 0 }],
  ])('total of %j', (rows, total) => {
    expect(validatePayoutSchedule(rows, 10).total).toEqual(total);
  });

  it('requires exactly 100% for a valid schedule, to the hundredth', () => {
    expect(validatePayoutSchedule(['33.34', '33.33', '33.33'], 3).schedule).toEqual({
      valid: true,
      shares: [3334, 3333, 3333],
    });
    expect(validatePayoutSchedule(['33.33', '33.33', '33.33'], 3).total).toEqual({ kind: 'under', total: 9999, left: 1 });
    expect(validatePayoutSchedule(['33.33', '33.33', '33.33'], 3).schedule.valid).toBe(false);
  });

  it('rejects more paid places than players and allows exactly as many', () => {
    const tooMany = validatePayoutSchedule(['50', '25', '15', '10'], 3);
    expect(tooMany.tooManyPlaces).toEqual({ paidPlaces: 4, playerCount: 3 });
    expect(tooMany.fields.every((f) => f.error === null)).toBe(true);
    expect(tooMany.schedule).toEqual({ valid: false });
    const exact = validatePayoutSchedule(['50', '25', '15', '10'], 4);
    expect(exact.tooManyPlaces).toBeNull();
    expect(exact.schedule.valid).toBe(true);
  });

  it('is invalid with no places', () => {
    expect(validatePayoutSchedule([], 4).schedule).toEqual({ valid: false });
  });
});
