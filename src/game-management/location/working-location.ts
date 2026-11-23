/**
 * The host's working location, restored when the app reopens. Restoring only reads it; it never
 * applies an operation.
 */
import type { GameDocument, WorkingLocation } from '../core/documents';
import { type Accepted, type Rejected, rejected } from '../core/results';
import type { Runtime } from '../core/runtime';
import { findGame, stepsForMode } from '../planning/draft';

export type SetLocationResult = Accepted | Rejected<'gameNotFound' | 'wrongPhase'>;

const GAMES: WorkingLocation = { kind: 'games' };
const HISTORY: WorkingLocation = { kind: 'history' };

/** Where `location` belongs now that the game is in its current phase (`null`: as stored). */
function restored(location: WorkingLocation & { gameId: string }, game: GameDocument): WorkingLocation | null {
  switch (game.phase) {
    case 'planning':
      if (location.kind === 'planning' && stepsForMode(game.mode).includes(location.step)) return null;
      return { kind: 'planning', gameId: game.id, step: game.planning.wizard.lastStep };
    case 'inProgress':
      // Reopened since: the game left History and has no Payments any more.
      if (location.kind === 'planning') return { kind: 'play', gameId: game.id };
      if (location.kind === 'payments') return { kind: 'results', gameId: game.id };
      return 'from' in location && location.from ? { kind: location.kind, gameId: game.id } : null;
    case 'completed':
      // A Completed game's workspace has Payments, Results and Game details, but no Play.
      return location.kind === 'planning' || location.kind === 'play' ? { kind: 'payments', gameId: game.id } : null;
  }
}

/** Whether a game in its current phase has this workspace. */
function fitsPhase(location: WorkingLocation & { gameId: string }, game: GameDocument): boolean {
  if (location.kind === 'planning') return game.phase === 'planning';
  if (location.kind === 'play') return game.phase === 'inProgress';
  if (location.kind === 'payments') return game.phase === 'completed';
  return game.phase !== 'planning';
}

export function createLocationApi(rt: Runtime) {
  return {
    /**
     * Where to reopen the app. Falls back to the list the game was opened from (History or Games)
     * when the stored location's game is gone, to the game's current workspace when its phase
     * changed (Planning ↔ In progress ↔ Completed), and to the game's last visited step if the
     * stored step left its mode.
     */
    get(): WorkingLocation {
      const state = rt.state();
      const location = state.location;
      if (!('gameId' in location)) return location;
      const game = findGame(state, location.gameId);
      if (!game) return 'from' in location && location.from === 'history' ? HISTORY : GAMES;
      return rt.memo('location.restored', [location, game], () => restored(location, game) ?? location);
    },

    /**
     * Records a location the host navigated to outside the wizard (Games, Saved players, Chip set
     * templates, History, and the Play / Results / Game details / Payments tabs of a started game,
     * with `from: 'history'` when it was opened from History). Wizard operations, Start, Return to
     * Planning, Calculate Payments, Reopen and `games.open` record their locations themselves.
     */
    async set(location: WorkingLocation): Promise<SetLocationResult> {
      const state = rt.state();
      if ('gameId' in location) {
        const game = findGame(state, location.gameId);
        if (!game) return rejected('gameNotFound', 'This game no longer exists.');
        if (!fitsPhase(location, game)) return rejected('wrongPhase', 'This game has no such screen in its current phase.');
      }
      const current = state.location;
      if (JSON.stringify(current) === JSON.stringify(location)) return { status: 'accepted' };
      await rt.apply({ ...state, location });
      return { status: 'accepted' };
    },
  };
}

export type LocationApi = ReturnType<typeof createLocationApi>;
