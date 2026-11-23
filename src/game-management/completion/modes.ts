/**
 * What completion needs from each game mode. Calculate Payments, the stored settlement, Payments,
 * History and Reopen are the same for every mode; only these pieces differ:
 *
 * - `evaluate`: whether the game is ready to finish (else the one reason) and, if so, each
 *   participant's final monetary result in whole cents (cash: allocated chip value; tournament:
 *   payout by finishing place) and what Calculate Payments? shows.
 * - `balanceDetails`: the place badge and supporting lines of a Balances row.
 * - `historyFacts`: the summary on the History card.
 *
 * Tournament completion (ticket #28) replaces `TOURNAMENT` below; nothing else has to change.
 */
import { formatEur, formatSignedEur } from '@/domain/money';
import { allocateCashResults } from '@/domain/settlement';
import type { Cents, GameMode } from '@/domain/types';

import type { CompletionRecord, GameDocument, PlayRecord, SettledPlayer } from '../core/documents';
import { formatCount } from '../shared/numbers';
import { mixValue, resultOf } from '../play/ledger';
import { contributionsOf } from '../play/results/shared';
import { buildResultsView } from '../play/results/status';
import type { CalculatePaymentsConfirmation, HistoryFact } from './types';

/** A started game (In progress or Completed): it has its play record. */
export type StartedGame = GameDocument & { play: PlayRecord };

/** One participant's final monetary result, in joining order. */
export interface FinalResult {
  participantId: string;
  finalResult: Cents;
}

export type Evaluation =
  | { ready: true; confirmation: CalculatePaymentsConfirmation; finalResults: readonly FinalResult[] }
  /** `reason`: the one thing to fix first, e.g. "Count everyone first." */
  | { ready: false; reason: string };

export interface CompletionMode {
  evaluate(game: StartedGame): Evaluation;
  balanceDetails(
    game: StartedGame,
    player: SettledPlayer,
  ): { placeLabel: string | null; placeHighlight: boolean; lines: readonly string[] };
  historyFacts(game: StartedGame, completion: CompletionRecord): readonly HistoryFact[];
}

export function paymentsCountText(count: number): string {
  return `${formatCount(count)} ${count === 1 ? 'payment' : 'payments'}`;
}

const CASH: CompletionMode = {
  evaluate(game) {
    const { play } = game;
    const rate = play.terms.cashRate;
    if (!rate) return { ready: false, reason: 'This game has no cash rate.' };
    // One source of truth for "adds up": the same accounting status Results shows.
    const view = buildResultsView(game);
    if (!view.calculatePayments.available) return { ready: false, reason: view.calculatePayments.reason };
    if (view.status.kind !== 'addsUp') return { ready: false, reason: 'Count everyone first.' };
    const total = play.roster.reduce((sum, p) => sum + contributionsOf(play, p.id), 0);
    const allocated = allocateCashResults(
      rate,
      play.roster.map((p) => ({ id: p.id, finalUnits: mixValue(resultOf(play, p.id)!.mix) })),
      total,
    );
    return {
      ready: true,
      confirmation: { kind: 'calculatePayments', readyLine: view.status.description, facts: [] },
      finalResults: allocated.map((a) => ({ participantId: a.id, finalResult: a.finalResult })),
    };
  },

  balanceDetails(_game, player) {
    return {
      placeLabel: null,
      placeHighlight: false,
      lines: [`Final result ${formatEur(player.finalResult)}`, `Buy-ins ${formatEur(player.contributions)}`],
    };
  },

  historyFacts(game, completion) {
    const buyIns = completion.players.reduce((sum, p) => sum + p.contributions, 0);
    const facts: HistoryFact[] = [
      { label: 'Buy-ins', value: formatEur(buyIns) },
      { value: completion.payments.length === 0 ? 'No payments needed' : paymentsCountText(completion.payments.length) },
    ];
    // The biggest winner; equal balances go to the earlier-joined player.
    const top = completion.players.reduce<SettledPlayer | null>(
      (best, p) => (p.balance > 0 && (!best || p.balance > best.balance) ? p : best),
      null,
    );
    const name = top && game.play.roster.find((p) => p.id === top.participantId)?.name;
    if (top && name) facts.push({ label: 'Top', value: `${name} ${formatSignedEur(top.balance)}` });
    return facts;
  },
};

/** Placeholder until tournament completion (ticket #28): never ready. */
const TOURNAMENT: CompletionMode = {
  evaluate: () => ({ ready: false, reason: 'Tournament Payments aren’t available yet.' }),
  balanceDetails: (_game, player) => ({
    placeLabel: null,
    placeHighlight: false,
    lines: [
      player.finalResult > 0 ? `Payout ${formatEur(player.finalResult)}` : 'No payout',
      `Buy-ins ${formatEur(player.contributions)}`,
    ],
  }),
  historyFacts: (_game, completion) => [
    { label: 'Prize pool', value: formatEur(completion.players.reduce((sum, p) => sum + p.contributions, 0)) },
    { value: completion.payments.length === 0 ? 'No payments needed' : paymentsCountText(completion.payments.length) },
  ],
};

export const COMPLETION_MODES: Readonly<Record<GameMode, CompletionMode>> = { cash: CASH, tournament: TOURNAMENT };
