/**
 * Extra fact rows the shared popups take in a tournament: the rebuy and late-entry popups add the
 * prize pool change; the forgotten-rebuy confirmation adds prize pool, payouts and the kept place.
 * Pass the result to `FactRow` (`rows.map((row) => <FactRow key={row.label} {...row} />)`).
 */
import type { FactRowProps } from '@/ui';

import type { ForgottenRebuyTournamentData, PrizePoolChange } from './types';

/** "Prize pool   EUR 140.00 → EUR 160.00". */
export function prizePoolChangeRow(change: PrizePoolChange): FactRowProps {
  return { label: 'Prize pool', value: `${change.beforeText} → ${change.afterText}` };
}

/** Prize pool and Payouts before → after, then "<name>   Stays out · 6th". */
export function forgottenRebuyTournamentRows(data: ForgottenRebuyTournamentData): FactRowProps[] {
  return [
    prizePoolChangeRow(data.prizePool),
    { label: 'Payouts', value: `${data.payouts.beforeText} → ${data.payouts.afterText}`, stacked: true },
    { label: data.name, value: `Stays out · ${data.placeLabel}` },
  ];
}
