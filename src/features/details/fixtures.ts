/** Development and test fixtures for Game details, continuing the Play story. */
import { CHIP_SET, fixtureChips, STARTING_MIX } from '@/features/play/fixtures';

import type { GameDetailsData } from './types';

const PLAYERS = ['Alice', 'Ben', 'Clara', 'David', 'Emma', 'Felix'].map((name) => ({
  id: name.toLocaleLowerCase(),
  name,
  note: null,
}));

const cash: GameDetailsData = {
  mode: 'cash',
  phase: 'inProgress',
  context: 'Cash game · 13 Nov, 19:30',
  backLabel: 'Games',
  createdText: '13 Nov 2026 · 19:30',
  finishedText: null,
  buyInText: 'EUR 20.00',
  chipValueText: 'EUR 0.10 per chip unit',
  blindsText: '1 / 2 chip units',
  depthText: '100 BB',
  coverageText: '4 payments of each blind',
  preferenceText: 'Fewer chips',
  reserveText: '3 stacks',
  startingStack: { unitsText: '200', chips: fixtureChips(STARTING_MIX) },
  chipSet: fixtureChips(CHIP_SET),
  players: [...PLAYERS, { id: 'nora', name: 'Nora', note: 'Joined late' }],
  payouts: null,
};

export const DETAILS_FIXTURES = {
  cash,
  /** Started at the nearest feasible depth with a reduced reserve: 196 = 98 × 2 units each. */
  'cash-adjusted': {
    ...cash,
    chipValueText: 'EUR 0.102 per chip unit',
    depthText: '98 BB (requested 100 BB)',
    reserveText: '1 stack (configured 3)',
    startingStack: { unitsText: '196', chips: fixtureChips([16, 1, 3, 1, 0]) },
    players: PLAYERS,
  },
  'cash-completed': {
    ...cash,
    phase: 'completed',
    context: 'Cash game · 13 Nov, 19:30 · finished 23:41',
    createdText: '13 Nov 2026 · 19:30',
    finishedText: '13 Nov 2026 · 23:41',
  },
  /** 6 buy-ins + 1 rebuy = EUR 140.00; Top 2 at 70 / 30. */
  tournament: {
    ...cash,
    mode: 'tournament',
    context: 'Tournament · 23 Nov, 19:30',
    createdText: '23 Nov 2026 · 19:30',
    chipValueText: 'No chip money value',
    players: PLAYERS,
    payouts: {
      name: 'Top 2',
      places: [
        { id: 'p1', placeLabel: '1st', shareText: '70%', amountText: 'EUR 98.00' },
        { id: 'p2', placeLabel: '2nd', shareText: '30%', amountText: 'EUR 42.00' },
      ],
      note: 'Prize pool EUR 140.00 · 6 buy-ins + 1 rebuy. Rebuys raise every prize; the percentages stay.',
    },
  },
} satisfies Record<string, GameDetailsData>;

export type DetailsFixtureName = keyof typeof DETAILS_FIXTURES;
