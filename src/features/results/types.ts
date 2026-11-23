/**
 * Data contract of the cash-game Results workspace tab. Plain data only: game management fills it.
 * Every amount and count arrives formatted; the screen only chooses layout and tone from the kinds.
 */
import type { ResultsPlayerRow, ResultsStatus } from '@/game-management';

export type { ResultsPlayerRow, ResultsStatus } from '@/game-management';

/** Everything the Results tab shows. */
export interface ResultsData {
  /** In progress (editable) or Completed (read-only, allocated cents). */
  phase: 'inProgress' | 'completed';
  /** "Cash game · 23 Nov, 19:30" (Completed adds " · finished 23:41"). */
  context: string;
  /** Where the top-left control leads. */
  backLabel: 'Games' | 'History';
  /** The game was reopened after Payments: shows the "calculate Payments again" line. */
  reopened: boolean;
  status: ResultsStatus;
  players: readonly ResultsPlayerRow[];
}
