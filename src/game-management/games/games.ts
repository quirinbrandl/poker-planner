/**
 * Games across phases: creating, listing, opening and deleting.
 */
import type { GameMode, GamePhase } from '@/domain/types';

import type { AppState, GameDocument, StepId, WorkingLocation } from '../core/documents';
import { type Accepted, type Rejected, rejected } from '../core/results';
import type { Runtime } from '../core/runtime';
import { completedGame } from '../completion';
import { buildHistoryGame } from '../completion/settlement';
import type { HistoryGameView } from '../completion/types';
import { findGame, newPlanningDraft, STEP_TITLES, withGame } from '../planning/draft';
import { preselectSuggestedSchedule } from '../planning/payout-schedule';

/** What a game card on Games shows. */
export interface GameCard {
  id: string;
  mode: GameMode;
  phase: GamePhase;
  /** ISO 8601 creation date-time. */
  createdAt: string;
  /** Captured names in joining order (In progress: everyone who has joined). */
  participantNames: readonly string[];
  /** In progress and Completed: ISO 8601 date-time of Start. */
  startedAt: string | null;
  /** Completed: ISO 8601 finishing date-time (when Payments were calculated); otherwise `null`. */
  finishedAt: string | null;
  /** In progress after Reopen, until Payments are calculated again (the card says so and opens Results). */
  reopened: boolean;
  /** Planning only: the step the game resumes at, and its title. */
  lastStep: StepId | null;
  lastStepTitle: string | null;
}

export type CreateGameResult = Accepted<{ gameId: string; location: WorkingLocation }>;
export type OpenGameResult = Accepted<{ location: WorkingLocation }> | Rejected<'gameNotFound'>;
export type DeleteGameResult = Accepted | Rejected<'gameNotFound'>;

const PHASE_ORDER: Readonly<Record<GamePhase, number>> = { inProgress: 0, planning: 1, completed: 2 };

function card(game: GameDocument): GameCard {
  const planning = game.phase === 'planning';
  return {
    id: game.id,
    mode: game.mode,
    phase: game.phase,
    createdAt: game.createdAt,
    participantNames: (game.play?.roster ?? game.planning.participants).map((p) => p.name),
    startedAt: game.play?.startedAt ?? null,
    finishedAt: game.phase === 'completed' ? (game.completion?.finishedAt ?? null) : null,
    reopened: game.phase === 'inProgress' && game.play?.reopenedAt !== undefined,
    lastStep: planning ? game.planning.wizard.lastStep : null,
    lastStepTitle: planning ? STEP_TITLES[game.planning.wizard.lastStep] : null,
  };
}

/**
 * Where opening a game from a list leads: Planning resumes at its last step, an In progress game
 * opens Play (a reopened one Results), a Completed game (listed on History) its Payments.
 */
function entryLocation(game: GameDocument): WorkingLocation {
  switch (game.phase) {
    case 'planning':
      return { kind: 'planning', gameId: game.id, step: game.planning.wizard.lastStep };
    case 'inProgress':
      return { kind: game.play?.reopenedAt !== undefined ? 'results' : 'play', gameId: game.id };
    case 'completed':
      return { kind: 'payments', gameId: game.id, from: 'history' };
  }
}

/**
 * Opening a tournament straight onto its Payout schedule step preselects the suggested preset,
 * exactly as reaching the step through the wizard does.
 */
function opened(state: AppState, game: GameDocument, newId: () => string): AppState {
  if (game.phase !== 'planning' || game.planning.wizard.lastStep !== 'payouts') return state;
  const next = preselectSuggestedSchedule(game, newId);
  return next === game ? state : withGame(state, next);
}

export function createGamesApi(rt: Runtime) {
  return {
    /**
     * The Games list: In progress first, then Planning, each newest-created first. Completed games
     * belong to History and are not listed here.
     */
    list(): readonly GameCard[] {
      const games = rt.state().games;
      return rt.memo('games.list', [games], () =>
        Object.values(games)
          .filter((g) => g.phase !== 'completed')
          .sort(
            (a, b) =>
              PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] ||
              b.createdAt.localeCompare(a.createdAt) ||
              a.id.localeCompare(b.id),
          )
          .map(card),
      );
    },

    /**
     * History: Completed games, most recently finished first, each with its captured names and its
     * own settlement summary (never live saved players).
     */
    history(): readonly HistoryGameView[] {
      const games = rt.state().games;
      return rt.memo('games.history', [games], () =>
        Object.values(games)
          .map((g) => completedGame(g))
          .filter((g) => g !== null)
          .sort(
            (a, b) =>
              b.completion.finishedAt.localeCompare(a.completion.finishedAt) ||
              b.createdAt.localeCompare(a.createdAt) ||
              a.id.localeCompare(b.id),
          )
          .map((g) => buildHistoryGame(g, g.completion)),
      );
    },

    /** One game's card, or `null`. */
    get(gameId: string): GameCard | null {
      const game = findGame(rt.state(), gameId);
      return game ? rt.memo(`games.card:${gameId}`, [game], () => card(game)) : null;
    },

    /**
     * New game: choosing the mode creates the autosaved Planning draft and opens Players.
     */
    async create(mode: GameMode): Promise<CreateGameResult> {
      const state = rt.state();
      const game: GameDocument = {
        id: rt.newId(),
        mode,
        phase: 'planning',
        createdAt: rt.now().toISOString(),
        planning: newPlanningDraft(),
      };
      const location = entryLocation(game);
      await rt.apply({ ...state, games: { ...state.games, [game.id]: game }, location });
      return { status: 'accepted', gameId: game.id, location };
    },

    /**
     * Opens a game from a list: Planning resumes at its last visited step, an In progress game opens
     * Play (reopened: Results), a Completed game its Payments with `from: 'history'`. Records the location.
     */
    async open(gameId: string): Promise<OpenGameResult> {
      const state = rt.state();
      const game = findGame(state, gameId);
      if (!game) return rejected('gameNotFound', 'This game no longer exists.');
      const location = entryLocation(game);
      await rt.apply({ ...opened(state, game, rt.newId), location });
      return { status: 'accepted', location };
    },

    /**
     * Deletes a game permanently (the screen confirms first). Touches nothing else. A location in
     * the game falls back to the list it lived in: History for a Completed game, else Games.
     */
    async delete(gameId: string): Promise<DeleteGameResult> {
      const state = rt.state();
      const game = findGame(state, gameId);
      if (!game) return rejected('gameNotFound', 'This game no longer exists.');
      const games = { ...state.games };
      delete games[gameId];
      const pointsHere = 'gameId' in state.location && state.location.gameId === gameId;
      const list: WorkingLocation = { kind: game.phase === 'completed' ? 'history' : 'games' };
      await rt.apply({ ...state, games, location: pointsHere ? list : state.location });
      return { status: 'accepted' };
    },
  };
}

export type GamesApi = ReturnType<typeof createGamesApi>;
