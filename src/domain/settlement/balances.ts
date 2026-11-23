import type { Cents } from '../types';
import { assertUniqueIds, assertWhole, type ParticipantId } from './participants';

/** One player's final monetary result and total contributions, both in whole cents. */
export interface BalanceInput {
  readonly id: ParticipantId;
  /** Allocated cash-game result or tournament payout, before subtracting contributions. */
  readonly finalResult: Cents;
  /** Total of the player's buy-in and rebuys. */
  readonly contributions: Cents;
}

/** A player balance: positive receives money, negative owes money, zero takes no part in Payments. */
export interface PlayerBalance {
  readonly id: ParticipantId;
  readonly balance: Cents;
}

/**
 * Player balances (Decision 15): `finalResult − contributions` per player, in input order.
 * Pass players in joining order so the result can go straight to `settlePayments`.
 *
 * Precondition: final results sum to total contributions (guaranteed by `allocateCashResults` and
 * `prizeAmounts`). Throws if the balances would not sum to exactly zero.
 */
export function playerBalances(players: readonly BalanceInput[]): PlayerBalance[] {
  assertUniqueIds(players);
  let total = 0;
  const balances = players.map(({ id, finalResult, contributions }) => {
    assertWhole(finalResult, 'final result');
    assertWhole(contributions, 'contributions');
    const balance = finalResult - contributions;
    total += balance;
    return { id, balance };
  });
  if (total !== 0) throw new Error(`Settlement: balances sum to ${total} cents instead of zero.`);
  return balances;
}
