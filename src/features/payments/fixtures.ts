/**
 * Development and test fixtures for Calculate Payments? and Payments, taken from the approved
 * prototype (cash) and the tournament draft. Balances and payments are consistent by hand: every
 * player's payments net to their balance. Not a settlement solver.
 */
import { formatEur, formatSignedEur } from '@/domain/money';

import type {
  BalanceRow,
  CalculatePaymentsData,
  PaymentInstruction,
  PaymentsData,
  PaymentsMode,
} from './types';

interface CashPlayer {
  name: string;
  /** Final result in cents. */
  final: number;
  /** Buy-ins (with rebuys) in cents. */
  buyIns: number;
}

interface TournamentPlayer {
  name: string;
  place: number;
  payout: number;
  buyIns: number;
}

type Payment = readonly [from: string, to: string, cents: number];

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

function direction(cents: number): BalanceRow['direction'] {
  if (cents > 0) return 'gain';
  return cents < 0 ? 'loss' : 'even';
}

function summary(payments: readonly Payment[]): PaymentsData['summary'] {
  if (payments.length === 0) return { kind: 'noPayments' };
  const instructions: PaymentInstruction[] = payments.map(([from, to, cents], index) => ({
    id: `p${index}`,
    fromName: from,
    toName: to,
    amountText: formatEur(cents),
  }));
  const total = payments.reduce((sum, [, , cents]) => sum + cents, 0);
  return {
    kind: 'payments',
    countText: `${payments.length} ${payments.length === 1 ? 'payment' : 'payments'}`,
    totalText: `${formatEur(total)} in total`,
    payments: instructions,
  };
}

function checkNets(balances: Readonly<Record<string, number>>, payments: readonly Payment[]) {
  const net: Record<string, number> = {};
  for (const [from, to, cents] of payments) {
    net[from] = (net[from] ?? 0) - cents;
    net[to] = (net[to] ?? 0) + cents;
  }
  for (const [name, balance] of Object.entries(balances)) {
    if ((net[name] ?? 0) !== balance) throw new Error(`Fixture payments for ${name} net ${net[name] ?? 0}, expected ${balance}`);
  }
}

function cash(players: readonly CashPlayer[], payments: readonly Payment[], context = CASH_CONTEXT): PaymentsData {
  checkNets(Object.fromEntries(players.map((p) => [p.name, p.final - p.buyIns])), payments);
  return {
    mode: 'cash',
    context,
    summary: summary(payments),
    balances: players.map((player, index) => {
      const balance = player.final - player.buyIns;
      return {
        participantId: `p-${index}`,
        name: player.name,
        placeLabel: null,
        placeHighlight: false,
        lines: [`Final result ${formatEur(player.final)}`, `Buy-ins ${formatEur(player.buyIns)}`],
        balanceText: formatSignedEur(balance),
        direction: direction(balance),
      };
    }),
  };
}

function tournament(players: readonly TournamentPlayer[], payments: readonly Payment[]): PaymentsData {
  checkNets(Object.fromEntries(players.map((p) => [p.name, p.payout - p.buyIns])), payments);
  return {
    mode: 'tournament',
    context: 'Tournament · 23 Nov, 19:30 · finished 23:41',
    summary: summary(payments),
    balances: players.map((player, index) => {
      const balance = player.payout - player.buyIns;
      return {
        participantId: `p-${index}`,
        name: player.name,
        placeLabel: ORDINAL[player.place - 1],
        placeHighlight: player.place === 1,
        lines: [player.payout > 0 ? `Payout ${formatEur(player.payout)}` : 'No payout', `Buy-ins ${formatEur(player.buyIns)}`],
        balanceText: formatSignedEur(balance),
        direction: direction(balance),
      };
    }),
  };
}

const CASH_CONTEXT = 'Cash game · 23 Nov, 19:30 · finished 23:41';

const eur = (amount: number) => Math.round(amount * 100);
const player = (name: string, final: number, buyIns = 20): CashPlayer => ({ name, final: eur(final), buyIns: eur(buyIns) });
const pay = (from: string, to: string, amount: number): Payment => [from, to, eur(amount)];

