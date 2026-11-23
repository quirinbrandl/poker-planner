/** Display data for History. Plain data only; the host maps game management's views into it. */

/** One fact on a History card: a quiet label and a strong value ("Buy-ins" "EUR 160.00"). */
export interface HistoryFact {
  /** Quiet lead word: "Buy-ins", "Prize pool", "Top", "Winner". Omitted for "3 payments". */
  label?: string;
  /** "EUR 160.00", "3 payments", "Alice +EUR 13.00", "No payments needed". */
  value: string;
}

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
