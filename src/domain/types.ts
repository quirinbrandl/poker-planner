/**
 * Vocabulary shared by the pure domain modules, game management and the UI.
 * Terms follow CONTEXT.md. Keep this file small: only types that more than one module needs.
 */

export type GameMode = 'cash' | 'tournament';

export type GamePhase = 'planning' | 'inProgress' | 'completed';

/** The host's choice to minimize or maximize physical chips in an allocation. */
export type DistributionPreference = 'fewer' | 'more';

/** Optional cosmetic colour of a denomination. `null` means "No color". Never affects any calculation. */
export const CHIP_COLORS = [
  'white',
  'grey',
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'black',
  'orange',
  'pink',
  'brown',
] as const;
export type ChipColor = (typeof CHIP_COLORS)[number];

/** One validated denomination of a chip set: positive whole chip-unit value, nonnegative whole quantity. */
export interface ChipDenomination {
  value: number;
  quantity: number;
  color: ChipColor | null;
}

/**
 * Physical chips of one denomination inside a stack, a final chip count or the bank.
 * A mix is an array of these in ascending `value` order with one entry per denomination
 * of the game's chip set; a denomination that is not used has `count: 0`.
 */
export interface ChipCount {
  value: number;
  count: number;
}
export type ChipMix = readonly ChipCount[];

/** Whole EUR cents. All monetary inputs, results and payment instructions use this unit. */
export type Cents = number;
