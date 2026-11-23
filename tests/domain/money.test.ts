import { eurInputText, formatEur, formatSignedEur, parseEurInput } from '@/domain/money';

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
