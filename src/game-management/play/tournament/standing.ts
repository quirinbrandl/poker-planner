/**
 * The derived standing of a tournament: places, the sole remaining winner and the payout of each
 * place, from an elimination order (earliest first), the roster and the locked payout schedule.
 * Nothing here is stored.
 */
import { formatEur } from '@/domain/money';
import { placeLabel, prizeAmounts } from '@/domain/payouts';
import type { Cents } from '@/domain/types';

import type { LockedPayoutSchedule, PlayRecord, RosterEntry } from '../../core/documents';
import { formatCount } from '../../shared/numbers';
import { eliminationOrder, issuancesOf, totalContributions } from '../ledger';

export interface Standing {
  /** Roster size N: the first one out finishes Nth. */
  size: number;
  roster: readonly RosterEntry[];
  /** Eliminated participant ids, earliest first. */
  order: readonly string[];
  /** Players not eliminated, in joining order. */
  remaining: readonly RosterEntry[];
  /** The sole remaining player, or `null` while more than one is left. */
  winner: RosterEntry | null;
  /** All contributions (buy-ins, rebuys, late entries). */
  prizePool: Cents;
  /** Payout of each paid place, 1st first. */
  amounts: readonly Cents[];
}

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${formatCount(count)} ${count === 1 ? one : many}`;

export function standing(
  play: PlayRecord,
  schedule: LockedPayoutSchedule,
  order: readonly string[] = eliminationOrder(play),
): Standing {
  const prizePool = totalContributions(play.issuances);
  const remaining = play.roster.filter((p) => !order.includes(p.id));
  return {
    size: play.roster.length,
    roster: play.roster,
    order,
    remaining,
    winner: remaining.length === 1 ? remaining[0] : null,
    prizePool,
    amounts: prizeAmounts(prizePool, schedule.shares),
  };
}

/** The finishing place of a participant: eliminated (N − index) or the winner (1); `null` while still in. */
export function placeOf(s: Standing, participantId: string): number | null {
  const index = s.order.indexOf(participantId);
  if (index >= 0) return s.size - index;
  return s.winner?.id === participantId ? 1 : null;
}

/** The payout at a place, or `null` for an unpaid place. */
export function payoutAt(s: Standing, place: number): Cents | null {
  return place >= 1 && place <= s.amounts.length ? s.amounts[place - 1] : null;
}

/** "EUR 42.00" or "No payout". */
export function payoutText(s: Standing, place: number): string {
  const amount = payoutAt(s, place);
  return amount === null ? 'No payout' : formatEur(amount);
}

/** "EUR 42.00" or "no payout" (inside a line). */
export function payoutInline(s: Standing, place: number): string {
  const amount = payoutAt(s, place);
  return amount === null ? 'no payout' : formatEur(amount);
}

export function nameOf(s: Standing, participantId: string): string {
  return s.roster.find((p) => p.id === participantId)?.name ?? '';
}

/** The participant's contributions: "EUR 40.00 · 1 rebuy". */
export function contributionText(play: PlayRecord, participantId: string): string {
  const issued = issuancesOf(play, participantId);
  const rebuys = issued.filter((i) => i.kind === 'rebuy').length;
  return `${formatEur(totalContributions(issued))}${rebuys > 0 ? ` · ${plural(rebuys, 'rebuy')}` : ''}`;
}

/** "1st–4th" for the places still open with `count` players left. */
export function openRangeLabel(count: number): string {
  return count === 1 ? placeLabel(1) : `${placeLabel(1)}–${placeLabel(count)}`;
}
