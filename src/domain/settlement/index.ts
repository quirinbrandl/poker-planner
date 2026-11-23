/**
 * Settlement: exact cash-game valuation, cent allocation, player balances and Payments.
 * Pure functions over whole cents and exact fractions; participants are opaque ids passed in
 * joining order. See CONTEXT.md and spec Decisions 11 and 14–16.
 */
export {
  allocateCashResults,
  cashRate,
  exactChipValue,
  exactWinLoss,
  type AllocatedResult,
  type CashResultInput,
} from './cashValuation';
export { playerBalances, type BalanceInput, type PlayerBalance } from './balances';
export { EXACT_SETTLEMENT_LIMIT, settlePayments, type PaymentInstruction } from './payments';
export type { ParticipantId } from './participants';
export type { ExactCents } from '../money';
