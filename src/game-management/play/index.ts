/**
 * Everything the host can do and see while a game is In progress, plus completing it (Calculate
 * Payments), its Payments and Reopen.
 */
import { createCompletionOperations } from '../completion';
import { guardCompletedGames, readOnlyForCompletedGames } from '../completion/guard';
import type { Runtime } from '../core/runtime';
import { findGame } from '../planning/draft';
import { createIssuanceOperations } from './issuance';
import { createResultOperations } from './results';
import { returnToPlanning, type ReturnToPlanningResult } from './return-to-planning';
import { createTournamentOperations } from './tournament';
import { getPlayView, type PlayView } from './view';

export function createPlayApi(rt: Runtime) {
  // Completed games are read-only: every play operation below answers `rejected gameCompleted` for
  // them, and their writes to a Completed game never apply (see completion/guard.ts).
  const playRt = readOnlyForCompletedGames(rt);
  const recording = guardCompletedGames(rt, {
    ...createResultOperations(playRt),
    ...createIssuanceOperations(playRt),
    ...createTournamentOperations(playRt),
  });

  return {
    /** The In progress view of a game (Play, bank / reserve, locked Game details), or `null` unless In progress. */
    getView(gameId: string): PlayView | null {
      return getPlayView(rt, findGame(rt.state(), gameId));
    },

    /**
     * Return to Planning (⋯ game actions). Without `confirmed` returns `needsConfirmation` with what
     * the popup shows and changes nothing. Confirmed: clears every play record and issuance, keeps
     * the current roster, buy-in and all settings, and reopens Planning on Distribution preview.
     */
    returnToPlanning(gameId: string, options: { confirmed?: boolean } = {}): Promise<ReturnToPlanningResult> {
      return returnToPlanning(rt, gameId, options);
    },

    ...recording,
    ...createCompletionOperations(rt),
  };
}

export type PlayApi = ReturnType<typeof createPlayApi>;
