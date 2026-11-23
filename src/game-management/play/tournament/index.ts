/**
 * Tournament eliminations and the finishing order.
 * The operations and reads returned here become part of `app.play`.
 *
 * One elimination order (`play.eliminations`, earliest first) is the only record: places, the sole
 * remaining winner, payouts and whether late entry is open are derived from it. Eliminations move
 * no chips, never touch contributions or the schedule, and never complete the game.
 */
import type { AppState, EliminationRecord, GameDocument, PlayRecord } from '../../core/documents';
import { type Accepted, type NeedsConfirmation, type Rejected, rejected } from '../../core/results';
import type { Runtime } from '../../core/runtime';
import { findGame, withGame } from '../../planning/draft';
import { eliminationOrder } from '../ledger';
import { getPlayView } from '../view';
import type {
  BackInData,
  OrderDraft,
  OrderEditorView,
  TournamentPlayerView,
  TournamentPlayView,
  TournamentResultsView,
} from './types';
import {
  buildBackIn,
  buildOrderEditor,
  buildPlay,
  buildPlayer,
  buildResults,
  type StartedTournament,
} from './views';

/** Codes every tournament operation can be rejected with. */
export type TournamentAccessCode = 'gameNotFound' | 'notInProgress' | 'gameCompleted' | 'notTournament';

export type RecordEliminationCode = TournamentAccessCode | 'notPlaying' | 'alreadyOut' | 'lastPlayer';
/** Accepted: the participant's finishing place (N for the first one out). */
export type RecordEliminationResult = Accepted<{ place: number }> | Rejected<RecordEliminationCode>;

export type RecordSameHandCode =
  | TournamentAccessCode
  | 'tooFewPlayers'
  | 'notPlaying'
  | 'alreadyOut'
  | 'lastPlayer'
  | 'stillInChanged';
export type RecordSameHandResult = Accepted | Rejected<RecordSameHandCode>;

export type SaveOrderCode = TournamentAccessCode | 'orderChanged' | 'invalidOrder';
export type SaveOrderResult = Accepted | Rejected<SaveOrderCode>;

/** What "<name> back in the game?" shows. */
export interface BackInConfirmation extends BackInData {
  kind: 'backInTheGame';
}
export type BackInCode = TournamentAccessCode | 'notPlaying' | 'notOut';
export type BackInResult = Accepted | NeedsConfirmation<BackInConfirmation> | Rejected<BackInCode>;

export const STILL_IN_CHANGED_MESSAGE = 'The players still in changed. Check them and try again.';
export const ORDER_CHANGED_MESSAGE = 'The order changed meanwhile. Nothing was saved.';

type Access =
  | { ok: true; state: AppState; game: StartedTournament }
  | { ok: false; rejection: Rejected<TournamentAccessCode> };

function asStartedTournament(game: GameDocument | undefined): StartedTournament | null {
  if (!game || game.mode !== 'tournament' || game.phase !== 'inProgress' || !game.play?.terms.payoutSchedule) return null;
  return game as StartedTournament;
}

function access(rt: Runtime, gameId: string): Access {
  const state = rt.state();
  const game = findGame(state, gameId);
  if (!game) return { ok: false, rejection: rejected('gameNotFound', 'This game no longer exists.') };
  if (game.mode !== 'tournament') return { ok: false, rejection: rejected('notTournament', 'This is not a tournament.') };
  if (game.phase === 'completed') {
    return { ok: false, rejection: rejected('gameCompleted', 'This game is completed. Reopen it to change results.') };
  }
  const started = asStartedTournament(game);
  if (!started) return { ok: false, rejection: rejected('notInProgress', 'This game has not started yet.') };
  return { ok: true, state, game: started };
}

function nameIn(play: PlayRecord, participantId: string): string | null {
  return play.roster.find((p) => p.id === participantId)?.name ?? null;
}

function withEliminations(state: AppState, game: StartedTournament, eliminations: EliminationRecord[]): AppState {
  const play: PlayRecord = { ...game.play, eliminations };
  if (eliminations.length === 0) delete play.eliminations;
  const next: GameDocument = { ...game, play };
  return withGame(state, next);
}

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => b[i] === x);

/** Pure draft edits: each returns a new draft (or the same one when nothing applies). */
function moveInDraft(draft: OrderDraft, participantId: string, by: 1 | -1): OrderDraft {
  const from = draft.order.indexOf(participantId);
  const to = from + by;
  if (from < 0 || to < 0 || to >= draft.order.length) return draft;
  const order = [...draft.order];
  [order[from], order[to]] = [order[to], order[from]];
  return { ...draft, order };
}

