/**
 * Validation problems. A `Problem` names the field it belongs to, a stable `code` for logic and
 * tests, and the English `message` to display.
 */

export type ProblemCode =
  // Players
  | 'tooFewPlayers'
  // Game settings
  | 'buyInMissing'
  | 'buyInMalformed'
  | 'buyInTooManyDecimals'
  | 'buyInNotPositive'
  | 'depthMissing'
  | 'depthNotWholeNumber'
  | 'depthBelowMinimum'
  | 'coverageMissing'
  | 'coverageNotWholeNumber'
  | 'coverageBelowMinimum'
  | 'reserveMissing'
  | 'reserveNotWholeNumber'
  | 'numberTooLarge'
  // Chip set (game and template rows)
  | 'noDenominations'
  | 'valueMissing'
  | 'valueNotWholeNumber'
  | 'valueNotPositive'
  | 'duplicateValue'
  | 'quantityMissing'
  | 'quantityNotWholeNumber'
  // Payout schedule (step level, then one percentage field)
  | 'payoutScheduleMissing'
  | 'tooManyPaidPlaces'
  | 'payoutTotalNotHundred'
  | 'shareMissing'
  | 'shareMalformed'
  | 'shareTooManyDecimals'
  | 'shareNotPositive'
  | 'shareOverHundred'
  | 'shareAboveHigherPlace'
  // Names of saved players, participants and templates
  | 'nameRequired'
  | 'duplicateName';

/**
 * Which input a problem belongs to.
 * Chip rows: `chipValue:<rowId>` / `chipQuantity:<rowId>`; payout rows: `payoutShare:<rowId>`.
 * `chipSet` and `payoutSchedule` are step-level problems not tied to one row.
 */
export type FieldKey =
  | 'roster'
  | 'buyIn'
  | 'depth'
  | 'coverage'
  | 'reserve'
  | 'chipSet'
  | `chipValue:${string}`
  | `chipQuantity:${string}`
  | 'payoutSchedule'
  | `payoutShare:${string}`
  | 'name';

export interface Problem {
  code: ProblemCode;
  field: FieldKey;
  message: string;
}

export function problem(code: ProblemCode, field: FieldKey, message: string): Problem {
  return { code, field, message };
}
