/**
 * Display contracts of the cash-game Play workspace, the rebuy popup and the bank and reserve view.
 * Plain data only: game management computes every value and wording; the screens only show it.
 */
import type { ChipColor } from '@/domain/types';

/** Physical chips of one denomination, as drawn in towers and pills. */
export interface DisplayChip {
  /** Chip-unit value of the denomination, e.g. 25. */
  value: number;
  /** The denomination's colour; `null` is "No color". */
  color: ChipColor | null;
  /** Number of physical chips. Zero counts are skipped when drawn. */
  count: number;
}

/** The actual stack the host hands out, exactly as game management allocated it. */
export interface HandoutStack {
  /** The stack's exact chip-unit total, digits only: "200". */
  unitsText: string;
  /** The actual denomination mix, ascending by value. */
  chips: readonly DisplayChip[];
}

/** An extra label / value row in an issuance popup, e.g. a tournament's "Prize pool" change. */
export interface ExtraFact {
  /** "Prize pool". */
  label: string;
  /** "EUR 140.00 → EUR 160.00". */
  value: string;
}

/** Simultaneously achievable reserve after the proposed issuance, as shown in the popup. */
export interface ReserveAfter {
  /** The count, digits only: "1", "0". */
  value: string;
  /** "stack left" / "stacks left". */
  unit: string;
}

/**
 * Blind-payment coverage of a proposed stack that falls short of the configured requirement.
 * Only rebuys may be issued this way, after explicit acceptance.
 */
export interface ReducedCoverage {
  /** Payments of each blind the stack can make with separate chips (may be 0). */
  achieved: number;
  /** Configured blind-payment coverage, e.g. 4. */
  required: number;
}

/** Why no stack can be issued. Nothing is recorded in any of these cases. */
export type IssueBlockReason =
  /** An exact-value stack exists but cannot reach full coverage (late entry only; rebuys get a reduced proposal instead). */
  | { kind: 'coverage'; achieved: number; required: number; stackUnitsText: string }
  /** No exact-value combination, or not enough value, or the remaining reserve guarantee: the exact requirement in words. */
  | { kind: 'allocation'; message: string };

/** A player in the Playing group (no confirmed result). */
export interface PlayingPlayerRow {
  /** Participant id. */
  id: string;
  /** Captured name. */
  name: string;
  /** "EUR 40.00 contribution · 1 rebuy". */
  contributionText: string;
  /** A saved, unconfirmed final chip count: tagged "Count draft", and the shortcut reads Resume. */
  hasCountDraft: boolean;
}

/** A player in the Finished playing group (confirmed final result). */
export interface FinishedPlayerRow {
  /** Participant id. */
  id: string;
  /** Captured name. */
  name: string;
  /** "EUR 20.00 contribution". */
  contributionText: string;
  /** Signed provisional balance: chip value minus all contributions, "+EUR 5.00" / "−EUR 5.00" / "EUR 0.00". */
  balanceText: string;
  /** Sign of the balance; decides the colour and must agree with `balanceCaption`. */
  direction: 'gain' | 'loss' | 'even';
  /** The words under the amount: "Won", "Lost", "Break-even". */
  balanceCaption: string;
  /** An unconfirmed correction of the confirmed result is saved: tagged "Correction draft". */
  hasCorrectionDraft: boolean;
}

/** Everything the Play workspace of an In progress cash game shows. */
export interface PlayData {
  /** "Cash game · 13 Nov, 19:30". */
  context: string;
  /** Where the top-left control leads. */
  backLabel: 'Games' | 'History';
  /** The accepted, locked game terms of the panel. */
  terms: {
    /** "1 / 2". */
    blindsText: string;
    /** The rebuy price without currency: "20.00". */
    rebuyText: string;
    /** "EUR". */
    currency: string;
    /** Starting stack chip units: "200". */
    stackText: string;
  };
  /**
   * The reserve line that opens Bank & reserve: "2 reserve stacks available",
   * "Reserve used · more stacks may be possible", "No reserve target · more stacks may be possible".
   */
  reserveText: string;
  /** Players without a confirmed result, in joining order. */
  playing: readonly PlayingPlayerRow[];
  /** Players with a confirmed result, in joining order. */
  finished: readonly FinishedPlayerRow[];
  /** "EUR 140.00 total contributions". */
  totalContributionsText: string;
}

/** What the Bank & reserve view shows. */
export interface BankReserveData {
  /** "Cash game · 13 Nov, 19:30". */
  context: string;
  /** "75 available chips". */
  chipsText: string;
  /** Every denomination in the bank, ascending, zero counts included. */
  chips: readonly DisplayChip[];
  /** "1,480 chip units in the bank. Total value alone does not prove a 200-unit stack is possible." */
  valueNote: string;
  /** The shared reserve, each value preformatted. */
  reserve: {
    /** "3 stacks". */
    startedTargetText: string;
    /** Rebuys and late entries recorded since Start: "1". */
    consumedText: string;
    /** Started target minus consumption, floored at zero: "2". */
    unconsumedText: string;
    /** Stacks the bank can supply at the same time, of the unconsumed target: "2 of 2". */
    achievableText: string;
  };
}

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
      /** Set when the best exact-value stack falls short of full coverage: needs explicit Accept & issue. */
      reducedCoverage: ReducedCoverage | null;
      reserveAfter: ReserveAfter;
      /** The rebuy price: "EUR 20.00". Also shown on the issue button. */
      priceText: string;
      /** The player's contributions plus the price: "EUR 60.00". */
      newTotalText: string;
      /**
       * One quiet line about the reserve, when it applies: "More rebuys are still allowed when
       * another stack is possible." or "1 of 2 still-targeted stacks can be supplied."
       */
      reserveNote: string | null;
      /** Extra rows after the contribution rows (tournament prize pool). */
      extraFacts?: readonly ExtraFact[];
    }
  | {
      kind: 'blocked';
      playerId: string;
      playerName: string;
      /** Always an allocation reason for a rebuy. */
      message: string;
    };
