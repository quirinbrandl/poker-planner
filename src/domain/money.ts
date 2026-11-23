import type { Cents } from './types';

export type EurInputParse =
  | { ok: true; cents: Cents }
  | { ok: false; error: 'empty' | 'malformed' | 'tooManyDecimals' };

/**
 * Parses what the host typed into a EUR field. Accepts ungrouped digits with an optional dot or
 * comma and one or two fractional digits ("20", "20.5", "20.50", "20,50"). Anything else is
 * rejected; nothing is rounded or truncated. Outer whitespace is ignored.
 */
export function parseEurInput(raw: string): EurInputParse {
  const text = raw.trim();
  if (text === '') return { ok: false, error: 'empty' };
  const match = /^(\d+)(?:[.,](\d+))?$/.exec(text);
  if (!match) return { ok: false, error: 'malformed' };
  const [, whole, fraction = ''] = match;
  if (fraction.length > 2) return { ok: false, error: 'tooManyDecimals' };
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0') || '0');
  if (!Number.isSafeInteger(cents)) return { ok: false, error: 'malformed' };
  return { ok: true, cents };
}

/** "EUR 20.00". Negative amounts read "−EUR 8.00" with a real minus sign. */
export function formatEur(cents: Cents): string {
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  return `${cents < 0 ? '−' : ''}EUR ${whole}.${fraction}`;
}

/** "+EUR 13.00", "−EUR 8.00" or "EUR 0.00" for balances and win/loss amounts. */
export function formatSignedEur(cents: Cents): string {
  return cents > 0 ? `+${formatEur(cents)}` : formatEur(cents);
}

/** The text to put back into a EUR field for an accepted amount: "20.00". */
export function eurInputText(cents: Cents): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}
