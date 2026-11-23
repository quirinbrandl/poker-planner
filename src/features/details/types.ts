/**
 * Display contract of the locked Game details tab (In progress and Completed, cash game and
 * tournament). Plain data only: game management formats every value.
 */
import type { DetailsPayoutPlace, DetailsPlayer, GameDetailsScreenView } from '@/game-management';

export type { DetailsPayoutPlace, DetailsPlayer };

/**
 * The Game details tab: game management's `GameDetailsScreenView` (In progress or Completed) plus
 * what the workspace adds (context, back label, formatted dates).
 */
export interface GameDetailsData extends Omit<GameDetailsScreenView, 'phase' | 'createdAt' | 'finishedAt'> {
  phase: 'inProgress' | 'completed';
  /** "Cash game · 13 Nov, 19:30" (Completed: "Cash game · 13 Nov, 19:30–23:41"). */
  context: string;
  backLabel: 'Games' | 'History';
  /** "13 Nov 2026 · 19:30". */
  createdText: string;
  /** "13 Nov 2026 · 23:41"; `null` while In progress. */
  finishedText: string | null;
}
