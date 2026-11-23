/**
 * The cash-game Results tab: accounting status and one row per player. Only confirmed results
 * count; drafts never do. Counted units are compared with cumulative issuance, never with the chip
 * set or the bank. While In progress every amount is exact (no cent allocation before Payments);
 * a Completed game shows the allocated cents of its stored settlement, read-only.
 */
import type { GameDocument, PlayRecord } from '../../core/documents';
import { formatCount } from '../../shared/numbers';
import { exactChipValue } from '@/domain/settlement';
import { formatExactEur } from '@/domain/money';
import { countDraftOf, countedUnits, cumulativeIssuedUnits, resultOf } from '../ledger';
import { allocatedWinLoss, contributionsOf, contributionText, plural, settledOf, unitsOf, winLoss } from './shared';
import type { CashResultsView, ResultsPlayerRow, ResultsStatus } from './types';

export function buildResultsView(game: GameDocument & { play: PlayRecord }): CashResultsView {
  const { play } = game;
  const rate = play.terms.cashRate!;
  const completion = game.phase === 'completed' ? (game.completion ?? null) : null;
  const players: ResultsPlayerRow[] = play.roster.map((participant) => {
    const result = resultOf(play, participant.id);
    const settled = settledOf(completion, participant.id);
    return {
      id: participant.id,
      name: participant.name,
      contributionText: contributionText(play, participant.id),
      state: result ? 'result' : countDraftOf(play, participant.id) ? 'countDraft' : 'uncounted',
      correctionDraft: !completion && result !== undefined && countDraftOf(play, participant.id) !== undefined,
      result: settled
        ? allocatedWinLoss(settled.balance)
        : result
          ? winLoss(unitsOf(result.mix), contributionsOf(play, participant.id), rate)
          : null,
    };
  });

  const total = play.roster.length;
  const uncounted = play.roster.filter((p) => !resultOf(play, p.id));
  const counted = total - uncounted.length;
  const units = countedUnits(play);
  const issued = cumulativeIssuedUnits(play);
  const difference = uncounted.length === 0 ? units - issued : null;

  let status: ResultsStatus;
  if (difference === null) {
    status = {
      kind: 'toCount',
      title: `${formatCount(uncounted.length)} still to count`,
      namesText: uncounted.map((p) => p.name).join(', '),
      counted,
      total,
    };
  } else if (difference !== 0) {
    const size = Math.abs(difference);
    const missing = difference < 0;
    status = {
      kind: missing ? 'missing' : 'tooMany',
      title: `${plural(size, 'chip unit')} ${missing ? 'missing' : 'too many'}`,
      description: `${formatExactEur(exactChipValue(size, rate))} · ${formatCount(units)} of ${formatCount(issued)} counted. Recount, or correct a result.`,
    };
  } else {
    status = { kind: 'addsUp', description: `All ${formatCount(total)} counted · ${plural(units, 'chip unit')}` };
  }

  const reason = completion
    ? 'Payments are already calculated.'
    : status.kind === 'toCount'
      ? 'Count everyone first.'
      : status.kind === 'missing'
        ? 'Find the missing chips first.'
        : status.kind === 'tooMany'
          ? 'Fix the extra chips first.'
          : null;

  return {
    gameId: game.id,
    phase: completion ? 'completed' : 'inProgress',
    reopened: !completion && play.reopenedAt !== undefined,
    status,
    players,
    accounting: { counted, total, countedUnits: units, issuedUnits: issued, difference },
    calculatePayments: reason === null ? { available: true, reason: null } : { available: false, reason },
  };
}
