/**
 * Everything the host can do and see while a game is in Planning.
 */
import type { Runtime } from '../core/runtime';
import { createChipSetOperations } from './chip-set';
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
  };
}

export type PlanningApi = ReturnType<typeof createPlanningApi>;
