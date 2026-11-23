import type { ChipMix, DistributionPreference } from '../types';

/**
 * Chip inventories and mixes in this module use the shared `ChipMix` shape: one `{ value, count }`
 * entry per denomination of the game's chip set, in strictly ascending `value` order, zero counts
 * included. For an inventory (chip set, bank) `count` is the number of physical chips available;
 * for a stack it is the number of chips of that denomination in the stack. Every mix this module
 * returns has exactly the denominations, in the same order, of the inventory it was computed from.
 *
 * Inputs must be whole numbers: values positive and strictly ascending, counts nonnegative,
 * player/depth/coverage counts positive, reserve counts nonnegative. Violations are programmer
 * errors (the caller validates host input first) and throw a `RangeError`; every expected outcome,
 * including infeasibility, is returned as data.
 */

/** A blind pair in chip units. `small` is positive and at most `big / 2`. */
export interface Blinds {
  small: number;
  big: number;
}

/**
 * Returned instead of an answer when the deterministic work limit of one call is exhausted
 * (see `SEARCH_STEP_LIMIT`), so that no input can hang the phone and an unproven answer is never
 * presented as exact. Typical home games stay far below the limit. It can occur for large chip
 * sets with a demanding combination of settings, mostly the 'more' preference with a large
 * reserve, where proving the best mix needs very many exact reserve checks (about 0.6% of
 * generated sets with 5–8 denominations, hundreds of chips each, up to 20 players and a reserve
 * up to 10). The host can then change a setting (for example the reserve or the preference).
 * Identical inputs always give the same outcome.
 */
export interface SearchLimitReached {
  kind: 'searchLimitReached';
}

// ---------------------------------------------------------------------------------------------
// Initial distribution
// ---------------------------------------------------------------------------------------------

/** What the host configured in Planning. */
export interface InitialDistributionRequest {
  /** The game's chip set: every denomination with its available physical quantity. */
  chipSet: ChipMix;
  /** Number of initial players N (at least 1). */
  players: number;
  /** The host's requested starting stack depth in whole big blinds (at least 1). */
  requestedDepth: number;
  /** Configured blind-payment coverage k (at least 1). */
  coverage: number;
  /** Configured reserve target R: additional qualifying stacks to keep formable (0 allowed). */
  reserveTarget: number;
  preference: DistributionPreference;
}

/**
 * The recommended initial distribution. Every one of the N players receives `stackMix`; together
 * with `reserve` further qualifying stacks (whose mixes may differ) it fits the chip set at once.
 */
export interface InitialDistribution {
  /** Accepted depth D in whole big blinds. */
  depth: number;
  /** The depth the host asked for, unchanged. */
  requestedDepth: number;
  /** `depth !== requestedDepth`: the preview shows "requested → accepted". */
  depthAdjusted: boolean;
  /** Derived blinds. `small` is the largest representable amount at or below `big / 2`. */
  blinds: Blinds;
  /** `blinds.small * 2 === blinds.big`; false means the small blind was rounded down. */
  smallBlindIsHalf: boolean;
  /** Exact chip-unit value T = depth × big blind of every starting stack. */
  stackValue: number;
  /** The identical per-player mix, in the chip set's denomination order. Value is `stackValue`. */
  stackMix: ChipMix;
  /** Physical chips in one starting stack. */
  chipsPerStack: number;
  /** Achieved reserve r: qualifying stacks still simultaneously formable from `bank`. */
  reserve: number;
  /** The configured target R. */
  reserveTarget: number;
  /** `reserve < reserveTarget`: no depth supports the full target, so the highest achievable is used. */
  reserveReduced: boolean;
  /** The bank after issuing the N starting stacks: chip set minus N × `stackMix`. */
  bank: ChipMix;
}

/**
 * Why no initial distribution exists at any depth, even with zero reserve.
 * - `insufficientValue`: one player's share of the chip value (the chips that N identical
 *   stacks can draw from) cannot pay for even the smallest conceivable qualifying stack
 *   (1/2 blinds paid with 1-unit chips).
 * - `unsuitableDenominations`: the value would suffice, but the denominations cannot form any
 *   blind pair with a positive small blind ≤ big / 2 that an identical stack could afford, or
 *   cannot compose N identical stacks of an exact value.
 * - `insufficientBlindChips`: affordable blind pairs exist, but for none of them can each
 *   player's share of chips form k separate small-blind payments plus k big-blind payments.
 */
export type NoDistributionReason = 'insufficientValue' | 'unsuitableDenominations' | 'insufficientBlindChips';

export type InitialDistributionResult =
  | { kind: 'planned'; distribution: InitialDistribution }
  | { kind: 'noValidDistribution'; reason: NoDistributionReason }
  | SearchLimitReached;

// ---------------------------------------------------------------------------------------------
// Later stacks (rebuys and late entry)
// ---------------------------------------------------------------------------------------------

