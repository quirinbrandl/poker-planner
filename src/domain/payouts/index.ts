/**
 * Tournament payouts: presets and suggestion, schedule validation from typed text, and prize amounts.
 * Shares are exact whole basis points (hundredths of a percent). See spec Decisions 12 and 14.
 */
export {
  FULL_SHARE,
  PAYOUT_PRESETS,
  formatSharePercent,
  isPresetAvailable,
  matchingPreset,
  payoutPreset,
  presetRows,
  sharePercentText,
  suggestedPreset,
  type PayoutPreset,
  type PayoutPresetId,
  type ShareBasisPoints,
} from './presets';
export {
  placeLabel,
  validatePayoutSchedule,
  type PayoutScheduleCheck,
  type ShareField,
  type ShareFieldError,
  type ShareFieldErrorCode,
  type ShareTotal,
} from './validation';
export { prizeAmounts } from './prizes';
