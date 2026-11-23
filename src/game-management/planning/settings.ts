/**
 * Game settings: buy-in, starting depth, distribution preference, blind-payment coverage, reserve.
 */
import type { DistributionPreference } from '@/domain/types';

import type { SettingsDraft } from '../core/documents';
import type { Accepted, EditResult, GameAccessCode, Rejected } from '../core/results';
import type { Runtime } from '../core/runtime';
import { markEdited, withDraft } from './draft';
import { editPlanningGame } from './edit';
import { validateSettings } from './validation';

/** The text fields of Game settings. Typing into `reserve` makes the reserve custom. */
export type SettingTextField = 'buyIn' | 'depth' | 'coverage' | 'reserve';

export function createSettingsOperations(rt: Runtime) {
  return {
    /**
     * Saves exactly what the host typed into a Game settings field. Typing into the reserve field
     * (even the automatic value, zero, or nothing) makes the reserve a custom override.
     */
    setSettingText(gameId: string, fieldName: SettingTextField, text: string): Promise<EditResult> {
      return editPlanningGame(
        rt,
        gameId,
        (game) =>
          withDraft(game, (draft) => {
            const settings: SettingsDraft =
              fieldName === 'buyIn'
                ? { ...draft.settings, buyInText: text }
                : fieldName === 'depth'
                  ? { ...draft.settings, depthText: text }
                  : fieldName === 'coverage'
                    ? { ...draft.settings, coverageText: text }
                    : { ...draft.settings, reserve: { mode: 'custom', text } };
            return markEdited({ ...draft, settings }, fieldName);
          }),
        (game) => {
          const v = validateSettings(game.planning.settings, game.planning.participants.length);
          const p = v[fieldName].problem;
          return p ? [p] : [];
        },
      );
    },

    /** "Use automatic (N)": the reserve follows ceil(roster / 2) again. */
    useAutomaticReserve(gameId: string): Promise<Accepted | Rejected<GameAccessCode>> {
      return editPlanningGame(rt, gameId, (game) =>
        withDraft(game, (draft) => ({ ...draft, settings: { ...draft.settings, reserve: { mode: 'automatic' } } })),
      ) as Promise<Accepted | Rejected<GameAccessCode>>;
    },

    /** Fewer chips (default) or More chips. */
    setDistributionPreference(
      gameId: string,
      preference: DistributionPreference,
    ): Promise<Accepted | Rejected<GameAccessCode>> {
      return editPlanningGame(rt, gameId, (game) =>
        withDraft(game, (draft) => markEdited({ ...draft, settings: { ...draft.settings, preference } }, 'preference')),
      ) as Promise<Accepted | Rejected<GameAccessCode>>;
    },
  };
}
