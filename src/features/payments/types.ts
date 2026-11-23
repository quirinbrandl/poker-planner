/**
 * Display data for Calculate Payments? and the Completed Payments tab. Plain data only: game
 * management (or its view mapping) computes and formats everything; the screens only show it.
 */

/** Which mode's wording and Balances lines the screens use. */
export type PaymentsMode = 'cash' | 'tournament';

/** Direction of a signed balance: the colour, and the word under it (Gets / Pays / Even). */
export type BalanceDirection = 'gain' | 'loss' | 'even';

/** One simplified payment instruction: the payer pays the receiver the amount. */
export interface PaymentInstruction {
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
  /** True for the winner: the place badge gets the Lavender ring. */
  placeHighlight: boolean;
  /**
   * The supporting lines, in order. Cash: "Final result EUR 33.00", "Buy-ins EUR 20.00".
   * Tournament: "Payout EUR 98.00" or "No payout", then "Buy-ins EUR 20.00".
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
      payments: readonly PaymentInstruction[];
    }
  /** Every balance is zero: “No payments needed · Everyone broke even.” */
  | { kind: 'noPayments' };

/** Everything the Completed Payments tab shows. */
export interface PaymentsData {
  mode: PaymentsMode;
  /** The context line with created and finished time: "Cash game · 23 Nov, 19:30 · finished 23:41". */
  context: string;
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

/** What Calculate Payments? confirms. */
export interface CalculatePaymentsData {
  /**
   * The ready line, without the tick: "All 6 counted · 1,600 chip units" (cash),
   * "Alice wins · all 5 eliminations recorded" (tournament).
   */
  readyLine: string;
  /** Tournament: prize pool, then each paid place with its amount. Empty in cash games. */
  facts: readonly CalculateFact[];
}
