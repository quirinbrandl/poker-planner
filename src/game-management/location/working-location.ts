/**
 * The host's working location, restored when the app reopens. Restoring only reads it; it never
 * applies an operation.
 */
import type { WorkingLocation } from '../core/documents';
import { type Accepted, type Rejected, rejected } from '../core/results';
import type { Runtime } from '../core/runtime';
import { findGame, stepsForMode } from '../planning/draft';

export type SetLocationResult = Accepted | Rejected<'gameNotFound'>;

const GAMES: WorkingLocation = { kind: 'games' };

export function createLocationApi(rt: Runtime) {
  return {
    /**
     * Where to reopen the app. Falls back to Games when the stored location's game is gone or no
     * longer in that phase, and to the game's last visited step if the stored step left its mode.
     */
    get(): WorkingLocation {
      const state = rt.state();
      const location = state.location;
      if (location.kind !== 'planning') return location;
      const game = findGame(state, location.gameId);
      if (!game || game.phase !== 'planning') return GAMES;
      if (stepsForMode(game.mode).includes(location.step)) return location;
      return rt.memo(`location.fallback:${game.id}`, [game], () => ({
        kind: 'planning',
        gameId: game.id,
        step: game.planning.wizard.lastStep,
      }));
    },

    /**
     * Records a location the host navigated to outside the wizard (Games, Saved players, Chip set
     * templates, History). Wizard operations record Planning locations themselves.
     */
    async set(location: WorkingLocation): Promise<SetLocationResult> {
      const state = rt.state();
      if (location.kind === 'planning' && findGame(state, location.gameId)?.phase !== 'planning') {
        return rejected('gameNotFound', 'This game no longer exists.');
      }
      const current = state.location;
      if (JSON.stringify(current) === JSON.stringify(location)) return { status: 'accepted' };
      await rt.apply({ ...state, location });
      return { status: 'accepted' };
    },
  };
}

export type LocationApi = ReturnType<typeof createLocationApi>;
