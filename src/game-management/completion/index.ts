/**
 * Completing a game (Calculate Payments), its Payments, and Reopen. The operations and reads
 * returned here become part of `app.play`; History is `games.history()`.
 */
import type { GameDocument, PlayRecord, WorkingLocation } from '../core/documents';
import { type Accepted, type NeedsConfirmation, type Rejected, rejected } from '../core/results';
import type { Runtime } from '../core/runtime';
import { findGame, withGame } from '../planning/draft';
import { COMPLETION_MODES, type StartedGame } from './modes';
import { buildPaymentsView, settle } from './settlement';
import type { CalculatePaymentsConfirmation, PaymentsView, ReopenConfirmation } from './types';

export type CalculatePaymentsCode = 'gameNotFound' | 'notInProgress' | 'gameCompleted' | 'notReady';
export type CalculatePaymentsResult =
  | Accepted<{ location: WorkingLocation }>
  | NeedsConfirmation<CalculatePaymentsConfirmation>
  | Rejected<CalculatePaymentsCode>;

export type ReopenCode = 'gameNotFound' | 'notCompleted';
export type ReopenResult = Accepted<{ location: WorkingLocation }> | NeedsConfirmation<ReopenConfirmation> | Rejected<ReopenCode>;

/** The game, if it is Completed with its settlement. */
export function completedGame(game: GameDocument | undefined): (StartedGame & { completion: NonNullable<GameDocument['completion']> }) | null {
  if (!game || game.phase !== 'completed' || !game.play || !game.completion) return null;
  return game as StartedGame & { completion: NonNullable<GameDocument['completion']> };
}

export function createCompletionOperations(rt: Runtime) {
  return {
    /**
     * Calculate Payments. Without `confirmed` returns `needsConfirmation` with what Calculate
     * Payments? shows and changes nothing; `rejected notReady` with the one reason while results are
     * incomplete or do not add up. Confirmed (validated again now): allocates every final result to
     * whole cents, stores the balances and the direct payments with the finishing time and makes the
     * game Completed, in one commit; the location becomes its Payments.
     */
    async calculatePayments(gameId: string, options: { confirmed?: boolean } = {}): Promise<CalculatePaymentsResult> {
      const state = rt.state();
      const game = findGame(state, gameId);
      if (!game) return rejected('gameNotFound', 'This game no longer exists.');
      if (game.phase === 'completed') return rejected('gameCompleted', 'Payments are already calculated for this game.');
      if (game.phase !== 'inProgress' || !game.play) return rejected('notInProgress', 'This game is not in progress.');
      const started = game as StartedGame;
      const evaluation = COMPLETION_MODES[game.mode].evaluate(started);
      if (!evaluation.ready) return rejected('notReady', evaluation.reason);
      if (!options.confirmed) return { status: 'needsConfirmation', confirmation: evaluation.confirmation };

      const completion = settle(started, evaluation.finalResults, rt.now().toISOString());
      const play: PlayRecord = { ...started.play };
      delete play.reopenedAt;
      const next: GameDocument = { ...game, phase: 'completed', play, completion };
      const location: WorkingLocation = { kind: 'payments', gameId };
      await rt.apply({ ...withGame(state, next), location });
      return { status: 'accepted', location };
    },

    /**
     * Reopen (⋯, Completed only). Without `confirmed` returns `needsConfirmation` and changes
     * nothing. Confirmed: the game is In progress again with every record kept, the stored
     * settlement and finishing time withdrawn and the reopened mark set; the location becomes its
     * Results.
     */
    async reopen(gameId: string, options: { confirmed?: boolean } = {}): Promise<ReopenResult> {
      const state = rt.state();
      const game = findGame(state, gameId);
      if (!game) return rejected('gameNotFound', 'This game no longer exists.');
      if (!completedGame(game)) return rejected('notCompleted', 'Only a completed game can be reopened.');
      if (!options.confirmed) return { status: 'needsConfirmation', confirmation: { kind: 'reopen', mode: game.mode } };

      const next: GameDocument = { ...game, phase: 'inProgress', play: { ...game.play!, reopenedAt: rt.now().toISOString() } };
      delete next.completion;
      const location: WorkingLocation = { kind: 'results', gameId };
      await rt.apply({ ...withGame(state, next), location });
      return { status: 'accepted', location };
    },

    /** The Completed Payments tab; `null` unless the game is Completed. */
    getPayments(gameId: string): PaymentsView | null {
      const game = findGame(rt.state(), gameId);
      return rt.memo(`completion.payments:${gameId}`, [game], () => {
        const completed = completedGame(game);
        return completed ? buildPaymentsView(completed, completed.completion) : null;
      });
    },
  };
}