export interface LaterStackRequest {
  /** The current bank: what is available to issue right now. */
  bank: ChipMix;
  /** The game's locked blinds. */
  blinds: Blinds;
  /** The game's locked exact stack value T. */
  stackValue: number;
  /** The game's configured coverage k. */
  coverage: number;
  preference: DistributionPreference;
  /**
   * How many still-targeted reserved stacks must remain simultaneously formable after this
   * stack is issued: the unconsumed reserve target after counting this request, floored at
   * zero (with three guaranteed stacks remaining, pass 2). Zero once the target is exhausted.
   */
  reserveToKeep: number;
  /** True for a normal rebuy: permits a confirmed reduced-coverage fallback. False for late entry. */
  allowReducedCoverage: boolean;
}

/**
 * A proposed later stack. Nothing is issued; the caller records it after the host accepts.
 *
 * Reserve protection: let A be the number of qualifying stacks the current bank can form
 * simultaneously, counted up to `reserveToKeep + 1`. The proposal keeps
 * P = min(`reserveToKeep`, A − 1) qualifying stacks simultaneously formable after it is taken.
 * When the bank still supports the full guarantee, P = `reserveToKeep`; when history has weakened
 * it, the proposal protects what is actually achievable instead of refusing or consuming it.
 * Among the stacks that keep P, the proposal has the best chip count for the preference, then
 * more chips of the smaller denomination at the first difference in ascending order.
 */
export type LaterStackResult =
  | {
      kind: 'qualifying';
      /** Exact value T, full coverage k, within the bank. */
      mix: ChipMix;
      chips: number;
      /**
       * Still-targeted stacks the bank can form simultaneously after this one is issued
       * ("Reserve after rebuy"), at most `reserveToKeep`. Equals P above.
       */
      reserveAfter: number;
      /** `reserveAfter < reserveToKeep`: the remaining guarantee is weaker than its target. */
      reserveWeakened: boolean;
    }
  | {
      /**
       * Only when `allowReducedCoverage` and no fully qualifying stack exists: the exact-value
       * stack with the highest achievable coverage, then the best chip count, then the
       * small-denomination tie-break. Requires the host's explicit confirmation.
       */
      kind: 'reducedCoverage';
      mix: ChipMix;
      chips: number;
      /** Achieved coverage c, 0 ≤ c < k: c separate small-blind plus c big-blind payments. */
      achievedCoverage: number;
      /** Whether one small-blind payment alone can be made from this mix (matters when c = 0). */
      canPaySmallBlind: boolean;
      /** Whether one big-blind payment alone can be made from this mix (matters when c = 0). */
      canPayBigBlind: boolean;
      /** No qualifying stack was formable before, so none is formable after: always 0. */
      reserveAfter: 0;
      reserveWeakened: boolean;
    }
  | {
      kind: 'impossible';
      reason: LaterStackImpossibleReason;
      /**
       * For `coverageShortage`: the highest coverage any exact-value stack from the bank achieves
       * (below k), for "achievable / required". Otherwise null.
       */
      achievableCoverage: number | null;
    }
  | SearchLimitReached;

/**
 * - `insufficientValue`: the bank's total value is below T.
 * - `unsuitableDenominations`: the bank has the value, but no combination of its chips is exactly T.
 * - `coverageShortage`: exact-value stacks exist, but none has coverage k, and reduced coverage
 *   is not allowed (late entry).
 *
 * Reserve protection never makes a request impossible on its own: it only steers which
 * qualifying stack is proposed (see `LaterStackResult`).
 */
export type LaterStackImpossibleReason = 'insufficientValue' | 'unsuitableDenominations' | 'coverageShortage';

// ---------------------------------------------------------------------------------------------
// Measuring a given mix and a bank's reserve capacity
// ---------------------------------------------------------------------------------------------

export interface MixMeasurementRequest {
  mix: ChipMix;
  blinds: Blinds;
  /** The game's exact stack value T. */
  stackValue: number;
  /** The game's configured coverage k. */
  coverage: number;
}

export type MixMeasurementResult =
  | {
      kind: 'measured';
      /** Chip-unit value of the mix. */
      value: number;
      /** Physical chips in the mix. */
      chips: number;
      /**
       * The largest c ≤ k such that c small-blind and c big-blind payments can be made from
       * disjoint chips of the mix (a payment may use several chips; no chip is used twice).
       * Capped at k because nothing distinguishes coverages above the configured one.
       */
      coverage: number;
      /** `value === stackValue && coverage === k`. */
      qualifies: boolean;
      /** Whether one small-blind payment alone can be made exactly from the mix. */
      canPaySmallBlind: boolean;
      /** Whether one big-blind payment alone can be made exactly from the mix. */
      canPayBigBlind: boolean;
    }
  | SearchLimitReached;

export interface ReserveCapacityRequest {
  /** The inventory to examine, typically the current bank. */
  bank: ChipMix;
  blinds: Blinds;
  stackValue: number;
  coverage: number;
  /** Stop counting at this many stacks (for "x of y", pass y). */
  max: number;
}

/**
 * `stacks`: the largest s ≤ `max` such that s qualifying stacks (exact value T, coverage ≥ k,
 * mixes may differ) can be formed from the inventory at the same time, no chip used twice.
 */
export type ReserveCapacityResult = { kind: 'measured'; stacks: number } | SearchLimitReached;
