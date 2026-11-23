/**
 * Data contract of "Fix <name>’s count / result": a correction (or a result removal) blocked by a
 * later rebuy that uses the returned chips, fixed one step at a time:
 *   1 undo the dependent rebuy → 2 save the correction (or the removal) → 3 give a new rebuy → done.
 * Plain data only: game management fills it and tracks the current step.
 */
import type { FixView } from '@/game-management';

export type { FixStart } from '@/game-management';

/** Everything the fix page shows: game management's `FixView` plus the context line. */
export interface FixData extends FixView {
  /** "Cash game · 16 Nov, 19:30". */
  context: string;
}
