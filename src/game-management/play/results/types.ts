/**
 * Read models of cash-game final chip counts, results and the accounting status, shaped "ready to
 * render": display texts next to the raw numbers a tone or a bar needs. The count editor, the
 * Results tab and the player page use these types directly (their feature `types.ts` re-export
 * them); screens add only their context line and navigation labels.
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

/** What a typed quantity means. */
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
  /** Bold lead, e.g. "Count incomplete." */
  title: string;
  /** The sentence, e.g. "Your entries are kept. Fix the marked quantities." */
  message: string;
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

/** `play.getCountEditor`: everything the final chip count editor shows except the screen's context line. */
export interface CountEditorView {
  gameId: string;
  playerId: string;
  /** "Clara". */
  playerName: string;
  /** `count` for a first result (Count draft). Corrections of a confirmed result come later. */
  kind: 'count' | 'correction';
  /** One entry per denomination, ascending value. */
  entries: readonly QuantityEntry[];
  /** Live totals from the current raw text. */
  totals: CountTotals;
  /** With `showErrors` and missing or invalid quantities: "Count incomplete."; otherwise `null`. */
  problem: EditorProblem | null;
  /** A count draft is saved for this player. */
  hasDraft: boolean;
}

/** The accounting status card above the Results player list. Drafts never count. */
export type ResultsStatus =
  /** Some players have no confirmed result yet. */
  | {
      kind: 'toCount';
      /** "5 still to count". */
      title: string;
      /** Uncounted players in joining order: "Bob, Clara, David, Emma, Felix". */
      namesText: string;
      /** Players with a confirmed result. */
      counted: number;
      /** All players. */
      total: number;
    }
  /** Everyone counted, fewer chip units than issued. */
  | {
      kind: 'missing';
      /** "1 chip unit missing". */
      title: string;
      /** "EUR 0.10 · 1,399 of 1,400 counted. Recount, or correct a result." */
      description: string;
    }
  /** Everyone counted, more chip units than issued. */
  | {
      kind: 'tooMany';
      /** "1 chip unit too many". */
      title: string;
      /** "EUR 0.10 · 1,401 of 1,400 counted. Recount, or correct a result." */
      description: string;
    }
  /** Everyone counted and the counted units equal the issued units. */
  | {
      kind: 'addsUp';
      /** "All 6 counted · 1,600 chip units". */
      description: string;
    };

/** One Results player row, in joining order. */
export interface ResultsPlayerRow {
  /** Participant id: passed back in callbacks. */
  id: string;
  name: string;
  /** "EUR 40.00 contribution · 1 rebuy". */
  contributionText: string;
  /**
   * `uncounted`: no result, no draft (tag Uncounted, Count chips).
   * `countDraft`: no result, a saved count draft (tag Count draft, Resume).
   * `result`: a confirmed result (signed amount, no tag unless a correction is drafted).
   */
  state: 'uncounted' | 'countDraft' | 'result';
  /** A confirmed result with an unconfirmed correction draft (tag Correction draft). */
  correctionDraft: boolean;
  /**
   * The player's win / loss for `result` rows, else `null`. In progress the exact value
   * ("+EUR 5.0025"); Completed the allocated cents ("+EUR 5.00").
   */
  result: SignedMoney | null;
}

/** `play.getResults`: the cash-game Results tab and the accounting status behind it. */
export interface CashResultsView {
  gameId: string;
  /** In progress (editable, exact amounts) or Completed (read-only, allocated cents). */
  phase: 'inProgress' | 'completed';
  /** Reopened after Payments and not calculated again yet: Results shows "Reopened · calculate Payments again…". */
  reopened: boolean;
  status: ResultsStatus;
  /** In joining order. */
  players: readonly ResultsPlayerRow[];
  accounting: {
    /** Players with a confirmed result / all players. */
    counted: number;
    total: number;
    /** Chip units of every confirmed result. */
    countedUnits: number;
    /** Chip units of every issuance so far (buy-ins, rebuys, late entries): cumulative, never the bank. */
    issuedUnits: number;
    /** `countedUnits − issuedUnits` once everyone is counted (negative: missing); `null` before. */
    difference: number | null;
  };
  /**
   * Calculate Payments… is offered only when everything adds up (In progress); otherwise its one
   * reason. Completed: never available.
   */
  calculatePayments:
    | { available: true; reason: null }
    | { available: false; /** "Count everyone first." */ reason: string };
}

