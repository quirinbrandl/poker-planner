/**
 * Return to Planning: the separate, confirmed reset of an In progress game. Clears every play record
 * and issuance and reopens the Planning draft (with the current roster) on Distribution preview.
 */
import type { GameDocument, PlanningDraft, WorkingLocation } from '../core/documents';
import { type Accepted, type NeedsConfirmation, type Rejected, rejected } from '../core/results';
import type { Runtime } from '../core/runtime';
import { addReached, findGame, withGame, withWizard } from '../planning/draft';

/** What the Return to Planning? popup shows. */
export interface ReturnToPlanningConfirmation {
  kind: 'returnToPlanning';
  clears: {
    rebuys: number;
    /** Final results (cash-game counts, tournament eliminations) recorded so far. */
    results: number;
    /** Every stack handed out so far (starting stacks, rebuys, late entries). */
    handedOutStacks: number;
    /** "2 rebuys · 6 results · all handed-out stacks" (zero parts omitted). */
    text: string;
  };
  keeps: {
    players: number;
    /** Tournaments keep their payout schedule. */
    payoutSchedule: boolean;
    /** "6 players · buy-ins · settings" (" · payout schedule" in tournaments). */
    text: string;
  };
  /** "Collect all chips. You’ll hand out new stacks after Start." */
  note: string;
}

export type ReturnToPlanningCode = 'gameNotFound' | 'notInProgress' | 'gameCompleted';
export type ReturnToPlanningResult =
  | Accepted<{ location: WorkingLocation }>
  | NeedsConfirmation<ReturnToPlanningConfirmation>
  | Rejected<ReturnToPlanningCode>;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function confirmation(game: GameDocument): ReturnToPlanningConfirmation {
  const play = game.play!;
  const rebuys = play.issuances.filter((i) => i.kind === 'rebuy').length;
  const results = 0;
  const players = play.roster.length;
  const payoutSchedule = game.mode === 'tournament';
  const clears = [rebuys > 0 ? plural(rebuys, 'rebuy') : null, results > 0 ? plural(results, 'result') : null, 'all handed-out stacks'];
  return {
    kind: 'returnToPlanning',
    clears: {
      rebuys,
      results,
      handedOutStacks: play.issuances.length,
      text: clears.filter((part): part is string => part !== null).join(' · '),
    },
    keeps: {
      players,
      payoutSchedule,
      text: [plural(players, 'player'), 'buy-ins', 'settings', ...(payoutSchedule ? ['payout schedule'] : [])].join(' · '),
    },
    note: 'Collect all chips. You’ll hand out new stacks after Start.',
  };
}

/** The Planning draft after the reset: the current roster, everything else as it was at Start. */
function reopenedDraft(game: GameDocument): PlanningDraft {
  const roster = game.play!.roster.map(({ id, name, savedPlayerId }) => ({ id, name, savedPlayerId }));
  const draft: PlanningDraft = { ...game.planning, participants: roster };
  return withWizard(draft, {
    lastStep: 'preview',
    reachedSteps: addReached(draft.wizard.reachedSteps, 'preview'),
    returnToPreview: false,
  });
}

export async function returnToPlanning(
  rt: Runtime,
  gameId: string,
  options: { confirmed?: boolean },
): Promise<ReturnToPlanningResult> {
  const state = rt.state();
  const game = findGame(state, gameId);
  if (!game) return rejected('gameNotFound', 'This game no longer exists.');
  if (game.phase === 'completed') {
    return rejected('gameCompleted', 'This game is completed. Reopen it before returning to Planning.');
  }
  if (game.phase !== 'inProgress' || !game.play) return rejected('notInProgress', 'This game is already in Planning.');
  if (!options.confirmed) return { status: 'needsConfirmation', confirmation: confirmation(game) };

  const next: GameDocument = { ...game, phase: 'planning', planning: reopenedDraft(game) };
  delete next.play;
  const location: WorkingLocation = { kind: 'planning', gameId, step: 'preview' };
  await rt.apply({ ...withGame(state, next), location });
  return { status: 'accepted', location };
}
