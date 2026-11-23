/**
 * Data contracts of the final chip count editor (B · one denomination at a time), its result
 * confirmation and the shared "blocked mix" popup. Plain data only: game management fills these.
 * The chip picker types are shared with the forgotten-rebuy / Correct mix editor.
 */
import type { ChipColor } from '@/domain/types';

/** One chip denomination as drawn. */
export interface ChipFace {
  /** Chip-unit value printed on the chip, e.g. 25. */
  value: number;
  /** Configured colour; `null` is "No color". */
  color: ChipColor | null;
}

/** One denomination of a recorded or proposed mix. */
export interface MixChip extends ChipFace {
  /** Number of chips of this denomination (zero included where the screen shows ×0). */
  count: number;
}

/** What a typed quantity means, as decided by game management. */
export type QuantityState = 'notEntered' | 'entered' | 'invalid';

/** One denomination row of an editable mix, in ascending value order. */
export interface QuantityEntry extends ChipFace {
  /** Raw text exactly as the host typed it. Empty means "not entered", never zero. */
  quantityText: string;
  /** `notEntered` for empty text, `entered` for a valid whole number, `invalid` otherwise. */
  state: QuantityState;
  /** The quantity when `state` is `entered`, else `null`. Used for the picker caption and ±1. */
  count: number | null;
  /** Field error shown under the quantity after a failed review, e.g. "Enter a quantity, including zero." */
  error?: string;
}

/** Signed money amount with its direction (tone and the Won / Lost / Break-even word). */
export interface SignedMoney {
  /** "+EUR 5.00", "−EUR 0.10", "EUR 0.00", or exact sub-cent "+EUR 5.0025". */
  amountText: string;
  direction: 'gain' | 'loss' | 'even';
}

/** The running summary under the count editor. */
export interface CountTotals {
  /** Chip units of the entered quantities, e.g. "250" (blanks count as nothing). */
  unitsText: string;
  /** Every denomination has a valid quantity. */
  complete: boolean;
  /** Chip value at the game rate, exact: "EUR 25.00", "EUR 25.0125". */
  chipValueText: string;
  /** The player's buy-in plus rebuys: "EUR 20.00". */
  contributionsText: string;
  /** Chip value minus contributions; `null` until `complete`. */
  winLoss: SignedMoney | null;
}

/** An editor-level problem after a failed review (one quiet line above the editor). */
export interface EditorProblem {
  /** Bold lead, e.g. "Count incomplete". */
  title: string;
  /** The sentence, e.g. "Enter every quantity, including zero." */
  message: string;
}

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

/** The "Confirm <name>’s result?" / "Replace <name>’s result?" popup. */
export interface ResultConfirmationData {
  /** `confirm` a first result, `replace` a confirmed one. */
  kind: 'confirm' | 'replace';
  playerName: string;
  /** Every denomination including ×0, ascending value. */
  mix: readonly MixChip[];
  /** "250". */
  unitsText: string;
  /** "EUR 25.00". */
  chipValueText: string;
  /** "EUR 20.00". */
  contributionsText: string;
  /** "+EUR 5.00" (exact; sub-cent where the rate needs it). */
  winLossText: string;
  /** Every quantity is zero: shows the Zero chips notice. */
  zeroChips: boolean;
}

/** One chip of a blocked-mix explanation, with its badge. */
export interface BlockedChip extends ChipFace {
  /** "+1" (more than the game has) or "−155" (bank short). */
  deltaText: string;
}

/** Compact blocked popup: "More chips than the game has" / "Not enough chips for this mix". */
export interface BlockedMixData {
  /** "More chips than the game has". */
  title: string;
  chips: readonly BlockedChip[];
  /** "That’s 1 White chip more than the game has. Check the quantities you entered." */
  message: string;
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
