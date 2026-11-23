/**
 * Planning draft defaults, wizard step order and helpers for changing one game immutably.
 */
import type { GameMode } from '@/domain/types';

import type { AppState, GameDocument, PlanningDraft, StepId, WizardState } from '../core/documents';
import { type GameAccessCode, type Rejected, rejected } from '../core/results';

/** The approved defaults. New-game buy-in is blank. */
export const DEFAULT_DEPTH_BB = 100;
export const DEFAULT_COVERAGE = 4;

export function newPlanningDraft(): PlanningDraft {
  return {
    participants: [],
    chipSet: { rows: [], sourceTemplateId: null },
    settings: {
      buyInText: '',
      depthText: String(DEFAULT_DEPTH_BB),
      preference: 'fewer',
      coverageText: String(DEFAULT_COVERAGE),
      reserve: { mode: 'automatic' },
    },
    payoutSchedule: { rows: [] },
    wizard: {
      // Choosing the mode creates the game and moves on to Players.
      lastStep: 'players',
      reachedSteps: ['mode', 'players'],
      returnToPreview: false,
      editedFields: [],
      continueAttemptedSteps: [],
    },
  };
}

const CASH_STEPS: readonly StepId[] = ['mode', 'players', 'chipSet', 'settings', 'preview'];
const TOURNAMENT_STEPS: readonly StepId[] = ['mode', 'players', 'chipSet', 'settings', 'payouts', 'preview'];

/** The wizard steps of a mode, in order. */
export function stepsForMode(mode: GameMode): readonly StepId[] {
  return mode === 'cash' ? CASH_STEPS : TOURNAMENT_STEPS;
}

export const STEP_TITLES: Readonly<Record<StepId, string>> = {
  mode: 'Choose mode',
  players: 'Players',
  chipSet: 'Chip set',
  settings: 'Game settings',
  payouts: 'Payout schedule',
  preview: 'Distribution preview',
};

/** Automatic chip reserve: half the roster, rounded up. */
export function automaticReserve(rosterSize: number): number {
  return Math.ceil(rosterSize / 2);
}

export type GameAccess = { ok: true; game: GameDocument } | { ok: false; rejection: Rejected<GameAccessCode> };

export function findGame(state: AppState, gameId: string): GameDocument | undefined {
  return Object.prototype.hasOwnProperty.call(state.games, gameId) ? state.games[gameId] : undefined;
}

/** The game, if it exists and its setup is editable (Planning). */
export function planningGame(state: AppState, gameId: string): GameAccess {
  const game = findGame(state, gameId);
  if (!game) return { ok: false, rejection: rejected('gameNotFound', 'This game no longer exists.') };
  if (game.phase !== 'planning') {
    return {
      ok: false,
      rejection: rejected(
        'setupLocked',
        'This game has started, so its setup is locked. Use Return to Planning to change it.',
      ),
    };
  }
  return { ok: true, game };
}

export function withGame(state: AppState, game: GameDocument): AppState {
  return { ...state, games: { ...state.games, [game.id]: game } };
}

export function withDraft(game: GameDocument, change: (draft: PlanningDraft) => PlanningDraft): GameDocument {
  return { ...game, planning: change(game.planning) };
}

export function withWizard(draft: PlanningDraft, change: Partial<WizardState>): PlanningDraft {
  return { ...draft, wizard: { ...draft.wizard, ...change } };
}

export function markEdited(draft: PlanningDraft, field: string): PlanningDraft {
  if (draft.wizard.editedFields.includes(field)) return draft;
  return withWizard(draft, { editedFields: [...draft.wizard.editedFields, field] });
}

export function withoutEdited(draft: PlanningDraft, fields: readonly string[]): PlanningDraft {
  const remaining = draft.wizard.editedFields.filter((field) => !fields.includes(field));
  return remaining.length === draft.wizard.editedFields.length ? draft : withWizard(draft, { editedFields: remaining });
}

export function addReached(reached: readonly StepId[], step: StepId): StepId[] {
  return reached.includes(step) ? [...reached] : [...reached, step];
}
