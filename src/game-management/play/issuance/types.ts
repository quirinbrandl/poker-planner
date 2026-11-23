/**
 * What the rebuy and late-entry operations return: the popups' content ready to render, the
 * acceptance to pass back when the host confirms, and the result unions.
 */
import type { Cents } from '@/domain/types';

import type { Accepted, NeedsConfirmation, Rejected } from '../../core/results';
import type { DisplayChip } from '../view';

/** The actual stack the host hands out, exactly as allocated. */
export interface HandoutStack {
  /** The stack's exact chip-unit total, digits only: "200". */
  unitsText: string;
  /** The actual denomination mix, ascending by value, zero counts included. */
  chips: readonly DisplayChip[];
}

/** An extra label / value row in an issuance popup, e.g. a tournament's "Prize pool" change. */
export interface ExtraFact {
  /** "Prize pool". */
  label: string;
  /** "EUR 140.00 → EUR 160.00". */
  value: string;
}

/** Simultaneously achievable still-targeted reserve after the proposed issuance. */
export interface ReserveAfter {
  /** The count, digits only: "1", "0". */
  value: string;
  /** "stack left" / "stacks left". */
  unit: string;
}

/** Blind-payment coverage of a proposed rebuy that falls short of the configured requirement. */
export interface ReducedCoverage {
  /** Payments of each blind the stack can make with separate chips (may be 0). */
  achieved: number;
  /** Configured blind-payment coverage, e.g. 4. */
  required: number;
}

/** Why no stack can be issued. Nothing is recorded in any of these cases. */
export type IssueBlockReason =
  /** An exact-value stack exists but cannot reach full coverage (late entry only). */
  | { kind: 'coverage'; achieved: number; required: number; stackUnitsText: string }
  /** No exact-value combination, not enough value, or too complex to work out: the requirement in words. */
  | { kind: 'allocation'; message: string };

/** The rebuy popup's content. */
export type RebuyPopupData =
  | {
      kind: 'proposal';
      /** The participant the rebuy is for. */
      playerId: string;
      /** Captured name, for the title "Rebuy for Ben". */
      playerName: string;
      /** The actual proposed stack. */
      stack: HandoutStack;
      /** Set when no fully qualifying stack exists: needs explicit Accept & issue. */
      reducedCoverage: ReducedCoverage | null;
      reserveAfter: ReserveAfter;
      /** The rebuy price: "EUR 20.00". */
      priceText: string;
      /** The player's contributions plus the price: "EUR 60.00". */
      newTotalText: string;
      /**
       * "More rebuys are still allowed when another stack is possible." (target used up) or
       * "1 of 2 still-targeted stacks can be supplied." (weakened), else `null`.
       */
      reserveNote: string | null;
      /** Tournaments: the prize pool change. */
      extraFacts?: readonly ExtraFact[];
    }
  | {
      kind: 'blocked';
      playerId: string;
      playerName: string;
      /** The exact requirement and the shortfall in words. */
      message: string;
    };

/** A saved (reusable) player in the late-entry selection list. */
export interface EntryCandidate {
  savedPlayerId: string;
  /** Current saved name. */
  name: string;
  /** Already a participant of this game (same saved player or the same name): unavailable. */
  inGame: boolean;
}

/** Add player (`play.getAddPlayer`), without the context line. */
export interface AddPlayerScreenView {
  terms: {
    /** "EUR 20.00". */
    buyInText: string;
    /** "200 chip units". */
    stackText: string;
    /** "1 / 2". */
    blindsText: string;
  };
  /** Saved players, alphabetical. */
  candidates: readonly EntryCandidate[];
}

/** The Add <name> popup's content. */
export type EntryPopupData =
  | {
      kind: 'proposal';
      /** The name that would join: "Nora". */
      name: string;
      /** The actual fully qualifying stack. */
      stack: HandoutStack;
      reserveAfter: ReserveAfter;
      /** The common buy-in: "EUR 20.00". */
      initialContributionText: string;
      /**
       * "More players can join when another fully qualifying stack is possible." (target used up) or
       * "1 of 2 still-targeted stacks can be supplied." (weakened), else `null`.
       */
      reserveNote: string | null;
      /** Tournaments: the prize pool change. */
      extraFacts?: readonly ExtraFact[];
    }
  | { kind: 'blocked'; name: string; reason: IssueBlockReason };

