/**
 * Games across phases: creating, listing, opening and deleting.
 */
import type { GameMode, GamePhase } from '@/domain/types';

import type { AppState, GameDocument, StepId, WorkingLocation } from '../core/documents';
import { type Accepted, type Rejected, rejected } from '../core/results';
import type { Runtime } from '../core/runtime';
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
    lastStep: planning ? game.planning.wizard.lastStep : null,
    lastStepTitle: planning ? STEP_TITLES[game.planning.wizard.lastStep] : null,
  };
}

/** Where opening a game from a list leads: Planning resumes at its last step, a started game opens Play. */
function entryLocation(game: GameDocument): WorkingLocation {
  if (game.phase === 'planning') return { kind: 'planning', gameId: game.id, step: game.planning.wizard.lastStep };
  return { kind: game.phase === 'inProgress' ? 'play' : 'results', gameId: game.id };
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
     * Play. Records the location.
     */
    async open(gameId: string): Promise<OpenGameResult> {
      const state = rt.state();
      const game = findGame(state, gameId);
      if (!game) return rejected('gameNotFound', 'This game no longer exists.');
      const location = entryLocation(game);
      await rt.apply({ ...opened(state, game, rt.newId), location });
      return { status: 'accepted', location };
    },

    /** Deletes a game permanently (the screen confirms first). Touches nothing else. */
    async delete(gameId: string): Promise<DeleteGameResult> {
      const state = rt.state();
      if (!findGame(state, gameId)) return rejected('gameNotFound', 'This game no longer exists.');
      const games = { ...state.games };
      delete games[gameId];
      const pointsHere = 'gameId' in state.location && state.location.gameId === gameId;
      await rt.apply({ ...state, games, location: pointsHere ? { kind: 'games' } : state.location });
      return { status: 'accepted' };
    },
  };
}

export type GamesApi = ReturnType<typeof createGamesApi>;
