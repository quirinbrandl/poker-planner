/**
 * Development and test fixtures for late entry, continuing the Play story (see
 * `src/features/play/fixtures.ts`): Nora arrives while Alice … Felix are in the game.
 */
import { FIXTURE_CONTEXT, fixtureChips, STARTING_MIX } from '@/features/play/fixtures';

import type { AddPlayerData, EntryPopupData } from './types';

export const ADD_PLAYER_DATA: AddPlayerData = {
  context: FIXTURE_CONTEXT,
  terms: { buyInText: 'EUR 20.00', stackText: '200 chip units', blindsText: '1 / 2' },
  candidates: [
    { savedPlayerId: 'sp-alice', name: 'Alice', inGame: true },
    { savedPlayerId: 'sp-ben', name: 'Ben', inGame: true },
    { savedPlayerId: 'sp-clara', name: 'Clara', inGame: true },
    { savedPlayerId: 'sp-david', name: 'David', inGame: true },
    { savedPlayerId: 'sp-emma', name: 'Emma', inGame: true },
    { savedPlayerId: 'sp-felix', name: 'Felix', inGame: true },
    { savedPlayerId: 'sp-jonas', name: 'Jonas', inGame: false },
    { savedPlayerId: 'sp-nora', name: 'Nora', inGame: false },
  ],
};

const fullStack = { unitsText: '200', chips: fixtureChips(STARTING_MIX) };

/** The popup each Play story gives for a late arrival (same bank as the Play story of that name). */
const ENTRY_POPUPS = {
  /** Normal bank [45, 12, 11, 6, 1]: 2 achievable stacks, 1 left after Nora's. */
  normal: (name: string): EntryPopupData => ({
    kind: 'proposal',
    name,
    stack: fullStack,
    reserveAfter: { value: '1', unit: 'stack left' },
    initialContributionText: 'EUR 20.00',
    reserveNote: null,
  }),
  /** Target used up (bank [15, 8, 5, 4, 1]): still a fully qualifying stack. */
  exhausted: (name: string): EntryPopupData => ({
    kind: 'proposal',
    name,
    stack: fullStack,
    reserveAfter: { value: '0', unit: 'stacks left' },
    initialContributionText: 'EUR 20.00',
    reserveNote: 'More players can join when another fully qualifying stack is possible.',
  }),
  /** Ten 1-unit chips (bank [10, 9, 5, 4, 1]): the best exact stack covers 3 of 4. */
  reduced: (name: string): EntryPopupData => ({
    kind: 'blocked',
    name,
    reason: { kind: 'coverage', achieved: 3, required: 4, stackUnitsText: '200' },
  }),
  /** No 1-unit chips (bank [0, 6, 2, 3, 1]): only 2 × 100, coverage 0. */
  zero: (name: string): EntryPopupData => ({
    kind: 'blocked',
    name,
    reason: { kind: 'coverage', achieved: 0, required: 4, stackUnitsText: '200' },
  }),
  /** Bank [0, 6, 2, 1, 1]. */
  impossible: (name: string): EntryPopupData => ({
    kind: 'blocked',
    name,
    reason: {
      kind: 'allocation',
      message:
        'No exact 200-unit stack can be formed. The smaller chips make only 180 units, and the 500-unit chip cannot be split.',
    },
  }),
  /** Bank [0, 6, 2, 1, 0]. */
  shortage: (name: string): EntryPopupData => ({
    kind: 'blocked',
    name,
    reason: { kind: 'allocation', message: 'An exact 200-unit stack is needed, but the bank holds only 180 chip units.' },
  }),
  /** A tournament late entry also shows the prize pool change. */
  tournament: (name: string): EntryPopupData => ({
    kind: 'proposal',
    name,
    stack: fullStack,
    reserveAfter: { value: '1', unit: 'stack left' },
    initialContributionText: 'EUR 20.00',
    reserveNote: null,
    extraFacts: [{ label: 'Prize pool', value: 'EUR 140.00 → EUR 160.00' }],
  }),
} satisfies Record<string, (name: string) => EntryPopupData>;

export type EntryStoryName = keyof typeof ENTRY_POPUPS;

export function entryFixture(story: EntryStoryName, name: string): EntryPopupData {
  return ENTRY_POPUPS[story](name);
}
