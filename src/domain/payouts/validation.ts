import { FULL_SHARE, formatSharePercent, type ShareBasisPoints } from './presets';

/** Why one percentage field is not acceptable. */
export type ShareFieldErrorCode =
  | 'empty'
  | 'malformed'
  | 'tooManyDecimals'
  | 'notPositive'
  | 'overHundred'
  | 'aboveHigherPlace';

/** A field problem with its stable code and the approved English message. */
export interface ShareFieldError {
  readonly code: ShareFieldErrorCode;
  readonly message: string;
}

/**
 * One percentage field. `share` is present whenever the text is a number (even if it then fails a
 * rule), so it still counts toward the total; `error` is the first failing rule, or `null`.
 */
export interface ShareField {
  readonly raw: string;
  readonly share: ShareBasisPoints | null;
  readonly error: ShareFieldError | null;
}

/**
 * The Total line under the ladder, over every field that holds a number:
 * - `exact`: 100% and every field holds a number ("✓ Total 100%").
 * - `under`: every field holds a number, total below 100% ("Total 95% · 5% left").
 * - `over`: above 100%, even with fields still empty ("Total 105% · 5% too much").
 * - `incomplete`: some field holds no number and the total is at most 100% ("Total 70% so far").
 */
export type ShareTotal =
  | { readonly kind: 'exact'; readonly total: ShareBasisPoints }
  | { readonly kind: 'under'; readonly total: ShareBasisPoints; readonly left: ShareBasisPoints }
  | { readonly kind: 'over'; readonly total: ShareBasisPoints; readonly excess: ShareBasisPoints }
  | { readonly kind: 'incomplete'; readonly total: ShareBasisPoints };

/** Validation of a payout schedule as typed. Raw text is reported back unchanged. */
export interface PayoutScheduleCheck {
  /** One entry per paid place, 1st place first. */
  readonly fields: readonly ShareField[];
  readonly total: ShareTotal;
  /** Two or more places hold the same number. Allowed; places still come from the elimination order. */
  readonly hasEqualShares: boolean;
  /** Set when the schedule pays more places than there are players ("4 paid places, but only 3 players."). */
  readonly tooManyPlaces: { readonly paidPlaces: number; readonly playerCount: number } | null;
  /**
   * The validated shares when the schedule has at least one place, every field is valid, the total is
   * exactly 100% and places do not exceed players; otherwise `{ valid: false }`.
   */
  readonly schedule: { readonly valid: true; readonly shares: readonly ShareBasisPoints[] } | { readonly valid: false };
}

const ORDINAL_SUFFIX = (place: number) => {
  const mod100 = place % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[place % 10] ?? 'th';
};

/** "1st", "2nd", "3rd", "4th" … for a 1-based finishing place. */
export function placeLabel(place: number): string {
  return `${place}${ORDINAL_SUFFIX(place)}`;
}

type ParsedShare = { ok: true; share: ShareBasisPoints } | { ok: false; code: 'empty' | 'malformed' | 'tooManyDecimals' };

/**
 * Parses one typed share: optional minus, digits, optional dot or comma with digits. Outer whitespace is
 * ignored. "12.5" and "12,5" are 1250; at most two decimals; nothing is rounded.
 */
function parseShare(raw: string): ParsedShare {
  const text = raw.trim();
  if (text === '') return { ok: false, code: 'empty' };
  const match = /^(-?)(\d+)(?:[.,](\d+))?$/.exec(text);
  if (!match) return { ok: false, code: 'malformed' };
  const [, sign, whole, fraction = ''] = match;
  if (fraction.length > 2) return { ok: false, code: 'tooManyDecimals' };
  const magnitude = Number(whole) * 100 + Number(fraction.padEnd(2, '0') || '0');
  if (!Number.isSafeInteger(magnitude)) return { ok: false, code: 'malformed' };
  return { ok: true, share: sign ? -magnitude : magnitude };
}

const PARSE_MESSAGES = {
  empty: 'Enter a percentage.',
  malformed: 'Enter a number, like 30 or 12.5.',
  tooManyDecimals: 'Use at most 2 decimals, like 12.5.',
} as const;

/**
 * Validates a payout schedule from the percentage rows exactly as the host typed them, 1st place first,
 * for a roster of `playerCount` players. Never alters the text and never throws for user input.
 *
 * Field rules, first failure wins: empty ("Enter a percentage."), not a number ("Enter a number, like 30
 * or 12.5."), more than two decimals ("Use at most 2 decimals, like 12.5."), zero or negative ("Must be
 * more than 0%."), above 100 ("Can’t be more than 100%."), above the place directly above it when that
 * holds a number ("Can’t be more than 2nd place (20%).").
 */
export function validatePayoutSchedule(rows: readonly string[], playerCount: number): PayoutScheduleCheck {
  const parsed = rows.map(parseShare);
  const fields: ShareField[] = rows.map((raw, index) => {
    const result = parsed[index];
    if (!result.ok) return { raw, share: null, error: { code: result.code, message: PARSE_MESSAGES[result.code] } };
    const { share } = result;
    const fail = (code: ShareFieldErrorCode, message: string): ShareField => ({ raw, share, error: { code, message } });
    if (share <= 0) return fail('notPositive', 'Must be more than 0%.');
    if (share > FULL_SHARE) return fail('overHundred', 'Can’t be more than 100%.');
    const above = index > 0 ? parsed[index - 1] : null;
    if (above && above.ok && share > above.share) {
      return fail('aboveHigherPlace', `Can’t be more than ${placeLabel(index)} place (${formatSharePercent(above.share)}).`);
    }
    return { raw, share, error: null };
  });

  const numbers = fields.flatMap((field) => (field.share === null ? [] : [field.share]));
  const total = numbers.reduce((sum, share) => sum + share, 0);
  const allNumbers = numbers.length === fields.length && fields.length > 0;
  const totalState: ShareTotal =
    total > FULL_SHARE
      ? { kind: 'over', total, excess: total - FULL_SHARE }
      : !allNumbers
        ? { kind: 'incomplete', total }
        : total === FULL_SHARE
          ? { kind: 'exact', total }
          : { kind: 'under', total, left: FULL_SHARE - total };

  const hasEqualShares = new Set(numbers).size < numbers.length;
  const tooManyPlaces = rows.length > playerCount ? { paidPlaces: rows.length, playerCount } : null;
  const valid = totalState.kind === 'exact' && fields.every((field) => field.error === null) && tooManyPlaces === null;

  return {
    fields,
    total: totalState,
    hasEqualShares,
    tooManyPlaces,
    schedule: valid ? { valid: true, shares: numbers } : { valid: false },
  };
}
