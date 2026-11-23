import type { BalanceDirection } from './types';

/** All balances zero. */
export const NO_PAYMENTS_TITLE = 'No payments needed';
export const NO_PAYMENTS_DESCRIPTION = 'Everyone broke even.';

/** Calculate Payments, its popup and its blocked explanation. */
export const CALCULATE_LABEL = 'Calculate Payments';
export const CALCULATING_LABEL = 'Calculating…';
export const CALCULATE_TITLE = 'Calculate Payments?';
export const CALCULATE_FINISH_LINE = 'Finishes the game. You can reopen it later.';
export const CALCULATE_BLOCKED_TITLE = 'Can’t calculate Payments yet';

/** The spoken word before a balance (the sign and colour show it on screen). */
export const BALANCE_CAPTION: Readonly<Record<BalanceDirection, string>> = {
  gain: 'Gets',
  loss: 'Pays',
  even: 'Even',
};
