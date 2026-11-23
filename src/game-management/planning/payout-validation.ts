/**
 * Payout schedule validation for Planning: the rules come from `@/domain/payouts`; this file turns
 * them into `Problem`s for the step, the preview blockers and the validated plan.
 */
import {
  formatSharePercent,
  payoutPreset,
  type PayoutPresetId,
  type PayoutScheduleCheck,
  placeLabel,
  type ShareBasisPoints,
  type ShareFieldErrorCode,
  validatePayoutSchedule,
} from '@/domain/payouts';

import type { PayoutScheduleDraft } from '../core/documents';
import { type Problem, type ProblemCode, problem } from '../core/problems';

/** The schedule a valid tournament plan carries into Start, locked details and results. */
export interface ValidPayoutSchedule {
  /** Shares of 1st, 2nd … place in basis points (hundredths of a percent); they sum to 10000. */
  shares: readonly ShareBasisPoints[];
  /** The preset it was picked as, or `null` for Custom. */
  presetId: PayoutPresetId | null;
  /** "Top 2" or "Custom". */
  name: string;
}

export interface PayoutStepValidation {
  /** `null` while no schedule has been chosen (no places). */
  check: PayoutScheduleCheck | null;
  /** Step problems in screen order: too many places, each share field, then the total. */
  problems: Problem[];
  /** The preset currently shown, or `null` for Custom. */
  presetId: PayoutPresetId | null;
  valid: ValidPayoutSchedule | null;
}

const SHARE_CODES: Readonly<Record<ShareFieldErrorCode, ProblemCode>> = {
  empty: 'shareMissing',
  malformed: 'shareMalformed',
  tooManyDecimals: 'shareTooManyDecimals',
  notPositive: 'shareNotPositive',
  overHundred: 'shareOverHundred',
  aboveHigherPlace: 'shareAboveHigherPlace',
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "4 paid places, but only 3 players." */
export function tooManyPlacesMessage(paidPlaces: number, playerCount: number): string {
  return `${plural(paidPlaces, 'paid place')}, but only ${plural(playerCount, 'player')}.`;
}

export function shareFieldKey(rowId: string) {
  return `payoutShare:${rowId}` as const;
}

export function validatePayoutStep(schedule: PayoutScheduleDraft, playerCount: number): PayoutStepValidation {
  const { rows } = schedule;
  if (rows.length === 0) {
    return {
      check: null,
      problems: [problem('payoutScheduleMissing', 'payoutSchedule', 'Not filled in yet.')],
      presetId: null,
      valid: null,
    };
  }
  const check = validatePayoutSchedule(
    rows.map((row) => row.shareText),
    playerCount,
  );
  const problems: Problem[] = [];
  if (check.tooManyPlaces) {
    const { paidPlaces, playerCount: players } = check.tooManyPlaces;
    problems.push(problem('tooManyPaidPlaces', 'payoutSchedule', tooManyPlacesMessage(paidPlaces, players)));
  }
  check.fields.forEach((field, index) => {
    if (field.error) problems.push(problem(SHARE_CODES[field.error.code], shareFieldKey(rows[index].id), field.error.message));
  });
  if (check.total.kind === 'under' || check.total.kind === 'over') {
    problems.push(
      problem('payoutTotalNotHundred', 'payoutSchedule', `Total is ${formatSharePercent(check.total.total)}, needs 100%.`),
    );
  }
  const presetId = schedule.presetId ?? null;
  return {
    check,
    problems,
    presetId,
    valid: check.schedule.valid
      ? { shares: check.schedule.shares, presetId, name: presetId ? payoutPreset(presetId).name : 'Custom' }
      : null,
  };
}

/**
 * The step's problems as the preview's Setup incomplete card words them: share problems name their
 * place ("2nd place: Enter a percentage."). The first one is the card's reason.
 */
export function payoutBlockerProblems(schedule: PayoutScheduleDraft, problems: readonly Problem[]): Problem[] {
  return problems.map((p) => {
    const index = schedule.rows.findIndex((row) => shareFieldKey(row.id) === p.field);
    return index < 0 ? p : { ...p, message: `${placeLabel(index + 1)} place: ${p.message}` };
  });
}