export const PAYMENTS_FIXTURES = {
  /** 6 players, 2 rebuys, +13 / −8 / +8 / −7 / −6 / 0 → 3 payments. */
  ready: cash(
    [player('Alice', 33), player('Bob', 32, 40), player('Clara', 28), player('David', 33, 40), player('Emma', 14), player('Felix', 20)],
    [pay('Bob', 'Clara', 8), pay('David', 'Alice', 7), pay('Emma', 'Alice', 6)],
  ),
  /** Everyone breaks even. */
  even: cash(
    [player('Alice', 20), player('Bob', 40, 40), player('Clara', 20), player('David', 20), player('Emma', 20), player('Felix', 20)],
    [],
  ),
  /** Alice and Bob, EUR 30 / EUR 10 → Bob pays Alice EUR 10.00. */
  two: cash([player('Alice', 30), player('Bob', 10)], [pay('Bob', 'Alice', 10)]),
  /** EUR 10.01 buy-ins: allocated cents. */
  cents: cash(
    [player('Alice', 12.51, 10.01), player('Bob', 8.75, 10.01), player('Clara', 8.77, 10.01), player('David', 10.01, 10.01)],
    [pay('Bob', 'Alice', 1.26), pay('Clara', 'Alice', 1.24)],
  ),
  /** 12 players, 3 rebuys, 11 nonzero balances → 10 payments. */
  big: cash(
    [
      player('Alice', 51.5),
      player('Bob', 25.4, 40),
      player('Clara', 38.2),
      player('David', 28.7, 40),
      player('Emma', 10.2),
      player('Felix', 11.3),
      player('Grace', 32.4),
      player('Hana', 12.9),
      player('Ivan', 27.9),
      player('Jonas', 27.6, 40),
      player('Kai', 13.9),
      player('Lena', 20),
    ],
    [
      pay('Bob', 'Alice', 14.6),
      pay('Jonas', 'Alice', 12.4),
      pay('David', 'Alice', 4.5),
      pay('David', 'Clara', 6.8),
      pay('Emma', 'Clara', 9.8),
      pay('Felix', 'Clara', 1.6),
      pay('Felix', 'Grace', 7.1),
      pay('Hana', 'Grace', 5.3),
      pay('Hana', 'Ivan', 1.8),
      pay('Kai', 'Ivan', 6.1),
    ],
  ),
  /** Prize pool EUR 140.00, Top 2: Alice 1st EUR 98.00, Clara 2nd EUR 42.00 → 5 payments. */
  tournament: tournament(
    [
      { name: 'Alice', place: 1, payout: eur(98), buyIns: eur(20) },
      { name: 'Bob', place: 3, payout: 0, buyIns: eur(40) },
      { name: 'Clara', place: 2, payout: eur(42), buyIns: eur(20) },
      { name: 'David', place: 5, payout: 0, buyIns: eur(20) },
      { name: 'Emma', place: 4, payout: 0, buyIns: eur(20) },
      { name: 'Felix', place: 6, payout: 0, buyIns: eur(20) },
    ],
    [pay('Bob', 'Alice', 40), pay('David', 'Alice', 20), pay('Emma', 'Clara', 20), pay('Felix', 'Alice', 18), pay('Felix', 'Clara', 2)],
  ),
} satisfies Record<string, PaymentsData>;

export type PaymentsFixtureName = keyof typeof PAYMENTS_FIXTURES;

/** Calculate Payments? for each mode. */
export const CALCULATE_FIXTURES: Readonly<Record<PaymentsMode, CalculatePaymentsData>> = {
  cash: { readyLine: 'All 6 counted · 1,600 chip units', facts: [] },
  tournament: {
    readyLine: 'Alice wins · all 5 eliminations recorded',
    facts: [
      { label: 'Prize pool', value: 'EUR 140.00' },
      { label: '1st · Alice', value: 'EUR 98.00' },
      { label: '2nd · Clara', value: 'EUR 42.00' },
    ],
  },
};

/** The one reason Calculate Payments is unavailable in the `short` fixture. */
export const CALCULATE_BLOCKED_REASON = 'Find the missing chips first.';
