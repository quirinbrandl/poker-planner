/**
 * Data contracts of the final chip count editor (B · one denomination at a time), its result
 * confirmation and the shared "blocked mix" popup. Plain data only: game management fills these.
 * The chip picker types are shared with the forgotten-rebuy / Correct mix editor.
 */
import type { BlockedMixData, CountTotals, EditorProblem, QuantityEntry, ResultConfirmationData } from '@/game-management';

export type {
  BlockedChip,
  BlockedMixData,
  ChipFace,
  CountTotals,
  EditorProblem,
  MixChip,
  QuantityEntry,
  QuantityState,
  ResultConfirmationData,
  SignedMoney,
} from '@/game-management';

/** Everything the count editor shows. */
export interface CountEditorData {
  /** "Clara". */
  playerName: string;
  /** "Cash game · 16 Nov, 19:30". */
  context: string;
  /** `count` for a first result (Count draft), `correction` for a confirmed result being corrected. */
  kind: 'count' | 'correction';
  /** One entry per denomination, ascending value. */
  entries: readonly QuantityEntry[];
  /** Live totals from the current raw text. */
  totals: CountTotals;
  /** Set after a review that found missing or invalid quantities; `null` otherwise. */
  problem: EditorProblem | null;
}

/** What game management answers to "Review result →". */
export type CountReviewOutcome =
  /** Show the confirmation popup. */
  | { kind: 'confirm'; confirmation: ResultConfirmationData }
  /** Quantities missing or invalid: `entries[].error` and `problem` now say what; go to that denomination. */
  | { kind: 'needsCorrection'; firstDenominationValue: number }
  /** The count returns chips the records cannot take; nothing was saved. */
  | { kind: 'blocked'; blocked: BlockedMixData }
  /** The caller took over (e.g. opened the fix flow for a dependent record). Nothing to show here. */
  | { kind: 'handled' };

/** What game management answers to a confirmation (Confirm result, Add rebuy, Undo rebuy …). */
export type ConfirmOutcome =
  /** Recorded. The caller navigates and shows the ✓ toast. */
  | { kind: 'accepted' }
  /** Records changed meanwhile and the operation is impossible; nothing was saved. */
  | { kind: 'blocked'; blocked: BlockedMixData }
  /** Not recorded; the caller has already explained why (toast or another screen). */
  | { kind: 'rejected' };
