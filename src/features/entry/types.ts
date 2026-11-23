/**
 * Display contracts of late entry (Add player and the Add <name> popup). Plain data only: game
 * management computes every value and wording; the screens only show it.
 */
import type { ExtraFact, HandoutStack, IssueBlockReason, ReserveAfter } from '@/features/play/types';

/** A saved (reusable) player in the selection list. */
export interface EntryCandidate {
  /** Saved player id. */
  savedPlayerId: string;
  /** Current saved name. */
  name: string;
  /** A participant of this game already uses this name: shown unavailable with the reason. */
  inGame: boolean;
}

/** What the Add player screen shows besides the staged selection. */
export interface AddPlayerData {
  /** "Cash game · 13 Nov, 19:30". */
  context: string;
  /** The game's locked entry terms. */
  terms: {
    /** "EUR 20.00". */
    buyInText: string;
    /** "200 chip units". */
    stackText: string;
    /** "1 / 2". */
    blindsText: string;
  };
  /** Saved players in the order to list them (alphabetical, as in Planning). */
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
       * One quiet line about the reserve, when it applies: "More players can join when another
       * fully qualifying stack is possible." or "1 of 2 still-targeted stacks can be supplied."
       */
      reserveNote: string | null;
      /** Extra rows after the contribution (tournament prize pool). */
      extraFacts?: readonly ExtraFact[];
    }
  | {
      kind: 'blocked';
      name: string;
      reason: IssueBlockReason;
    };

/** One quiet line under the list: the outcome of the last review, or why Review entry cannot run. */
export interface EntryNotice {
  tone: 'info' | 'error';
  /** "Nora has not joined." */
  message: string;
}
