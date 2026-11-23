/**
 * Late entry: a saved player joins an In progress game under its started terms with a fully
 * qualifying stack (never reduced coverage). Participant, contribution and issuance are recorded
 * together, or nothing is.
 */
import { formatEur } from '@/domain/money';

import type { AppState, GameDocument, IssuanceRecord, PlayRecord, RosterEntry, SavedPlayer } from '../../core/documents';
import { problem } from '../../core/problems';
import { rejected, type Rejected } from '../../core/results';
import type { Runtime } from '../../core/runtime';
import { findGame, withGame } from '../../planning/draft';
import { byName, nameKey } from '../../shared/names';
import { formatCount } from '../../shared/numbers';
import { handoutStack, issuedLine, prizePoolFacts, proposeLaterStack, reserveAfterView, reserveNote, counts, sameCounts } from './allocate';
import { inProgressGame, PROPOSAL_CHANGED_MESSAGE } from './rebuy';
import type {
  AddLatePlayerResult,
  AddPlayerScreenView,
  EntryAcceptance,
  EntryPopupData,
  EntryProposalResult,
  EntryRequestCode,
} from './types';

const TARGET_USED = 'More players can join when another fully qualifying stack is possible.';

type StartedGame = GameDocument & { play: PlayRecord };

/** Whether `player` cannot join `play` again: same saved player, or the same name, already in the game. */
function rosterClash(play: PlayRecord, player: SavedPlayer): Rejected<'alreadyInGame' | 'nameTakenInGame'> | null {
  const same = play.roster.find((p) => p.savedPlayerId === player.id);
  if (same) return rejected('alreadyInGame', `${same.name} is already in this game.`);
  const clash = play.roster.find((p) => nameKey(p.name) === nameKey(player.name));
  if (clash) {
    const message = `This game already has a player named “${clash.name}”. Use a distinguishing name.`;
    return rejected('nameTakenInGame', message, [problem('duplicateName', 'name', message)]);
  }
  return null;
}

export function buildAddPlayer(game: StartedGame, savedPlayers: readonly SavedPlayer[]): AddPlayerScreenView {
  const { terms } = game.play;
  return {
    terms: {
      buyInText: formatEur(terms.buyIn),
      stackText: `${formatCount(terms.stackValue)} chip units`,
      blindsText: `${formatCount(terms.blinds.small)} / ${formatCount(terms.blinds.big)}`,
    },
    candidates: [...savedPlayers].sort(byName).map((player) => ({
      savedPlayerId: player.id,
      name: player.name,
      inGame: rosterClash(game.play, player) !== null,
    })),
  };
}

/** Add player's data; `null` unless the game is In progress. */
export function getAddPlayer(rt: Runtime, gameId: string): AddPlayerScreenView | null {
  const state = rt.state();
  const access = inProgressGame(findGame(state, gameId));
  if (!access.ok) return null;
  const game = access.game;
  return rt.memo(`issuance.addPlayer:${gameId}`, [game, state.savedPlayers], () => buildAddPlayer(game, state.savedPlayers));
}

function computeEntryProposal(game: StartedGame, player: SavedPlayer): EntryProposalResult {
  const { play } = game;
  const clash = rosterClash(play, player);
  if (clash) return clash;
  if (game.mode === 'tournament' && (play.eliminations?.length ?? 0) > 0) {
    return rejected('eliminationsRecorded', 'Late entry is closed while an elimination is recorded.');
  }
  const name = player.name;
  const declinedNotice = `${name} has not joined.`;
  const stack = proposeLaterStack(play, false);
  if (stack.kind === 'blocked') {
    return { ...rejected(stack.code, stack.message), blocked: { kind: 'blocked', name, reason: stack.reason }, declinedNotice };
  }
  if (stack.kind !== 'qualifying') throw new Error('Late entry never receives a reduced-coverage stack.');

  const extraFacts = prizePoolFacts(game);
  const popup: Extract<EntryPopupData, { kind: 'proposal' }> = {
    kind: 'proposal',
    name,
    stack: handoutStack(play, stack.mix),
    reserveAfter: reserveAfterView(stack.reserveAfter),
    initialContributionText: formatEur(play.terms.buyIn),
    reserveNote: reserveNote(play, stack, TARGET_USED),
    ...(extraFacts ? { extraFacts } : {}),
  };
  const acceptance: EntryAcceptance = { savedPlayerId: player.id, name, mix: counts(stack.mix), reserveAfter: stack.reserveAfter };
  return { status: 'needsConfirmation', confirmation: { kind: 'lateEntry', popup, acceptance, declinedNotice } };
}

function savedPlayer(state: AppState, savedPlayerId: string): SavedPlayer | undefined {
  return state.savedPlayers.find((p) => p.id === savedPlayerId);
}

/** The current late-entry proposal for a saved player. Records nothing. */
export function proposeEntry(rt: Runtime, gameId: string, savedPlayerId: string): EntryProposalResult {
  const state = rt.state();
  const access = inProgressGame(findGame(state, gameId));
  if (!access.ok) return access.rejection;
  const player = savedPlayer(state, savedPlayerId);
  if (!player) return rejected('savedPlayerNotFound', 'This saved player no longer exists.');
  const game = access.game;
  return rt.memo(`issuance.entry:${gameId}:${savedPlayerId}`, [game, player], () => computeEntryProposal(game, player));
}

/**
 * Admits the saved player exactly as reviewed: appends the participant (captured name, next joining
 * position), its buy-in and its stack in one commit. Rejected as changed if the proposal differs now.
 */
export async function addLatePlayer(rt: Runtime, gameId: string, acceptance: EntryAcceptance): Promise<AddLatePlayerResult> {
  const current = proposeEntry(rt, gameId, acceptance.savedPlayerId);
  if (current.status === 'rejected') {
    if ('blocked' in current) return rejected('proposalChanged', PROPOSAL_CHANGED_MESSAGE);
    return current as Rejected<EntryRequestCode>;
  }
  const proposed = current.confirmation.acceptance;
  if (
    proposed.name !== acceptance.name ||
    proposed.reserveAfter !== acceptance.reserveAfter ||
    !sameCounts(proposed.mix, acceptance.mix)
  ) {
    return rejected('proposalChanged', PROPOSAL_CHANGED_MESSAGE);
  }

  const state = rt.state();
  const game = findGame(state, gameId) as StartedGame;
  const { play } = game;
  const participant: RosterEntry = { id: rt.newId(), name: proposed.name.trim(), savedPlayerId: proposed.savedPlayerId, entry: 'lateEntry' };
  const issuance: IssuanceRecord = {
    id: rt.newId(),
    participantId: participant.id,
    kind: 'lateEntry',
    contribution: play.terms.buyIn,
    mix: play.terms.chipSet.map((d, i) => ({ value: d.value, count: proposed.mix[i] })),
    recordedAt: rt.now().toISOString(),
  };
  const next: GameDocument = {
    ...game,
    play: { ...play, roster: [...play.roster, participant], issuances: [...play.issuances, issuance] },
  };
  await rt.apply(withGame(state, next));
  return {
    status: 'accepted',
    participantId: participant.id,
    issuanceId: issuance.id,
    feedback: { title: `${participant.name} joined`, message: `${issuedLine(play)}.` },
  };
}
