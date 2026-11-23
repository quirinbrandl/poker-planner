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

/**
 * An exact, possibly fractional amount of EUR cents: `numerator / denominator` cents.
 * Always in lowest terms with a positive `denominator`; both are safe integers. A whole-cent
 * amount has `denominator: 1`. Cash-game chip values and the per-unit rate use this so that no
 * value is rounded before the explicit cent allocation at completion.
 */
export interface ExactCents {
  readonly numerator: number;
  readonly denominator: number;
}

/** Largest number of EUR decimals shown for an exact amount or a rate (two sub-cent digits). */
const MAX_EXACT_EUR_DECIMALS = 4;

/**
 * Renders an exact amount as signless EUR text with 2 to 4 decimals: the cents always, then
 * sub-cent digits only where they exist ("12.30", "12.345", "0.0125"). An amount with more
 * than 4 EUR decimals (for example a third of a cent) is rounded to 4, halves away from zero;
 * the returned `negative` reflects the rounded value, so a tiny negative amount never reads "−0.00".
 */
function exactEurDigits(amount: ExactCents): { negative: boolean; text: string } {
  const scale = BigInt(10 ** (MAX_EXACT_EUR_DECIMALS - 2));
  const numerator = BigInt(amount.numerator);
  const denominator = BigInt(amount.denominator);
  const absNumerator = numerator < BigInt(0) ? -numerator : numerator;
  // Units of 10^-4 EUR = 10^-2 cents, rounded half away from zero.
  const doubled = (absNumerator * scale * BigInt(2)) / denominator;
  const units = (doubled + BigInt(1)) / BigInt(2);
  const perEur = BigInt(10 ** MAX_EXACT_EUR_DECIMALS);
  const whole = units / perEur;
  let fraction = (units % perEur).toString().padStart(MAX_EXACT_EUR_DECIMALS, '0');
  while (fraction.length > 2 && fraction.endsWith('0')) fraction = fraction.slice(0, -1);
  return { negative: numerator < BigInt(0) && units > BigInt(0), text: `${whole}.${fraction}` };
}

/**
 * "EUR 12.345", "EUR 12.30", "−EUR 0.005": an exact amount with sub-cent digits only where they
 * exist, at most 4 decimals (see {@link ExactCents}). Used while a cash game is in progress, before
 * cents are allocated. Negative amounts use a real minus sign, like {@link formatEur}.
 */
export function formatExactEur(amount: ExactCents): string {
  const { negative, text } = exactEurDigits(amount);
  return `${negative ? '−' : ''}EUR ${text}`;
}

/** {@link formatExactEur} with a "+" on positive amounts, like {@link formatSignedEur}: "+EUR 2.345". */
export function formatSignedExactEur(amount: ExactCents): string {
  const { negative, text } = exactEurDigits(amount);
  const isZero = /^0\.0+$/.test(text);
  return `${negative ? '−' : isZero ? '' : '+'}EUR ${text}`;
}

/**
 * The cash-game money-per-chip-unit rate as text: "EUR 0.10 / unit", "EUR 0.102 / unit".
 * `rate` is in cents per chip unit (see `cashRate` in `@/domain/settlement`). Shows 2 to 4
 * decimals without trailing zeros beyond the cents; a rate needing more than 4 decimals is
 * rounded to 4, halves away from zero ("EUR 0.0667 / unit" for EUR 20 over 300 units).
 */
export function formatEurPerUnit(rate: ExactCents): string {
  return `${formatExactEur(rate)} / unit`;
}
