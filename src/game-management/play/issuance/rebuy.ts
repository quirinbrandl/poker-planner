/**
 * Rebuys: a proposal from the current bank (fully qualifying, else for rebuys only the best
 * reduced-coverage stack, else blocked) and the issuance of exactly the proposal the host saw.
 */
import { formatEur } from '@/domain/money';

import type { GameDocument, IssuanceRecord, PlayRecord } from '../../core/documents';
import { rejected, type Rejected } from '../../core/results';
import type { Runtime } from '../../core/runtime';
import { findGame, withGame } from '../../planning/draft';
import { isEliminated, issuancesOf, resultOf, totalContributions } from '../ledger';
import {
  counts,
  handoutStack,
  issuedLine,
  prizePoolFacts,
  proposeLaterStack,
  reserveAfterView,
  reserveNote,
  sameCounts,
} from './allocate';
import type {
  IssueRebuyResult,
  RebuyAcceptance,
  RebuyPopupData,
  RebuyProposalResult,
  RebuyRequestCode,
} from './types';

export const PROPOSAL_CHANGED_MESSAGE = 'The bank changed since this was proposed. Review it again.';
const TARGET_USED = 'More rebuys are still allowed when another stack is possible.';

type StartedGame = GameDocument & { play: PlayRecord };

/** The In progress game, or why stacks cannot be issued in it. */
export function inProgressGame(
  game: GameDocument | undefined,
): { ok: true; game: StartedGame } | { ok: false; rejection: Rejected<'gameNotFound' | 'notInProgress'> } {
  if (!game) return { ok: false, rejection: rejected('gameNotFound', 'This game no longer exists.') };
  if (game.phase !== 'inProgress' || !game.play) {
    const message =
      game.phase === 'completed' ? 'This game is completed. Reopen it to change its records.' : 'This game is not in progress.';
    return { ok: false, rejection: rejected('notInProgress', message) };
  }
  return { ok: true, game: game as StartedGame };
}

function computeRebuyProposal(game: StartedGame, participantId: string): RebuyProposalResult {
  const { play } = game;
  const participant = play.roster.find((p) => p.id === participantId);
  if (!participant) return rejected('participantNotFound', 'This player is not in the game.');
  const name = participant.name;
  if (resultOf(play, participantId)) {
    return rejected(
      'finishedPlaying',
      `${name} has a confirmed result. To play again, use Return to play on ${name}’s page first.`,
    );
  }
  if (game.mode === 'tournament' && isEliminated(play, participantId)) {
    return rejected('eliminated', `${name} is eliminated. To play again, undo the elimination first.`);
  }

  const stack = proposeLaterStack(play, true);
  if (stack.kind === 'blocked') {
    const code = stack.code === 'coverageShortage' ? 'unsuitableDenominations' : stack.code;
    return {
      ...rejected(code, stack.message),
      blocked: { kind: 'blocked', playerId: participantId, playerName: name, message: stack.message },
    };
  }

  const newTotalCents = totalContributions(issuancesOf(play, participantId)) + play.terms.buyIn;
  const reserveAfter = stack.kind === 'qualifying' ? stack.reserveAfter : 0;
  const required = play.terms.coverage;
  const extraFacts = prizePoolFacts(game);
  const popup: Extract<RebuyPopupData, { kind: 'proposal' }> = {
    kind: 'proposal',
    playerId: participantId,
    playerName: name,
    stack: handoutStack(play, stack.mix),
    reducedCoverage: stack.kind === 'reducedCoverage' ? { achieved: stack.achievedCoverage, required } : null,
    reserveAfter: reserveAfterView(reserveAfter),
    priceText: formatEur(play.terms.buyIn),
    newTotalText: formatEur(newTotalCents),
    reserveNote: reserveNote(play, stack, TARGET_USED),
    ...(extraFacts ? { extraFacts } : {}),
  };
  const acceptance: RebuyAcceptance = {
    participantId,
    mix: counts(stack.mix),
    newTotalCents,
    reserveAfter,
    acceptedCoverage: stack.kind === 'reducedCoverage' ? stack.achievedCoverage : null,
  };
  return { status: 'needsConfirmation', confirmation: { kind: 'rebuy', popup, acceptance } };
}

/** The current rebuy proposal for a participant. Records nothing; memoized while the game is unchanged. */
export function proposeRebuy(rt: Runtime, gameId: string, participantId: string): RebuyProposalResult {
  const access = inProgressGame(findGame(rt.state(), gameId));
  if (!access.ok) return access.rejection;
  const game = access.game;
  return rt.memo(`issuance.rebuy:${gameId}:${participantId}`, [game], () => computeRebuyProposal(game, participantId));
}

function sameAcceptance(a: RebuyAcceptance, b: RebuyAcceptance): boolean {
  return (
    a.participantId === b.participantId &&
    sameCounts(a.mix, b.mix) &&
    a.newTotalCents === b.newTotalCents &&
    a.reserveAfter === b.reserveAfter &&
    a.acceptedCoverage === b.acceptedCoverage
  );
}

/**
 * Issues the rebuy the host reviewed. Recomputes the proposal from the current records; if it no
 * longer matches `acceptance` (bank changed, already issued, …) nothing is recorded.
 */
export async function issueRebuy(rt: Runtime, gameId: string, acceptance: RebuyAcceptance): Promise<IssueRebuyResult> {
  const current = proposeRebuy(rt, gameId, acceptance.participantId);
  if (current.status === 'rejected') {
    if ('blocked' in current) return rejected('proposalChanged', PROPOSAL_CHANGED_MESSAGE);
    return current as Rejected<RebuyRequestCode>;
  }
  const proposed = current.confirmation.acceptance;
  if (!sameAcceptance(proposed, acceptance)) {
    if (proposed.acceptedCoverage !== null && sameAcceptance(proposed, { ...acceptance, acceptedCoverage: proposed.acceptedCoverage })) {
      return rejected(
        'reducedCoverageNotAccepted',
        `This stack covers only ${proposed.acceptedCoverage} of the required blind payments. Accept the reduced coverage to issue it.`,
      );
    }
    return rejected('proposalChanged', PROPOSAL_CHANGED_MESSAGE);
  }

  const state = rt.state();
  const game = findGame(state, gameId) as StartedGame;
  const { play } = game;
  const issuance: IssuanceRecord = {
    id: rt.newId(),
    participantId: acceptance.participantId,
    kind: 'rebuy',
    contribution: play.terms.buyIn,
    mix: play.terms.chipSet.map((d, i) => ({ value: d.value, count: acceptance.mix[i] })),
    recordedAt: rt.now().toISOString(),
    ...(acceptance.acceptedCoverage !== null ? { reducedCoverage: acceptance.acceptedCoverage } : {}),
  };
  const next: GameDocument = { ...game, play: { ...play, issuances: [...play.issuances, issuance] } };
  await rt.apply(withGame(state, next));
  const popup = current.confirmation.popup;
  const coverage = popup.reducedCoverage
    ? ` · covers ${popup.reducedCoverage.achieved} of ${popup.reducedCoverage.required} blind payments`
    : '';
  return {
    status: 'accepted',
    participantId: acceptance.participantId,
    issuanceId: issuance.id,
    feedback: { title: `Rebuy issued for ${popup.playerName}`, message: `${issuedLine(play)}${coverage}.` },
  };
}
