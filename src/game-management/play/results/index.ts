/**
 * Cash-game final chip counts, results and accounting status.
 * The operations and reads returned here become part of `app.play`.
 */
import type { Runtime } from '../../core/runtime';
import { findGame } from '../../planning/draft';
import { createCountOperations } from './count';
import { buildCashPlayerView } from './player';
import { cashGame, cashParticipant } from './shared';
import { buildResultsView } from './status';
import type { CashPlayerView, CashResultsView } from './types';

export function createResultOperations(rt: Runtime) {
  return {
    /**
     * The cash-game Results tab: accounting status, one row per player in joining order and
     * whether Calculate Payments is available. `null` unless the game is an In progress cash game.
     */
    getResults(gameId: string): CashResultsView | null {
      const game = findGame(rt.state(), gameId);
      return rt.memo(`play.results:${gameId}`, [game], () => {
        const started = cashGame(game);
        return started ? buildResultsView(started) : null;
      });
    },

    /** One participant's cash player page; `null` unless an In progress cash game with this participant. */
    getCashPlayer(gameId: string, participantId: string): CashPlayerView | null {
      const game = findGame(rt.state(), gameId);
      return rt.memo(`play.cashPlayer:${gameId}:${participantId}`, [game], () => {
        const found = cashParticipant(rt.state(), gameId, participantId);
        return found.ok ? buildCashPlayerView(found.access) : null;
      });
    },

    ...createCountOperations(rt),
  };
}
