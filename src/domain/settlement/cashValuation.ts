import type { ExactCents } from '../money';
import type { Cents } from '../types';
import { assertUniqueIds, assertWhole, type ParticipantId } from './participants';

function gcd(a: bigint, b: bigint): bigint {
  let x = a < BigInt(0) ? -a : a;
  let y = b < BigInt(0) ? -b : b;
  while (y !== BigInt(0)) [x, y] = [y, x % y];
  return x;
}

function toExact(numerator: bigint, denominator: bigint): ExactCents {
  const divisor = gcd(numerator, denominator) || BigInt(1);
  const n = Number(numerator / divisor);
  const d = Number(denominator / divisor);
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) {
    throw new Error('Settlement: exact amount exceeds the safe integer range.');
  }
  return { numerator: n, denominator: d };
}

/**
 * The exact cash-game rate in cents per chip unit: `buyInCents / stackUnits`, in lowest terms.
 * `buyInCents` is the shared buy-in (a positive whole number of cents) and `stackUnits` the accepted
 * starting stack's chip-unit value (a positive whole number). EUR 20.00 over 200 units gives
 * `{ numerator: 10, denominator: 1 }` (10 cents, EUR 0.10 per unit); EUR 20.40 over 200 units gives
 * `{ numerator: 51, denominator: 5 }` (EUR 0.102 per unit). Show it with `formatEurPerUnit`. Throws on non-positive or non-whole input (a programming error).
 */
export function cashRate(buyInCents: Cents, stackUnits: number): ExactCents {
  assertWhole(buyInCents, 'buy-in cents');
  assertWhole(stackUnits, 'stack chip units');
  if (buyInCents <= 0 || stackUnits <= 0) throw new Error('Settlement: buy-in and stack value must be positive.');
  return toExact(BigInt(buyInCents), BigInt(stackUnits));
}

/**
 * The exact money value of `chipUnits` at `rate`: `chipUnits × rate`, in lowest terms. `chipUnits`
 * is a whole number and may be negative, so the same function gives a player's exact monetary result
 * (their final chip units) and the money equivalent of a chip-unit shortage or surplus.
 */
export function exactChipValue(chipUnits: number, rate: ExactCents): ExactCents {
  assertWhole(chipUnits, 'chip units');
  return toExact(BigInt(chipUnits) * BigInt(rate.numerator), BigInt(rate.denominator));
}

/**
 * A player's exact win or loss before cent allocation: `finalUnits × rate − contributionsCents`.
 * Positive is a win. Show it with `formatSignedExactEur`.
 */
export function exactWinLoss(finalUnits: number, contributionsCents: Cents, rate: ExactCents): ExactCents {
  assertWhole(finalUnits, 'final chip units');
  assertWhole(contributionsCents, 'contribution cents');
  const d = BigInt(rate.denominator);
  return toExact(BigInt(finalUnits) * BigInt(rate.numerator) - BigInt(contributionsCents) * d, d);
}

/** One cash-game player for {@link allocateCashResults}. */
export interface CashResultInput {
  readonly id: ParticipantId;
  /** Confirmed final chip-unit value: a nonnegative whole number. */
  readonly finalUnits: number;
}

/** A player's final monetary result in whole cents, before subtracting contributions. */
export interface AllocatedResult {
  readonly id: ParticipantId;
  readonly finalResult: Cents;
}

/**
 * Allocates cash-game final monetary results in whole cents at completion (Decision 14).
 *
 * `players` must be in joining order. Each exact result `finalUnits × rate` is floored to whole
 * cents; the remaining cents go one each to players in descending order of their discarded
 * fractional-cent remainder, equal remainders to the earlier-joined player, until the results sum to
 * `totalContributionsCents`. Returns one entry per player in input order.
 *
 * Precondition: chip accounting balances, i.e. the exact results sum to exactly
 * `totalContributionsCents`. The caller validates that first; a violation is a programming error and
 * throws rather than distributing a discrepancy.
 */
export function allocateCashResults(
  rate: ExactCents,
  players: readonly CashResultInput[],
  totalContributionsCents: Cents,
): AllocatedResult[] {
  assertUniqueIds(players);
  assertWhole(totalContributionsCents, 'total contributions');
  const n = BigInt(rate.numerator);
  const d = BigInt(rate.denominator);
  let exactTotal = BigInt(0);
  const floors: bigint[] = [];
  const remainders: bigint[] = [];
  for (const player of players) {
    assertWhole(player.finalUnits, 'final chip units');
    if (player.finalUnits < 0) throw new Error('Settlement: final chip units must not be negative.');
    const value = BigInt(player.finalUnits) * n;
    exactTotal += value;
    floors.push(value / d);
    remainders.push(value % d);
  }
  if (exactTotal !== BigInt(totalContributionsCents) * d) {
    throw new Error(
      'Settlement: exact cash results do not sum to total contributions; chip accounting must balance before allocation.',
    );
  }
  const floorTotal = floors.reduce((sum, value) => sum + value, BigInt(0));
  const leftover = Number(BigInt(totalContributionsCents) - floorTotal);
  const order = players
    .map((_, index) => index)
    .sort((a, b) => (remainders[a] === remainders[b] ? a - b : remainders[a] > remainders[b] ? -1 : 1));
  const extra = new Set(order.slice(0, leftover));
  return players.map((player, index) => ({
    id: player.id,
    finalResult: Number(floors[index]) + (extra.has(index) ? 1 : 0),
  }));
}
