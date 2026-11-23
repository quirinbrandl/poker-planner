/** Display data for History. Plain data only; `historyCardData` maps game management's `HistoryGameView`. */
import type { HistoryFact } from '@/game-management';

export type { HistoryFact } from '@/game-management';

/** One finished game on History. */
export interface HistoryCardData {
  /** Passed back to `onOpenGame`. */
  gameId: string;
  /** Mode badge: "Cash game" / "Tournament". */
  modeLabel: string;
  /** Captured names in joining order: "Alice, Bob, Clara, David, Emma, Felix". */
  namesText: string;
  /**
   * Created and finished: "23 Nov 2026 · 19:30–23:41", with the finish date added when it differs
   * ("23 Nov 2026 · 19:30–24 Nov 2026 · 01:10").
   */
  dateText: string;
  /**
   * The summary, in order. Cash: Buy-ins EUR x · N payments (or "No payments needed") · Top <name> +EUR y.
   * Tournament: Prize pool EUR x · N payments · Winner <name>.
   */
  facts: readonly HistoryFact[];
}

/** History: Completed games, most recently finished first. Empty shows the empty state. */
export interface HistoryData {
  games: readonly HistoryCardData[];
}