export function createTournamentOperations(rt: Runtime) {
  const started = (gameId: string) => asStartedTournament(findGame(rt.state(), gameId));

  return {
    /** Tournament Play (layout B · Standings), or `null` unless an In progress tournament. */
    getTournamentPlay(gameId: string): TournamentPlayView | null {
      const game = started(gameId);
      if (!game) return null;
      const playView = getPlayView(rt, game);
      if (!playView) return null;
      return rt.memo(`tournament.play:${gameId}`, [game, playView], () => buildPlay(game, playView));
    },

    /** Tournament Results: status, finishing order, Edit order and whether Calculate Payments is available. */
    getTournamentResults(gameId: string): TournamentResultsView | null {
      const game = started(gameId);
      if (!game) return null;
      return rt.memo(`tournament.results:${gameId}`, [game], () => buildResults(game));
    },

    /**
     * The tournament player page: buy-ins with their mixes, the result card of a finished player
     * and "Back in the game?" for an eliminated one. `null` if the game or participant is unknown.
     */
    getTournamentPlayer(gameId: string, participantId: string): TournamentPlayerView | null {
      const game = started(gameId);
      if (!game) return null;
      return rt.memo(`tournament.player:${gameId}:${participantId}`, [game], () => buildPlayer(game, participantId));
    },

    /**
     * Records one final elimination: the participant finishes at the next open place from the
     * bottom. Rejected if they are not in the game, already out, or the last player left.
     */
    async recordElimination(gameId: string, participantId: string): Promise<RecordEliminationResult> {
      const a = access(rt, gameId);
      if (!a.ok) return a.rejection;
      const { play } = a.game;
      const name = nameIn(play, participantId);
      if (name === null) return rejected('notPlaying', 'This player is not in this game.');
      const order = eliminationOrder(play);
      if (order.includes(participantId)) return rejected('alreadyOut', `${name} is already out.`);
      if (play.roster.length - order.length <= 1) {
        return rejected('lastPlayer', `${name} is the last player left. One player has to stay in.`);
      }
      const record: EliminationRecord = { participantId, recordedAt: rt.now().toISOString() };
      await rt.apply(withEliminations(a.state, a.game, [...(play.eliminations ?? []), record]));
      return { status: 'accepted', place: play.roster.length - order.length };
    },

    /**
     * Records several eliminations from one hand in one commit, in the host's order (best place
     * first): the last of them finishes at the next open place, the first one place above the
     * others. `stillIn` is the set of players still in that the host saw; if it changed meanwhile
     * the operation is rejected. At least two players go out and at least one stays in.
     */
    async recordSameHand(
      gameId: string,
      choice: { bestFirst: readonly string[]; stillIn: readonly string[] },
    ): Promise<RecordSameHandResult> {
      const a = access(rt, gameId);
      if (!a.ok) return a.rejection;
      const { play } = a.game;
      const order = eliminationOrder(play);
      const remaining = play.roster.filter((p) => !order.includes(p.id)).map((p) => p.id);
      const seen = new Set(choice.stillIn);
      if (seen.size !== remaining.length || remaining.some((id) => !seen.has(id))) {
        return rejected('stillInChanged', STILL_IN_CHANGED_MESSAGE);
      }
      const ids = choice.bestFirst;
      if (ids.length < 2 || new Set(ids).size !== ids.length) {
        return rejected('tooFewPlayers', 'Tick at least two different players.');
      }
      for (const id of ids) {
        const name = nameIn(play, id);
        if (name === null) return rejected('notPlaying', 'This player is not in this game.');
        if (order.includes(id)) return rejected('alreadyOut', `${name} is already out.`);
      }
      if (ids.length >= remaining.length) return rejected('lastPlayer', 'One player has to stay in.');
      const recordedAt = rt.now().toISOString();
      const records = [...ids].reverse().map((participantId): EliminationRecord => ({ participantId, recordedAt }));
      await rt.apply(withEliminations(a.state, a.game, [...(play.eliminations ?? []), ...records]));
      return { status: 'accepted' };
    },

    /** Starts a finishing-order draft from the saved order; `null` unless an In progress tournament. */
    startOrderDraft(gameId: string): OrderDraft | null {
      const game = started(gameId);
      if (!game) return null;
      const order = eliminationOrder(game.play);
      return { gameId, savedOrder: order, roster: game.play.roster.map((p) => p.id), order, added: [] };
    },

    /** Draft: one place better (no-op on the best eliminated place). */
    moveUpInOrderDraft(draft: OrderDraft, participantId: string): OrderDraft {
      return moveInDraft(draft, participantId, 1);
    },

    /** Draft: one place worse (no-op on the first one out). */
    moveDownInOrderDraft(draft: OrderDraft, participantId: string): OrderDraft {
      return moveInDraft(draft, participantId, -1);
    },

    /** Draft: removes this elimination (the player is back in once saved). */
    undoInOrderDraft(draft: OrderDraft, participantId: string): OrderDraft {
      if (!draft.order.includes(participantId)) return draft;
      return {
        ...draft,
        order: draft.order.filter((id) => id !== participantId),
        added: draft.added.filter((id) => id !== participantId),
      };
    },

    /**
     * Draft: inserts a missed elimination at one of the slots `describeOrderDraft` offers. No-op if
     * the player is already out in the draft, the slot is unknown or nobody would be left.
     */
    addMissedToOrderDraft(draft: OrderDraft, choice: { playerId: string; slotId: string }): OrderDraft {
      const slot = Number(choice.slotId);
      if (
        !draft.roster.includes(choice.playerId) ||
        draft.order.includes(choice.playerId) ||
        !Number.isInteger(slot) ||
        slot < 0 ||
        slot > draft.order.length ||
        draft.roster.length - draft.order.length <= 1
      ) {
        return draft;
      }
      const order = [...draft.order];
      order.splice(slot, 0, choice.playerId);
      return { ...draft, order, added: [...draft.added, choice.playerId] };
    },

    /**
     * Everything the finishing-order editor shows for a draft: rows with places, payouts and
     * markers, the missed-elimination choices and what saving would change. Changes nothing.
     * `null` unless the draft's game is an In progress tournament.
     */
    describeOrderDraft(draft: OrderDraft): OrderEditorView | null {
      const game = started(draft.gameId);
      if (!game) return null;
      return rt.memo(`tournament.order:${draft.gameId}`, [game, draft], () => buildOrderEditor(game, draft));
    },

    /**
     * Saves a draft as the elimination order in one commit. Rejected (`orderChanged`) if the saved
     * order or the roster changed since the draft was started; nothing changes then.
     */
    async saveOrder(draft: OrderDraft): Promise<SaveOrderResult> {
      const a = access(rt, draft.gameId);
      if (!a.ok) return a.rejection;
      const { play } = a.game;
      const saved = eliminationOrder(play);
      const roster = play.roster.map((p) => p.id);
      if (!sameList(saved, draft.savedOrder) || !sameList(roster, draft.roster)) {
        return rejected('orderChanged', ORDER_CHANGED_MESSAGE);
      }
      const ids = draft.order;
      if (new Set(ids).size !== ids.length || ids.some((id) => !roster.includes(id)) || ids.length >= roster.length) {
        return rejected('invalidOrder', 'This order is not possible. Nothing was saved.');
      }
      if (sameList(saved, ids)) return { status: 'accepted' };
      const recordedAt = rt.now().toISOString();
      const existing = new Map((play.eliminations ?? []).map((e) => [e.participantId, e]));
      const records = ids.map((participantId) => existing.get(participantId) ?? { participantId, recordedAt });
      await rt.apply(withEliminations(a.state, a.game, records));
      return { status: 'accepted' };
    },

    /**
     * Back in the game: removes one elimination only (never a contribution). Without `confirmed`
     * returns what the popup lists (place shifts, a withdrawn winner, reopened late entry) and
     * changes nothing.
     */
    async backInTheGame(gameId: string, participantId: string, options: { confirmed?: boolean } = {}): Promise<BackInResult> {
      const a = access(rt, gameId);
      if (!a.ok) return a.rejection;
      const { play } = a.game;
      const name = nameIn(play, participantId);
      if (name === null) return rejected('notPlaying', 'This player is not in this game.');
      if (!eliminationOrder(play).includes(participantId)) return rejected('notOut', `${name} is not out.`);
      if (!options.confirmed) {
        return { status: 'needsConfirmation', confirmation: { kind: 'backInTheGame', ...buildBackIn(a.game, participantId) } };
      }
      const eliminations = (play.eliminations ?? []).filter((e) => e.participantId !== participantId);
      await rt.apply(withEliminations(a.state, a.game, eliminations));
      return { status: 'accepted' };
    },
  };
}