/** One quiet confirmation after an accepted issuance. */
export interface IssueFeedback {
  /** "Rebuy issued for Ben", "Nora joined". */
  title: string;
  /** "+EUR 20.00 contribution · 200 chip units issued." (reduced: "… · covers 3 of 4 blind payments."). */
  message: string;
}

/**
 * What identifies the rebuy proposal the host saw. Pass it back unchanged to `issueRebuy`; the
 * rebuy is issued only if the bank still yields exactly this proposal.
 */
export interface RebuyAcceptance {
  participantId: string;
  /** Chip counts of the proposed mix, one per denomination, ascending. */
  mix: readonly number[];
  /** The player's total contribution after this rebuy (so a repeated confirm cannot issue twice). */
  newTotalCents: Cents;
  /** "Reserve after rebuy" as shown. */
  reserveAfter: number;
  /** Reduced coverage: the achieved coverage the host accepts (Accept & issue). `null`: fully qualifying. */
  acceptedCoverage: number | null;
}

export interface RebuyConfirmation {
  kind: 'rebuy';
  /** The popup (always `kind: 'proposal'`). */
  popup: Extract<RebuyPopupData, { kind: 'proposal' }>;
  acceptance: RebuyAcceptance;
}

/** Allocation outcomes that block an issuance: show the blocked popup. */
export type IssueBlockCode = 'insufficientValue' | 'unsuitableDenominations' | 'tooComplex';

/** A rebuy that cannot be issued from the current bank. Nothing changed. */
export interface RebuyBlocked extends Rejected<IssueBlockCode> {
  blocked: Extract<RebuyPopupData, { kind: 'blocked' }>;
}

export type RebuyRequestCode =
  | 'gameNotFound'
  | 'notInProgress'
  | 'participantNotFound'
  /** The player has a confirmed final result; Return to play removes it first. */
  | 'finishedPlaying'
  /** Tournaments: the player is eliminated. */
  | 'eliminated';

export type RebuyProposalResult = NeedsConfirmation<RebuyConfirmation> | RebuyBlocked | Rejected<RebuyRequestCode>;

export type IssueRebuyResult =
  | Accepted<{ participantId: string; issuanceId: string; feedback: IssueFeedback }>
  | Rejected<RebuyRequestCode | 'proposalChanged' | 'reducedCoverageNotAccepted'>;

/** What identifies the late-entry proposal the host saw. Pass it back unchanged to `addLatePlayer`. */
export interface EntryAcceptance {
  savedPlayerId: string;
  /** The name that joins (captured on acceptance). */
  name: string;
  /** Chip counts of the proposed mix, one per denomination, ascending. */
  mix: readonly number[];
  /** "Reserve after entry" as shown. */
  reserveAfter: number;
}

export interface EntryConfirmation {
  kind: 'lateEntry';
  /** The popup (always `kind: 'proposal'`). */
  popup: Extract<EntryPopupData, { kind: 'proposal' }>;
  acceptance: EntryAcceptance;
  /** The selection screen's line after Cancel: "Nora has not joined." */
  declinedNotice: string;
}

/** A late entry that cannot be admitted (never reduced coverage). Nothing changed. */
export interface EntryBlocked extends Rejected<IssueBlockCode | 'coverageShortage'> {
  blocked: Extract<EntryPopupData, { kind: 'blocked' }>;
  /** "Nora has not joined." */
  declinedNotice: string;
}

export type EntryRequestCode =
  | 'gameNotFound'
  | 'notInProgress'
  | 'savedPlayerNotFound'
  | 'alreadyInGame'
  | 'nameTakenInGame'
  /** Tournaments: late entry is closed while any elimination is recorded. */
  | 'eliminationsRecorded';

export type EntryProposalResult = NeedsConfirmation<EntryConfirmation> | EntryBlocked | Rejected<EntryRequestCode>;

export type AddLatePlayerResult =
  | Accepted<{ participantId: string; issuanceId: string; feedback: IssueFeedback }>
  | Rejected<EntryRequestCode | 'proposalChanged'>;
