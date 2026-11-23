/**
 * Data contract of "Fix <name>’s count / result": a correction (or a result removal) blocked by a
 * later rebuy that uses the returned chips, fixed one step at a time:
 *   1 undo the dependent rebuy → 2 save the correction (or the removal) → 3 give a new rebuy → done.
 * Plain data only: game management fills it and tracks the current step.
 */
import type { BlockedChip, MixChip, ResultConfirmationData } from '@/features/count/types';
import type { ReturnToPlayData, UndoRebuyData } from '@/features/player/types';

export interface FixData {
  /** "Cash game · 16 Nov, 19:30". */
  context: string;
  /** Whose record is being corrected: "Alice". */
  playerName: string;
  /** `count`: a corrected count waits to be saved. `result`: a result removal (Return to play) waits. */
  target: 'count' | 'result';
  /** The current step; `done` once the new rebuy is issued. */
  step: 1 | 2 | 3 | 'done';
  /** The dependent rebuy. */
  blocker: {
    /** "Bob". */
    ownerName: string;
    /** 2 for "rebuy 2". */
    rebuyNumber: number;
    /** "EUR 20.00". */
    amountText: string;
    /** Its actual mix. */
    mix: readonly MixChip[];
    /** The chip the correction is short of, with its badge ("−5"). */
    chip: BlockedChip;
    /** "Bob’s rebuy 2 is using 5 of these White chips". */
    usageText: string;
  };
  /** Step 1's Undo popup (context `fix`). */
  undo: UndoRebuyData;
  /** Step 2 for a count: the retained corrected mix and its Replace result popup. */
  correction: { mix: readonly MixChip[]; confirmation: ResultConfirmationData } | null;
  /** Step 2 for a result removal: the Return to play popup. */
  removal: ReturnToPlayData | null;
}
