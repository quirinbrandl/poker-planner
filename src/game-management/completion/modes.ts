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
 */
import { formatEur, formatSignedEur } from '@/domain/money';
import { placeLabel, prizeAmounts } from '@/domain/payouts';
import { allocateCashResults } from '@/domain/settlement';
import type { Cents, GameMode } from '@/domain/types';

import type { CompletionRecord, GameDocument, PlayRecord, SettledPlayer } from '../core/documents';
import { formatCount } from '../shared/numbers';
import { eliminationOrder, mixValue, resultOf } from '../play/ledger';
import { contributionsOf } from '../play/results/shared';
import { buildResultsView } from '../play/results/status';
import { placeOf, plural, standing } from '../play/tournament/standing';
import { CALCULATE_BLOCKED_MESSAGE } from '../play/tournament/views';
import type { CalculatePaymentsConfirmation, HistoryFact } from './types';

/** A started game (In progress or Completed): it has its play record. */
export type StartedGame = GameDocument & { play: PlayRecord };

/** One participant's final monetary result, in joining order. */
export interface FinalResult {
  participantId: string;
  finalResult: Cents;
  /** Tournaments: the finishing place the payout belongs to (stored with the settlement). */
  place?: number;
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

/**
 * Tournaments: ready only with a complete finishing order (exactly N − 1 distinct eliminations of
 * participants and one derived winner). Each participant's final monetary result is the payout of
 * their place from the whole prize pool (every buy-in, late entry and rebuy): shares floored to
 * cents, leftover cents from 1st place down, unpaid places zero. Chip counts are never used.
 */
const TOURNAMENT: CompletionMode = {
  evaluate(game) {
    const { play } = game;
    const schedule = play.terms.payoutSchedule;
    if (!schedule) return { ready: false, reason: 'This tournament has no payout schedule.' };
    const order = eliminationOrder(play);
    const roster = new Set(play.roster.map((p) => p.id));
    if (new Set(order).size !== order.length || order.some((id) => !roster.has(id))) {
      return { ready: false, reason: 'The finishing order is not valid. Check it in Edit order.' };
    }
    const s = standing(play, schedule);
    if (!s.winner || order.length !== s.size - 1) return { ready: false, reason: CALCULATE_BLOCKED_MESSAGE };
    if (schedule.shares.length > s.size) return { ready: false, reason: 'There are more paid places than players.' };
    const amounts = prizeAmounts(s.prizePool, schedule.shares, s.size);
    const finalResults = play.roster.map((p) => {
      const place = placeOf(s, p.id)!;
      return { participantId: p.id, finalResult: amounts[place - 1], place };
    });
    return {
      ready: true,
      confirmation: {
        kind: 'calculatePayments',
        readyLine: `${s.winner.name} wins · all ${plural(order.length, 'elimination')} recorded`,
        facts: [
          { label: 'Prize pool', value: formatEur(s.prizePool) },
          ...schedule.shares.map((_, index) => {
            const holder = play.roster.find((p) => placeOf(s, p.id) === index + 1)!;
            return { label: `${placeLabel(index + 1)} · ${holder.name}`, value: formatEur(amounts[index]) };
          }),
        ],
      },
      finalResults,
    };
  },

  balanceDetails(_game, player) {
    return {
      placeLabel: player.place !== undefined ? placeLabel(player.place) : null,
      placeHighlight: player.place === 1,
      lines: [
        player.finalResult > 0 ? `Payout ${formatEur(player.finalResult)}` : 'No payout',
        `Buy-ins ${formatEur(player.contributions)}`,
      ],
    };
  },

  historyFacts(game, completion) {
    const facts: HistoryFact[] = [
      { label: 'Prize pool', value: formatEur(completion.players.reduce((sum, p) => sum + p.contributions, 0)) },
      { value: completion.payments.length === 0 ? 'No payments needed' : paymentsCountText(completion.payments.length) },
    ];
    const winner = completion.players.find((p) => p.place === 1);
    const name = winner && game.play.roster.find((p) => p.id === winner.participantId)?.name;
    if (name) facts.push({ label: 'Winner', value: name });
    return facts;
  },
};

export const COMPLETION_MODES: Readonly<Record<GameMode, CompletionMode>> = { cash: CASH, tournament: TOURNAMENT };
