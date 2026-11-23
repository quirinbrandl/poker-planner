/**
 * Validation derived from the raw Planning draft. Nothing here changes the draft.
 *
 * `validatePlan` is also the entry point for later work: it returns the parsed, validated plan
 * (`ValidPlan`) that distribution preview and Start consume once every step is valid.
 */
import { parseEurInput } from '@/domain/money';
import type { Cents, ChipDenomination, DistributionPreference, GameMode } from '@/domain/types';

import type { GameDocument, Participant, SettingsDraft, StepId } from '../core/documents';
import { type FieldKey, type Problem, problem } from '../core/problems';
import { type ChipRowsValidation, validateChipRows } from '../shared/chip-rows';
import { parseWholeNumber } from '../shared/numbers';
import { automaticReserve, stepsForMode } from './draft';
import { type PayoutStepValidation, type ValidPayoutSchedule, validatePayoutStep } from './payout-validation';

export const MIN_PLAYERS = 2;

export type StepStatus = 'notFilledIn' | 'needsAttention' | 'complete';

export const STEP_STATUS_LABELS: Readonly<Record<StepStatus, string>> = {
  notFilledIn: 'Not filled in',
  needsAttention: 'Needs attention',
  complete: 'Complete',
};

export interface SettingsValidation {
  buyIn: { problem: Problem | null; cents: Cents | null };
  depth: { problem: Problem | null; value: number | null };
  coverage: { problem: Problem | null; value: number | null };
  reserve: { problem: Problem | null; value: number | null };
  problems: readonly Problem[];
}

export function validateRoster(participants: readonly Participant[]): Problem[] {
  return participants.length < MIN_PLAYERS
    ? [problem('tooFewPlayers', 'roster', 'Add at least two players to continue.')]
    : [];
}

function wholeNumberField(
  text: string,
  field: FieldKey,
  minimum: number,
  copy: { missing: [Problem['code'], string]; notWhole: [Problem['code'], string]; belowMinimum?: [Problem['code'], string] },
): { problem: Problem | null; value: number | null } {
  const parsed = parseWholeNumber(text);
  if (!parsed.ok) {
    if (parsed.error === 'empty') return { problem: problem(copy.missing[0], field, copy.missing[1]), value: null };
    if (parsed.error === 'tooLarge') return { problem: problem('numberTooLarge', field, 'Enter a smaller number.'), value: null };
    return { problem: problem(copy.notWhole[0], field, copy.notWhole[1]), value: null };
  }
  if (parsed.value < minimum && copy.belowMinimum) {
    return { problem: problem(copy.belowMinimum[0], field, copy.belowMinimum[1]), value: null };
  }
  return { problem: null, value: parsed.value };
}

export function validateSettings(settings: SettingsDraft, rosterSize: number): SettingsValidation {
  let buyIn: SettingsValidation['buyIn'];
  const parsedBuyIn = parseEurInput(settings.buyInText);
  if (parsedBuyIn.ok) {
    buyIn =
      parsedBuyIn.cents > 0
        ? { problem: null, cents: parsedBuyIn.cents }
        : { problem: problem('buyInNotPositive', 'buyIn', 'Buy-in must be at least EUR 0.01.'), cents: null };
  } else {
    const [code, message] = {
      empty: ['buyInMissing', 'Enter the buy-in per player.'] as const,
      malformed: ['buyInMalformed', 'Enter an amount like 20 or 20.50.'] as const,
      tooManyDecimals: ['buyInTooManyDecimals', 'Use at most two decimal places (whole cents).'] as const,
    }[parsedBuyIn.error];
    buyIn = { problem: problem(code, 'buyIn', message), cents: null };
  }

  const depth = wholeNumberField(settings.depthText, 'depth', 1, {
    missing: ['depthMissing', 'Enter a starting stack in BB.'],
    notWhole: ['depthNotWholeNumber', 'Enter a whole number of BB.'],
    belowMinimum: ['depthBelowMinimum', 'Starting stack must be at least 1 BB.'],
  });
  const coverage = wholeNumberField(settings.coverageText, 'coverage', 1, {
    missing: ['coverageMissing', 'Enter the number of blind payments.'],
    notWhole: ['coverageNotWholeNumber', 'Enter a whole number of payments.'],
    belowMinimum: ['coverageBelowMinimum', 'Coverage must be at least 1 payment.'],
  });
  const reserve =
    settings.reserve.mode === 'automatic'
      ? { problem: null, value: automaticReserve(rosterSize) }
      : wholeNumberField(settings.reserve.text, 'reserve', 0, {
          missing: ['reserveMissing', 'Enter a number of stacks, or use automatic.'],
          notWhole: ['reserveNotWholeNumber', 'Enter a whole number of stacks (0 or more).'],
        });

  const problems = [buyIn.problem, depth.problem, coverage.problem, reserve.problem].filter(
    (p): p is Problem => p !== null,
  );
  return { buyIn, depth, coverage, reserve, problems };
}

