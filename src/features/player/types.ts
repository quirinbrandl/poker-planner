/**
 * Data contracts of the player page and its two popups (Undo rebuy, Return to play).
 * Plain data only: game management fills these.
 */
import type { MixChip, SignedMoney } from '@/features/count/types';

/** The initial buy-in or one rebuy, with the mix actually handed out. */
export interface BuyInRecord {
  /** Rebuy id (passed back to Correct mix / Undo); the initial buy-in has its own stable id. */
  id: string;
  /** `buyIn` is the initial buy-in (no actions); `rebuy` has Correct mix and Undo. */
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
  /** What the Undo popup shows for this rebuy; `null` for the initial buy-in and when read-only. */
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

/** Everything the player page shows. */
export interface PlayerPageData {
  /** Completed shows the page read-only. */
  phase: 'inProgress' | 'completed';
  /** "Cash game · 16 Nov, 19:30". */
  context: string;
  /** Participant id: passed back in callbacks. */
  playerId: string;
  name: string;
  /** Where Back leads: "Back to Play", "Back to Results", "Back to Payments". */
  backLabel: string;
  /** Confirmed result, or `null` while the player is still playing. */
  result: PlayerResult | null;
  /** No result yet but a saved count draft (Count final chips reads "Resume count"). */
  countDraft: boolean;
  /** Buy-ins total: "EUR 40.00". */
  buyInsTotalText: string;
  /** Initial buy-in first, then rebuys in order. */
  buyIns: readonly BuyInRecord[];
  /** What the Return to play popup shows; `null` without a result or when read-only. */
  returnToPlay: ReturnToPlayData | null;
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
