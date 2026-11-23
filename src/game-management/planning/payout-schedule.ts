/**
 * Placeholder storage for the tournament Payout schedule: raw share text per paid place.
 * The payout rules (presets, suggestion, share validation) arrive later from `src/domain/payouts`;
 * they replace `validatePayoutSchedule` in `validation.ts` and may add operations here.
 */
import { type Accepted, type EditResult, type GameAccessCode, type Rejected, rejected } from '../core/results';
import type { Runtime } from '../core/runtime';
import { markEdited, withDraft, withoutEdited } from './draft';
import { editPlanningGame } from './edit';

export type AddPayoutRowResult = Accepted<{ rowId: string }> | Rejected<GameAccessCode>;
export type RemovePayoutRowResult = Accepted | Rejected<GameAccessCode | 'rowNotFound'>;

export function createPayoutScheduleOperations(rt: Runtime) {
  return {
    /** Appends a paid place with a blank share. */
    async addPayoutRow(gameId: string): Promise<AddPayoutRowResult> {
      const rowId = rt.newId();
      const result = await editPlanningGame(rt, gameId, (game) =>
        withDraft(game, (draft) => ({
          ...draft,
          payoutSchedule: { rows: [...draft.payoutSchedule.rows, { id: rowId, shareText: '' }] },
        })),
      );
      return result.status === 'rejected' ? result : { status: 'accepted', rowId };
    },

    setPayoutShareText(gameId: string, rowId: string, text: string): Promise<EditResult> {
      return editPlanningGame(rt, gameId, (game) => {
        if (!game.planning.payoutSchedule.rows.some((r) => r.id === rowId)) {
          return rejected('rowNotFound', 'This paid place no longer exists.');
        }
        return withDraft(game, (draft) =>
          markEdited(
            {
              ...draft,
              payoutSchedule: {
                rows: draft.payoutSchedule.rows.map((r) => (r.id === rowId ? { ...r, shareText: text } : r)),
              },
            },
            `payoutShare:${rowId}`,
          ),
        );
      });
    },

    removePayoutRow(gameId: string, rowId: string): Promise<RemovePayoutRowResult> {
      return editPlanningGame(rt, gameId, (game) => {
        if (!game.planning.payoutSchedule.rows.some((r) => r.id === rowId)) {
          return rejected('rowNotFound', 'This paid place no longer exists.');
        }
        return withDraft(game, (draft) =>
          withoutEdited(
            { ...draft, payoutSchedule: { rows: draft.payoutSchedule.rows.filter((r) => r.id !== rowId) } },
            [`payoutShare:${rowId}`],
          ),
        );
      }) as Promise<RemovePayoutRowResult>;
    },
  };
}
