/**
 * Display contract of the locked Game details tab (In progress and Completed, cash game and
 * tournament). Plain data only: game management formats every value.
 */
import type { DetailsPayoutPlace, DetailsPlayer, GameDetailsScreenView } from '@/game-management';

export type { DetailsPayoutPlace, DetailsPlayer };

/**
 * The Game details tab. In progress it is game management's `GameDetailsScreenView` plus what the
 * workspace adds (context, back label, formatted dates); Completed comes with a later task.
 */
export interface GameDetailsData extends Omit<GameDetailsScreenView, 'phase' | 'createdAt'> {
  phase: 'inProgress' | 'completed';
  /** "Cash game · 13 Nov, 19:30" (Completed adds "· finished 23:41"). */
  context: string;
  backLabel: 'Games' | 'History';
  /** "13 Nov 2026 · 19:30". */
  createdText: string;
  /** "13 Nov 2026 · 23:41"; `null` while In progress. */
  finishedText: string | null;
}
