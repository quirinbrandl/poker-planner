/**
 * The Distribution preview step's read model and the Start operation's contract.
 *
 * The preview is derived, never stored: every read recomputes it from the current draft, so an
 * edit to players, chip set or settings always shows a fresh recommendation against the host's
 * requested depth and configured reserve. Nothing is issued before Start.
 */
import type { Cents, ChipColor } from '@/domain/types';

import type { Accepted, GameAccessCode, Rejected } from '../core/results';

/** One denomination of a stack or of the bank, with the colour configured in the chip set. */
export interface ChipCountView {
  /** Chip-unit value. */
  value: number;
  color: ChipColor | null;
  /** Physical chips of this denomination (0 allowed). */
  count: number;
}

/** A feasible recommendation. Start is available. */
export interface DistributionPlanView {
  /** Number of initial players N: each receives the same starting stack. */
  players: number;
  stack: {
    /** Exact chip-unit value of every starting stack (depth × big blind). */
    value: number;
    /** Physical chips in one starting stack. */
    chips: number;
    /** One entry per denomination of the chip set, ascending by value, zero counts included. */
    mix: readonly ChipCountView[];
  };
  depth: {
    /** The depth this recommendation uses, in whole big blinds. */
    bb: number;
    /** The depth the host asked for in Game settings. */
    requestedBb: number;
    /** `bb !== requestedBb`: show the amber "requested → used" diff. Start accepts the used depth. */
    adjusted: boolean;
  };
  blinds: {
    small: number;
    big: number;
    /** "1 / 2". */
    text: string;
    /** The small blind is below half the big blind ("Rounded SB"). */
    rounded: boolean;
  };
  money:
    | {
        kind: 'cash';
        buyIn: Cents;
        /** "EUR 20.00". */
        buyInText: string;
        /** The exact fixed rate, "EUR 0.10 / unit". */
        rateText: string;
      }
    | {
        kind: 'tournament';
        buyIn: Cents;
        /** "EUR 20.00". */
        buyInText: string;
        /** Initial prize pool: players × buy-in. */
        prizePool: Cents;
        /** "EUR 120.00". */
        prizePoolText: string;
      };
  reserve: {
    /** Reserved stacks this recommendation keeps formable from the bank at the same time. */
    stacks: number;
    /** The configured target from Game settings (automatic or custom). */
    target: number;
    /** `stacks < target`: show the amber "target → stacks" diff and "stacks of target possible". */
    reduced: boolean;
  };
  bank: {
    /** Physical chips left unissued after the N starting stacks. */
    chips: number;
    /** One entry per denomination of the chip set, ascending by value, zero counts included. */
    mix: readonly ChipCountView[];
  };
}

/** Why no distribution exists at any depth, even with zero reserve. */
export type NoValidDistributionReason = 'insufficientValue' | 'unsuitableDenominations' | 'insufficientBlindChips';

export type DistributionPreviewView =
  /** A step still has problems; they are listed in `preview.blockers`. */
  | { kind: 'setupIncomplete' }
  | { kind: 'planned'; plan: DistributionPlanView }
  | {
      kind: 'noValidDistribution';
      reason: NoValidDistributionReason;
      /** Short name of the shortfall, e.g. "Not enough chip value". */
      title: string;
      /** One or two concise sentences naming the shortfall with the game's numbers. */
      message: string;
    }
  /** The chip set is too large to work out reliably on the phone; the host must simplify it. */
  | { kind: 'tooComplex'; message: string };

/** What the host saw and confirmed in the Start popup. Start is rejected if the preview differs. */
export interface StartAcceptance {
  depthBb: number;
  reserveStacks: number;
}

export type StartCode = GameAccessCode | 'setupIncomplete' | 'noValidDistribution' | 'previewChanged';

/** `accepted`: the game is In progress and the starting stacks are recorded as handed out. */
export type StartResult = Accepted | Rejected<StartCode>;
