/**
 * Read models of Calculate Payments, the Completed Payments tab and History, shaped "ready to
 * render". The feature `types.ts` files re-export them; screens add only their context line,
 * dates and navigation labels.
 */
import type { GameMode } from '@/domain/types';

/** Which mode's wording and Balances lines the screens use. */
export type PaymentsMode = GameMode;

/** Direction of a signed balance: the colour, and the word under it (Gets / Pays / Even). */
export type BalanceDirection = 'gain' | 'loss' | 'even';

/** One simplified payment instruction: the payer pays the receiver the amount. Not a record of payment. */
export interface PaymentInstructionView {
  /** Stable key, unique within the game's Payments. */
  id: string;
  /** The payer's captured name: "Bob". */
  fromName: string;
  /** The receiver's captured name: "Clara". */
  toName: string;
  /** The allocated amount: "EUR 8.00". */
  amountText: string;
}

/** One player's line under Balances, in joining order (cash) or finishing order (tournament). */
export interface BalanceRow {
  /** The participant, passed back to `onOpenPlayer`. */
  participantId: string;
  /** Captured name: "Alice". */
  name: string;
  /** Tournament finishing place: "1st". `null` in cash games. */
  placeLabel: string | null;
  /** True for the winner: the place badge is filled Lavender. */
  placeHighlight: boolean;
  /**
   * The supporting line. Cash: "EUR 33.00 chips · EUR 20.00 buy-ins".
   * Tournament: "EUR 98.00 payout · EUR 20.00 buy-ins", or only "EUR 20.00 buy-ins" without a payout.
   */
  lines: readonly string[];
  /** The allocated signed balance: "+EUR 13.00", "−EUR 8.00", "EUR 0.00". */
  balanceText: string;
  /** gain: Gets, loss: Pays, even: Even. */
  direction: BalanceDirection;
}

/** What the Payments list shows above Balances. */
export type PaymentsSummary =
  | {
      kind: 'payments';
      /** "3 payments" (or "1 payment"). */
      countText: string;
      /** "EUR 21.00 in total". */
      totalText: string;
      /** The instructions in display order; never empty. */
      payments: readonly PaymentInstructionView[];
    }
  /** Every balance is zero: “No payments needed · Everyone broke even.” */
  | { kind: 'noPayments' };

/** `play.getPayments`: the Completed Payments tab except the screen's context line. */
export interface PaymentsView {
  gameId: string;
  mode: PaymentsMode;
  /** ISO 8601 finishing time (when Payments were calculated). */
  finishedAt: string;
  summary: PaymentsSummary;
  balances: readonly BalanceRow[];
}

/** A label / value line in Calculate Payments? (tournament prize pool and paid places). */
export interface CalculateFact {
  /** "Prize pool", "1st · Alice". */
  label: string;
  /** "EUR 140.00". */
  value: string;
}

/** What Calculate Payments? shows (the `needsConfirmation` of `play.calculatePayments`). */
export interface CalculatePaymentsConfirmation {
  kind: 'calculatePayments';
  /**
   * The ready line, without the tick: "All 6 counted · 1,600 chip units" (cash),
   * "Alice wins · all 5 eliminations recorded" (tournament).
   */
  readyLine: string;
  /** Tournament: prize pool, then each paid place with its amount. Empty in cash games. */
  facts: readonly CalculateFact[];
}

/** What Reopen this game? is about (its wording is fixed; the mode picks the tournament variant). */
export interface ReopenConfirmation {
  kind: 'reopen';
  mode: GameMode;
}

/** One fact on a History card: a quiet label and a strong value ("Buy-ins" "EUR 160.00"). */
export interface HistoryFact {
  /** Quiet lead word: "Buy-ins", "Prize pool", "Top", "Winner". Omitted for "3 payments". */
  label?: string;
  /** "EUR 160.00", "3 payments", "Alice +EUR 13.00", "No payments needed". */
  value: string;
}

/** `games.history()`: one Completed game, from its captured facts and its own settlement. */
export interface HistoryGameView {
  gameId: string;
  mode: GameMode;
  /** Captured names in joining order (everyone who played). */
  participantNames: readonly string[];
  /** ISO 8601 creation date-time. */
  createdAt: string;
  /** ISO 8601 finishing date-time. */
  finishedAt: string;
  /**
   * The summary, in order. Cash: Buy-ins EUR x · N payments (or "No payments needed") · Top <name> +EUR y.
   * Tournament: Prize pool EUR x · N payments · Winner <name>.
   */
  facts: readonly HistoryFact[];
}
