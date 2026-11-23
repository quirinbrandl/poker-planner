/**
 * Display data for Calculate Payments? and the Completed Payments tab. Plain data only: game
 * management computes and formats everything (`play.getPayments`, `play.calculatePayments`); the
 * screens only show it. The plain types live in game management and are re-exported here.
 */
import type { BalanceRow, CalculateFact, PaymentsMode, PaymentsSummary } from '@/game-management';

export type {
  BalanceDirection,
  BalanceRow,
  CalculateFact,
  PaymentInstructionView as PaymentInstruction,
  PaymentsMode,
  PaymentsSummary,
} from '@/game-management';

/** Everything the Completed Payments tab shows: `PaymentsView` plus the screen's context line. */
export interface PaymentsData {
  mode: PaymentsMode;
  /** The context line with created and finished time: "Cash game · 23 Nov, 19:30–23:41". */
  context: string;
  summary: PaymentsSummary;
  balances: readonly BalanceRow[];
}

/** What Calculate Payments? confirms (`CalculatePaymentsConfirmation` fits it as is). */
export interface CalculatePaymentsData {
  /**
   * The ready line, without the tick: "All 6 counted · 1,600 chip units" (cash),
   * "Alice wins · all 5 eliminations recorded" (tournament).
   */
  readyLine: string;
  /** Tournament: prize pool, then each paid place with its amount. Empty in cash games. */
  facts: readonly CalculateFact[];
}