export interface GameValidation {
  roster: Problem[];
  chipSet: ChipRowsValidation;
  settings: SettingsValidation;
  payouts: PayoutStepValidation;
  /** Problems of each step of the game's mode (Choose mode and preview have none of their own). */
  byStep: Readonly<Record<StepId, readonly Problem[]>>;
}

export function validateGame(game: GameDocument): GameValidation {
  const draft = game.planning;
  const roster = validateRoster(draft.participants);
  const chipSet = validateChipRows(draft.chipSet.rows);
  const settings = validateSettings(draft.settings, draft.participants.length);
  const payouts = validatePayoutStep(draft.payoutSchedule, draft.participants.length);
  return {
    roster,
    chipSet,
    settings,
    payouts,
    byStep: {
      mode: [],
      players: roster,
      chipSet: chipSet.problems,
      settings: settings.problems,
      payouts: game.mode === 'tournament' ? payouts.problems : [],
      preview: [],
    },
  };
}

/** Whether the host has put anything into a step yet. */
function hasInput(game: GameDocument, step: StepId): boolean {
  const draft = game.planning;
  switch (step) {
    case 'mode':
      return true;
    case 'players':
      return draft.participants.length > 0;
    case 'chipSet':
      return draft.chipSet.rows.length > 0;
    case 'settings':
      return (
        draft.settings.buyInText.trim() !== '' ||
        draft.wizard.editedFields.some((f) => ['buyIn', 'depth', 'coverage', 'reserve', 'preference'].includes(f)) ||
        draft.wizard.reachedSteps.includes('payouts') ||
        draft.wizard.reachedSteps.includes('preview')
      );
    case 'payouts':
      return draft.payoutSchedule.rows.length > 0;
    case 'preview':
      return draft.wizard.reachedSteps.includes('preview');
  }
}

export function stepStatuses(game: GameDocument, validation: GameValidation): Record<StepId, StepStatus> {
  const steps = stepsForMode(game.mode);
  const statuses = {} as Record<StepId, StepStatus>;
  for (const step of steps) {
    if (step === 'preview') continue;
    statuses[step] = !hasInput(game, step)
      ? 'notFilledIn'
      : validation.byStep[step].length > 0
        ? 'needsAttention'
        : 'complete';
  }
  const allComplete = steps.every((step) => step === 'preview' || statuses[step] === 'complete');
  statuses.preview = allComplete ? 'complete' : hasInput(game, 'preview') ? 'needsAttention' : 'notFilledIn';
  if (game.mode === 'cash') {
    // Dormant step: not shown, but give it a status so lookups never miss.
    statuses.payouts = hasInput(game, 'payouts') ? 'complete' : 'notFilledIn';
  }
  return statuses;
}

/** A fully validated plan, ready for distribution. */
export interface ValidPlan {
  mode: GameMode;
  /** Participant ids in joining order. */
  participantIds: string[];
  denominations: ChipDenomination[];
  buyIn: Cents;
  requestedDepthBb: number;
  preference: DistributionPreference;
  coverage: number;
  reserve: number;
  /** Tournament only (`null` in a cash game): the validated payout schedule. */
  payoutSchedule: ValidPayoutSchedule | null;
}

export function validatePlan(game: GameDocument): { plan: ValidPlan | null; validation: GameValidation } {
  const validation = validateGame(game);
  const { settings, chipSet } = validation;
  const valid = stepsForMode(game.mode).every((step) => validation.byStep[step].length === 0);
  if (!valid || !chipSet.denominations) return { plan: null, validation };
  return {
    validation,
    plan: {
      mode: game.mode,
      participantIds: game.planning.participants.map((p) => p.id),
      denominations: chipSet.denominations,
      buyIn: settings.buyIn.cents!,
      requestedDepthBb: settings.depth.value!,
      preference: game.planning.settings.preference,
      coverage: settings.coverage.value!,
      reserve: settings.reserve.value!,
      payoutSchedule: game.mode === 'tournament' ? validation.payouts.valid : null,
    },
  };
}
