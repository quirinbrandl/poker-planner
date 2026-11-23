/**
 * Everything the host can do and see while a game is in Planning.
 */
import type { Runtime } from '../core/runtime';
import { startGame } from '../play/start';
import { createChipSetOperations } from './chip-set';
import { buildPreviewStepView } from './distribution';
import type { PreviewStepView, StartAcceptance, StartResult } from './distribution-view';
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
     * Distribution preview: the recommendation for the current draft (or why there is none) and the
     * setup blockers. `null` if the game does not exist or is no longer in Planning. Works out the
     * recommendation on first read after a relevant change; read it only on the preview step.
     */
    getDistributionPreview(gameId: string): PreviewStepView | null {
      const game = findGame(rt.state(), gameId);
      if (!game || game.phase !== 'planning') return null;
      return buildPreviewStepView(rt, game);
    },
    /**
     * Start: records the previewed starting stack as handed out to every player, their buy-ins and
     * the accepted terms, and makes the game In progress (setup locked). `accept` repeats the depth
     * and reserve the host confirmed in the Start popup; Start is rejected (`previewChanged`) if the
     * current preview differs, and with `setupLocked` once the game has started (no second issue).
     */
    start(gameId: string, accept: StartAcceptance): Promise<StartResult> {
      return startGame(rt, gameId, accept);
    },
  };
}

export type PlanningApi = ReturnType<typeof createPlanningApi>;
