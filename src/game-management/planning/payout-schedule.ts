/**
 * Tournament Payout schedule: picking presets, typing shares, adding and removing paid places, and the
 * one-time preselection of the suggested preset when the step first opens. Rules come from
 * `@/domain/payouts`. Only the host changes a chosen schedule; roster changes and mode switches never do.
 */
import { isPresetAvailable, payoutPreset, type PayoutPresetId, presetRows, suggestedPreset } from '@/domain/payouts';

import type { GameDocument, PayoutRowDraft, PlanningDraft } from '../core/documents';
import { type Accepted, type EditResult, type GameAccessCode, type Rejected, rejected } from '../core/results';
import type { Runtime } from '../core/runtime';
import { markEdited, withDraft, withoutEdited } from './draft';
import { editPlanningGame } from './edit';
import { shareFieldKey, validatePayoutStep } from './payout-validation';

export type ChoosePayoutPresetResult = Accepted | Rejected<GameAccessCode | 'presetUnavailable'>;
export type AddPayoutPlaceResult = Accepted<{ rowId: string }> | Rejected<GameAccessCode | 'tooManyPlaces'>;
export type RemovePayoutPlaceResult = Accepted | Rejected<GameAccessCode | 'rowNotFound' | 'notLastPlace' | 'onlyPlace'>;

function presetDraftRows(id: PayoutPresetId, newId: () => string): PayoutRowDraft[] {
  return presetRows(id).map((shareText) => ({ id: newId(), shareText }));
}

/** Replaces the whole schedule with a preset; the old places' edited marks go with them. */
function withPreset(draft: PlanningDraft, id: PayoutPresetId, newId: () => string): PlanningDraft {
  const oldKeys = draft.payoutSchedule.rows.map((row) => shareFieldKey(row.id));
  return withoutEdited({ ...draft, payoutSchedule: { rows: presetDraftRows(id, newId), presetId: id } }, oldKeys);
}

/**
 * Called whenever a wizard operation opens the Payout schedule step: the first time it opens in a
 * tournament with at least two players and no schedule, the suggested preset becomes the plan's
 * schedule. Otherwise returns the game unchanged.
 */
export function preselectSuggestedSchedule(game: GameDocument, newId: () => string): GameDocument {
  if (game.mode !== 'tournament' || game.planning.payoutSchedule.rows.length > 0) return game;
  const suggested = suggestedPreset(game.planning.participants.length);
  return suggested ? withDraft(game, (draft) => withPreset(draft, suggested, newId)) : game;
}

export function createPayoutScheduleOperations(rt: Runtime) {
  return {
    /**
     * Picks a preset from the sheet (or the "Use <preset>" fix): replaces every place and percentage.
     * Rejected when the preset pays more places than there are players.
     */
    choosePayoutPreset(gameId: string, presetId: PayoutPresetId): Promise<ChoosePayoutPresetResult> {
      return editPlanningGame(rt, gameId, (game) => {
        const players = game.planning.participants.length;
        if (!isPresetAvailable(presetId, players)) {
          const preset = payoutPreset(presetId);
          return rejected('presetUnavailable', `${preset.name} needs at least ${preset.shares.length} players.`);
        }
        return withDraft(game, (draft) => withPreset(draft, presetId, rt.newId));
      }) as Promise<ChoosePayoutPresetResult>;
    },

    /** Saves exactly what the host typed into a place's percentage. The schedule becomes Custom. */
    setPayoutShareText(gameId: string, rowId: string, text: string): Promise<EditResult> {
      return editPlanningGame(
        rt,
        gameId,
        (game) => {
          if (!game.planning.payoutSchedule.rows.some((r) => r.id === rowId)) {
            return rejected('rowNotFound', 'This paid place no longer exists.');
          }
          return withDraft(game, (draft) =>
            markEdited(
              {
                ...draft,
                payoutSchedule: {
                  rows: draft.payoutSchedule.rows.map((r) => (r.id === rowId ? { ...r, shareText: text } : r)),
                  presetId: null,
                },
              },
              shareFieldKey(rowId),
            ),
          );
        },
        (game) =>
          validatePayoutStep(game.planning.payoutSchedule, game.planning.participants.length).problems.filter(
            (p) => p.field === shareFieldKey(rowId),
          ),
      );
    },

    /** Add place: appends an empty place (Custom). Unavailable once places equal the player count. */
    async addPayoutPlace(gameId: string): Promise<AddPayoutPlaceResult> {
      const rowId = rt.newId();
      const result = await editPlanningGame(rt, gameId, (game) => {
        const players = game.planning.participants.length;
        if (game.planning.payoutSchedule.rows.length >= players) {
          return rejected('tooManyPlaces', `Can’t pay more places than players (${players}).`);
        }
        return withDraft(game, (draft) => ({
          ...draft,
          payoutSchedule: { rows: [...draft.payoutSchedule.rows, { id: rowId, shareText: '' }], presetId: null },
        }));
      });
      return result.status === 'rejected' ? result : { status: 'accepted', rowId };
    },

    /** Removes the last place (Custom). The only remaining place cannot be removed. */
    removePayoutPlace(gameId: string, rowId: string): Promise<RemovePayoutPlaceResult> {
      return editPlanningGame(rt, gameId, (game) => {
        const rows = game.planning.payoutSchedule.rows;
        const index = rows.findIndex((r) => r.id === rowId);
        if (index < 0) return rejected('rowNotFound', 'This paid place no longer exists.');
        if (rows.length === 1) return rejected('onlyPlace', 'Keep at least one paid place.');
        if (index !== rows.length - 1) return rejected('notLastPlace', 'Only the last place can be removed.');
        return withDraft(game, (draft) =>
          withoutEdited(
            { ...draft, payoutSchedule: { rows: draft.payoutSchedule.rows.slice(0, -1), presetId: null } },
            [shareFieldKey(rowId)],
          ),
        );
      }) as Promise<RemovePayoutPlaceResult>;
    },
  };
}