/** The initial buy-in (or late-entry stack) or one rebuy, with the mix actually handed out. */
export interface BuyInRecord {
  /** Issuance id (passed back to Correct mix / Undo). */
  id: string;
  /** `buyIn` is the first stack (no actions); `rebuy` has Correct mix and Undo. */
  kind: 'buyIn' | 'rebuy';
  /** "Buy-in", "Rebuy 1". */
  label: string;
  /** "EUR 20.00". */
  amountText: string;
  /** Actual mix, ascending value (zero counts are hidden on the page). */
  mix: readonly MixChip[];
  /** Recorded later as a forgotten rebuy: tag "added later". */
  addedLater: boolean;
  /** Its mix was corrected: tag "corrected". */
  corrected: boolean;
  /** Reduced blind-payment coverage, e.g. "3 of 4 coverage"; `null` when fully covered. */
  coverageText: string | null;
  /** What the Undo popup shows for this rebuy; `null` for the initial buy-in, when read-only or not yet offered. */
  undo: UndoRebuyData | null;
}

/** A player with a confirmed result. */
export interface PlayerResult {
  /** Win / loss: exact in progress ("+EUR 5.0025"), allocated cents when Completed. */
  winLoss: SignedMoney;
  /** "EUR 25.00". */
  chipValueText: string;
  /** All contributions as a deduction: "−EUR 20.00". */
  contributionsText: string;
  /** Final chips in units: "250". */
  unitsText: string;
  /** Every denomination including ×0. */
  finalChips: readonly MixChip[];
  /** An unconfirmed correction draft exists (Correct then resumes it). */
  correctionDraft: boolean;
}

/** The "Undo <name>’s rebuy k?" popup. */
export interface UndoRebuyData {
  rebuyId: string;
  playerName: string;
  /** 2 for "rebuy 2". */
  rebuyNumber: number;
  /** The rebuy's actual mix. */
  mix: readonly MixChip[];
  /** "EUR 60.00". */
  contributionsBeforeText: string;
  /** "EUR 40.00". */
  contributionsAfterText: string;
  /**
   * `page`: "Take the chips back if <name> already has them."
   * `fix`: in the fix flow, "<name> keeps the chips until the new rebuy."
   */
  context: 'page' | 'fix';
}

/** The "<name> back in the game?" popup. */
export interface ReturnToPlayData {
  playerName: string;
  /** The confirmed mix to hand back (zero counts hidden); empty when the result had no chips. */
  handBack: readonly MixChip[];
  /** "EUR 20.00". */
  buyInsText: string;
}

/** `play.getCashPlayer`: the cash player page except the screen's context line and Back label. */
export interface CashPlayerView {
  gameId: string;
  /** Completed shows the page read-only with allocated cents. */
  phase: 'inProgress' | 'completed';
  playerId: string;
  name: string;
  /** Confirmed result, or `null` while the player is still playing. */
  result: PlayerResult | null;
  /** No result yet but a saved count draft (Count final chips reads "Resume count"). */
  countDraft: boolean;
  /** Buy-ins total: "EUR 40.00". */
  buyInsTotalText: string;
  /** First stack (buy-in or late entry), then rebuys in the order they were handed out. */
  buyIns: readonly BuyInRecord[];
  /** What the Return to play popup shows; `null` until Return to play is offered. */
  returnToPlay: ReturnToPlayData | null;
  /** What the page may offer now. */
  actions: {
    /** Count final chips / Resume count: no result yet. */
    countFinalChips: boolean;
  };
}
