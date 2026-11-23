import {
  eurInputText,
  formatEur,
  formatEurPerUnit,
  formatExactEur,
  formatSignedEur,
  formatSignedExactEur,
  parseEurInput,
} from '@/domain/money';

describe('EUR input', () => {
  it.each([
    ['20', 2000],
    ['20.5', 2050],
    ['20.50', 2050],
    ['20,50', 2050],
    [' 0.01 ', 1],
    ['0', 0],
  ])('accepts %s as %i cents', (raw, cents) => {
    expect(parseEurInput(raw)).toEqual({ ok: true, cents });
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['20.505', 'tooManyDecimals'],
    ['1,000.00', 'malformed'],
    ['1e3', 'malformed'],
    ['€20', 'malformed'],
    ['-5', 'malformed'],
    ['20.', 'malformed'],
    ['.5', 'malformed'],
  ])('rejects %j as %s without rounding', (raw, error) => {
    expect(parseEurInput(raw)).toEqual({ ok: false, error });
  });
});

describe('EUR formatting', () => {
  it('formats cents as ordinary EUR amounts', () => {
    expect(formatEur(2000)).toBe('EUR 20.00');
    expect(formatEur(1)).toBe('EUR 0.01');
    expect(formatEur(-800)).toBe('−EUR 8.00');
    expect(formatSignedEur(1300)).toBe('+EUR 13.00');
    expect(formatSignedEur(-800)).toBe('−EUR 8.00');
    expect(formatSignedEur(0)).toBe('EUR 0.00');
    expect(eurInputText(2050)).toBe('20.50');
  });
});

describe('exact EUR formatting', () => {
  it('shows sub-cent digits only where they exist', () => {
    expect(formatExactEur({ numerator: 2469, denominator: 2 })).toBe('EUR 12.345');
    expect(formatExactEur({ numerator: 1230, denominator: 1 })).toBe('EUR 12.30');
    expect(formatExactEur({ numerator: 0, denominator: 1 })).toBe('EUR 0.00');
    expect(formatExactEur({ numerator: 5, denominator: 4 })).toBe('EUR 0.0125');
    expect(formatExactEur({ numerator: -1, denominator: 2 })).toBe('−EUR 0.005');
  });

  it('rounds beyond 4 decimals, halves away from zero', () => {
    expect(formatExactEur({ numerator: 1, denominator: 3 })).toBe('EUR 0.0033');
    expect(formatExactEur({ numerator: 2, denominator: 3 })).toBe('EUR 0.0067');
    expect(formatExactEur({ numerator: 1, denominator: 200 })).toBe('EUR 0.0001');
    expect(formatExactEur({ numerator: -1, denominator: 200 })).toBe('−EUR 0.0001');
    expect(formatExactEur({ numerator: -1, denominator: 1000 })).toBe('EUR 0.00');
  });

  it('signs win/loss amounts', () => {
    expect(formatSignedExactEur({ numerator: 469, denominator: 2 })).toBe('+EUR 2.345');
    expect(formatSignedExactEur({ numerator: -269, denominator: 1 })).toBe('−EUR 2.69');
    expect(formatSignedExactEur({ numerator: 0, denominator: 1 })).toBe('EUR 0.00');
  });

  it('formats the per-unit rate with up to 4 decimals and no trailing zeros', () => {
    expect(formatEurPerUnit({ numerator: 10, denominator: 1 })).toBe('EUR 0.10 / unit');
    expect(formatEurPerUnit({ numerator: 51, denominator: 5 })).toBe('EUR 0.102 / unit');
    expect(formatEurPerUnit({ numerator: 20, denominator: 3 })).toBe('EUR 0.0667 / unit');
    expect(formatEurPerUnit({ numerator: 100, denominator: 1 })).toBe('EUR 1.00 / unit');
  });
});
