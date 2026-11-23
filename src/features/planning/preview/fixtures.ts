/**
 * Development and test fixtures for Distribution preview: internally consistent plans
 * (stack value = depth × big blind, bank = chip set − players × stack mix).
 */
import { formatEur, formatEurPerUnit } from '@/domain/money';
import type { Cents, ChipColor } from '@/domain/types';
import type { DistributionPlanView, DistributionPreviewView, Problem } from '@/game-management';

import type { PreviewData } from './types';

interface Denomination {
  value: number;
  color: ChipColor | null;
  /** Chips of this denomination in one starting stack. */
  perStack: number;
  /** Chips of this denomination in the chip set. */
  total: number;
}

interface PlanInput {
  mode?: 'cash' | 'tournament';
  players?: number;
  chips: readonly Denomination[];
  depth: number;
  requestedDepth?: number;
  small: number;
  big: number;
  buyIn?: Cents;
  reserve: number;
  reserveTarget?: number;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function fixturePlan({
  mode = 'cash',
  players = 6,
  chips,
  depth,
  requestedDepth = depth,
  small,
  big,
  buyIn = 2000 as Cents,
  reserve,
  reserveTarget = reserve,
}: PlanInput): DistributionPlanView {
  const value = chips.reduce((sum, chip) => sum + chip.value * chip.perStack, 0);
  if (value !== depth * big) throw new Error(`Fixture stack is ${value}, expected ${depth * big}`);
  const bankMix = chips.map((chip) => ({ value: chip.value, color: chip.color, count: chip.total - players * chip.perStack }));
  if (bankMix.some((chip) => chip.count < 0)) throw new Error('Fixture chip set is too small');
  const divisor = gcd(buyIn, value);
  return {
    players,
    stack: {
      value,
      chips: chips.reduce((sum, chip) => sum + chip.perStack, 0),
      mix: chips.map((chip) => ({ value: chip.value, color: chip.color, count: chip.perStack })),
    },
    depth: { bb: depth, requestedBb: requestedDepth, adjusted: depth !== requestedDepth },
    blinds: { small, big, text: `${small} / ${big}`, rounded: small * 2 < big },
    money:
      mode === 'cash'
        ? {
            kind: 'cash',
            buyIn,
            buyInText: formatEur(buyIn),
            rateText: formatEurPerUnit({ numerator: buyIn / divisor, denominator: value / divisor }),
          }
        : {
            kind: 'tournament',
            buyIn,
            buyInText: formatEur(buyIn),
            prizePool: (buyIn * players) as Cents,
            prizePoolText: formatEur((buyIn * players) as Cents),
          },
    reserve: { stacks: reserve, target: reserveTarget, reduced: reserve < reserveTarget },
    bank: { chips: bankMix.reduce((sum, chip) => sum + chip.count, 0), mix: bankMix },
  };
}

const STANDARD: readonly Denomination[] = [
  { value: 1, color: 'grey', perStack: 15, total: 200 },
  { value: 5, color: 'red', perStack: 2, total: 150 },
  { value: 25, color: 'blue', perStack: 3, total: 100 },
  { value: 100, color: 'green', perStack: 1, total: 50 },
];

const STANDARD_PLAN = { chips: STANDARD, depth: 100, small: 1, big: 2, reserve: 3 } as const;

const TOP_2: NonNullable<PreviewData['payouts']> = {
  name: 'Top 2',
  places: [
    { id: 'p1', placeLabel: '1st', shareText: '70%', amountText: 'EUR 84.00' },
    { id: 'p2', placeLabel: '2nd', shareText: '30%', amountText: 'EUR 36.00' },
  ],
};

const problem = (code: Problem['code'], field: Problem['field'], message: string): Problem => ({ code, field, message });

function planned(plan: DistributionPlanView, payouts: PreviewData['payouts'] = null): PreviewData {
  return {
    mode: plan.money.kind,
    playerCount: plan.players,
    payouts,
    preview: { blockers: [], setupComplete: true, distribution: { kind: 'planned', plan }, canStart: true },
  };
}

function blocked(
  mode: 'cash' | 'tournament',
  distribution: Exclude<DistributionPreviewView, { kind: 'planned' }>,
  blockers: PreviewData['preview']['blockers'] = [],
): PreviewData {
  return {
    mode,
    playerCount: 6,
    payouts: mode === 'tournament' ? TOP_2 : null,
    preview: { blockers, setupComplete: blockers.length === 0, distribution, canStart: false },
  };
}

export const PREVIEW_FIXTURES = {
  feasible: planned(fixturePlan(STANDARD_PLAN)),
  'zero-reserve': planned(
    fixturePlan({
      chips: [
        { value: 1, color: 'grey', perStack: 15, total: 90 },
        { value: 5, color: 'red', perStack: 12, total: 72 },
        { value: 25, color: 'blue', perStack: 5, total: 30 },
      ],
      depth: 100,
      small: 1,
      big: 2,
      reserve: 0,
    }),
  ),
  'rounded-sb': planned(
    fixturePlan({
      chips: [
        { value: 2, color: 'white', perStack: 10, total: 300 },
        { value: 5, color: 'red', perStack: 6, total: 300 },
        { value: 25, color: 'blue', perStack: 6, total: 200 },
        { value: 100, color: 'black', perStack: 3, total: 100 },
      ],
      depth: 100,
      small: 2,
      big: 5,
      reserve: 3,
    }),
  ),
  'alt-depth': planned(
    fixturePlan({
      chips: [
        { value: 1, color: 'grey', perStack: 16, total: 144 },
        { value: 5, color: 'red', perStack: 1, total: 9 },
        { value: 25, color: 'blue', perStack: 7, total: 63 },
      ],
      depth: 98,
      requestedDepth: 100,
      small: 1,
      big: 2,
      reserve: 3,
    }),
  ),
  'reduced-reserve': planned(
    fixturePlan({
      chips: [
        { value: 1, color: 'grey', perStack: 12, total: 84 },
        { value: 28, color: 'blue', perStack: 1, total: 9 },
      ],
      depth: 20,
      small: 1,
      big: 2,
      reserve: 1,
      reserveTarget: 3,
    }),
  ),
  both: planned(
    fixturePlan({
      chips: [
        { value: 1, color: 'grey', perStack: 16, total: 112 },
        { value: 5, color: 'red', perStack: 1, total: 7 },
        { value: 25, color: 'blue', perStack: 7, total: 49 },
      ],
      depth: 98,
      requestedDepth: 100,
      small: 1,
      big: 2,
      reserve: 1,
      reserveTarget: 3,
    }),
  ),
  tournament: planned(fixturePlan({ ...STANDARD_PLAN, mode: 'tournament' }), TOP_2),
  incomplete: blocked('cash', { kind: 'setupIncomplete' }, [
    { step: 'chipSet', title: 'Chip set', problems: [problem('noDenominations', 'chipSet', 'Add at least one denomination.')] },
    { step: 'settings', title: 'Game settings', problems: [problem('buyInMissing', 'buyIn', 'Enter the buy-in per player.')] },
  ]),
  'tournament-incomplete': blocked('tournament', { kind: 'setupIncomplete' }, [
    {
      step: 'payouts',
      title: 'Payout schedule',
      problems: [problem('payoutTotalNotHundred', 'payoutSchedule', 'Total is 95%, needs 100%.')],
    },
  ]),
  'no-valid-value': blocked('cash', {
    kind: 'noValidDistribution',
    reason: 'insufficientValue',
    title: 'Not enough chip value',
    message: 'The chip set holds 900 chip units, but 6 stacks of 200 need 1,200.',
  }),
  'no-valid-coverage': blocked('cash', {
    kind: 'noValidDistribution',
    reason: 'insufficientBlindChips',
    title: 'Not enough blind-paying chips',
    message: 'Each stack needs chips for 4 separate small and big blind payments; the chip set has 18 chips of value 1 for 6 players.',
  }),
  'no-valid-denom': blocked('cash', {
    kind: 'noValidDistribution',
    reason: 'unsuitableDenominations',
    title: 'Unsuitable denominations',
    message: 'With chips of 25 and 100, no stack can pay a small blind of 1.',
  }),
  'too-complex': blocked('cash', {
    kind: 'tooComplex',
    message: 'This chip set has too many denominations to work out on the phone. Remove a few rarely used ones.',
  }),
} satisfies Record<string, PreviewData>;

export type PreviewFixtureName = keyof typeof PREVIEW_FIXTURES;
