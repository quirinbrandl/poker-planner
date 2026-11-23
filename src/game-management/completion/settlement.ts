/**
 * From final monetary results to the stored settlement, and the read models built from it.
 * Reads of a Completed game only format the stored record; they never recalculate.
 */
import { formatEur, formatSignedEur } from '@/domain/money';
import { playerBalances, settlePayments } from '@/domain/settlement';

import type { CompletionRecord, SettledPlayer } from '../core/documents';
import { contributionsOf } from '../play/results/shared';
import { COMPLETION_MODES, type FinalResult, paymentsCountText, type StartedGame } from './modes';
import type { BalanceDirection, HistoryGameView, PaymentsSummary, PaymentsView } from './types';

/**
 * The settlement of `finalResults` (one per participant, joining order): whole-cent balances
 * (final result − contributions, summing to zero) and the fewest direct payments settling them.
 */
export function settle(game: StartedGame, finalResults: readonly FinalResult[], finishedAt: string): CompletionRecord {
  const players: SettledPlayer[] = finalResults.map(({ participantId, finalResult }) => {
    const contributions = contributionsOf(game.play, participantId);
    return { participantId, finalResult, contributions, balance: finalResult - contributions };
  });
  const balances = playerBalances(
    players.map((p) => ({ id: p.participantId, finalResult: p.finalResult, contributions: p.contributions })),
  );
  const payments = settlePayments(balances).map(({ fromId, toId, amount }) => ({ fromId, toId, amount }));
  return { finishedAt, players, payments };
}

export function balanceDirection(cents: number): BalanceDirection {
  return cents > 0 ? 'gain' : cents < 0 ? 'loss' : 'even';
}

function nameOf(game: StartedGame, participantId: string): string {
  return game.play.roster.find((p) => p.id === participantId)?.name ?? '';
}

export function buildPaymentsView(game: StartedGame, completion: CompletionRecord): PaymentsView {
  const mode = COMPLETION_MODES[game.mode];
  const { payments } = completion;
  const summary: PaymentsSummary =
    payments.length === 0
      ? { kind: 'noPayments' }
      : {
          kind: 'payments',
          countText: paymentsCountText(payments.length),
          totalText: `${formatEur(payments.reduce((sum, p) => sum + p.amount, 0))} in total`,
          payments: payments.map((p, index) => ({
            id: `${index}:${p.fromId}:${p.toId}`,
            fromName: nameOf(game, p.fromId),
            toName: nameOf(game, p.toId),
            amountText: formatEur(p.amount),
          })),
        };
  return {
    gameId: game.id,
    mode: game.mode,
    finishedAt: completion.finishedAt,
    summary,
    balances: completion.players.map((player) => ({
      participantId: player.participantId,
      name: nameOf(game, player.participantId),
      ...mode.balanceDetails(game, player),
      balanceText: formatSignedEur(player.balance),
      direction: balanceDirection(player.balance),
    })),
  };
}

export function buildHistoryGame(game: StartedGame, completion: CompletionRecord): HistoryGameView {
  return {
    gameId: game.id,
    mode: game.mode,
    participantNames: game.play.roster.map((p) => p.name),
    createdAt: game.createdAt,
    finishedAt: completion.finishedAt,
    facts: COMPLETION_MODES[game.mode].historyFacts(game, completion),
  };
}
