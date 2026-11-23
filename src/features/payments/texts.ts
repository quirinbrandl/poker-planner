import type { BalanceDirection } from './types';

/** The one line under the tabs. */
export const PAYMENTS_LEAD = 'Who pays whom. The app doesn’t track payments.';

/** All balances zero. */
export const NO_PAYMENTS_TITLE = 'No payments needed';
export const NO_PAYMENTS_DESCRIPTION = 'Everyone broke even.';

/** Calculate Payments, its popup and its blocked explanation. */
export const CALCULATE_LABEL = 'Calculate Payments';
export const CALCULATING_LABEL = 'Calculating…';
export const CALCULATE_TITLE = 'Calculate Payments?';
export const CALCULATE_FINISH_LINE = 'This finishes the game. Results become read-only; you can reopen it later.';
export const CALCULATE_BLOCKED_TITLE = 'Can’t calculate Payments yet';

/** The word under a balance. */
export const BALANCE_CAPTION: Readonly<Record<BalanceDirection, string>> = {
  gain: 'Gets',
  loss: 'Pays',
  even: 'Even',
};
