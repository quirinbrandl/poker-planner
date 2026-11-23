/**
 * Everything the host can do and see while a game is in Planning.
 */
import { rejected } from '../core/results';
import type { Runtime } from '../core/runtime';
import { createChipSetOperations } from './chip-set';
import type { StartAcceptance, StartResult } from './distribution-view';
import { findGame } from './draft';
import { createParticipantOperations } from './participants';
import { createPayoutScheduleOperations } from './payout-schedule';
import { createSettingsOperations } from './settings';
import { buildPlanningView, type PlanningView } from './view';
import { createWizardOperations } from './wizard';

export function createPlanningApi(rt: Runtime) {
  return {
    /** The Planning view of a game, or `null` if it does not exist or is no longer in Planning. */
    getView(gameId: string): PlanningView | null {
      const state = rt.state();
      const game = findGame(state, gameId);
      if (!game || game.phase !== 'planning') return null;
      return rt.memo(`planning.view:${gameId}`, [game, state.templates], () => buildPlanningView(state, game));
    },
    ...createWizardOperations(rt),
    ...createParticipantOperations(rt),
    ...createChipSetOperations(rt),
    ...createSettingsOperations(rt),
    ...createPayoutScheduleOperations(rt),
    /**
     * Starts the game with the previewed distribution: records one identical starting stack per
     * player and locks setup. `accept` repeats the depth and reserve the host confirmed in the
     * Start popup; Start is rejected (`previewChanged`) if the current preview differs.
     * Placeholder until Start is built: always rejected.
     */
    async start(gameId: string, accept: StartAcceptance): Promise<StartResult> {
      void accept;
      const game = findGame(rt.state(), gameId);
      if (!game) return rejected('gameNotFound', 'This game no longer exists.');
      return rejected('noValidDistribution', 'Starting a game is not built yet.');
    },
  };
}

export type PlanningApi = ReturnType<typeof createPlanningApi>;
