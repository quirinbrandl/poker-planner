import type { Cents } from '../types';
import { FULL_SHARE, type ShareBasisPoints } from './presets';

/**
 * Tournament payouts in whole cents for each finishing place (Decision 14), 1st place first.
 *
 * Each paid place gets its exact share of `prizePoolCents` floored to whole cents; the leftover cents
 * then go one at a time to 1st, 2nd, 3rd … place until the whole pool is allocated. This is deliberately
 * not the cash-game largest-remainder rule. EUR 20.01 at 50/30/20 gives 10.01 / 6.00 / 4.00.
 *
 * Returns `finishingPlaces` amounts (default: one per paid place); places beyond the schedule get 0.
 * The amounts always sum to the pool.
 *
 * Preconditions (programming errors, thrown): `shares` is a valid schedule as returned by
 * `validatePayoutSchedule` (positive, summing to 100%), `prizePoolCents` is a nonnegative whole number,
 * and `finishingPlaces` is at least the number of paid places.
 */
export function prizeAmounts(
  prizePoolCents: Cents,
  shares: readonly ShareBasisPoints[],
  finishingPlaces: number = shares.length,
): Cents[] {
  if (!Number.isSafeInteger(prizePoolCents) || prizePoolCents < 0) {
    throw new Error(`Payouts: prize pool must be a nonnegative whole number of cents, got ${prizePoolCents}.`);
  }
  if (!Number.isSafeInteger(prizePoolCents * FULL_SHARE)) throw new Error('Payouts: prize pool is too large.');
  if (shares.length === 0 || shares.some((share) => !Number.isSafeInteger(share) || share <= 0)) {
    throw new Error('Payouts: shares must be positive whole basis points.');
  }
  if (shares.reduce((sum, share) => sum + share, 0) !== FULL_SHARE) throw new Error('Payouts: shares must sum to 100%.');
  if (!Number.isSafeInteger(finishingPlaces) || finishingPlaces < shares.length) {
    throw new Error('Payouts: there must be at least as many finishing places as paid places.');
  }
  const amounts = shares.map((share) => Math.floor((prizePoolCents * share) / FULL_SHARE));
  let leftover = prizePoolCents - amounts.reduce((sum, amount) => sum + amount, 0);
  for (let place = 0; leftover > 0; place = (place + 1) % amounts.length, leftover--) amounts[place] += 1;
  while (amounts.length < finishingPlaces) amounts.push(0);
  return amounts;
}
