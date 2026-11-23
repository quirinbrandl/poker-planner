/**
 * What the correction operations return: the editor, popup and fix-flow data ready to render, and
 * the result unions. Screens re-export the plain data types from their `types.ts`.
 *
 * Corrections change records, never chips: every confirmation says what the host has to do with
 * the physical chips, and nothing cascades into another record.
 */
import type { Accepted, NeedsConfirmation, Rejected } from '../../core/results';
import type { ExtraFact } from '../issuance/types';
import type { CountBlocked } from '../results/count';
import type {
  BlockedChip,
  BuyInRecord,
  EditorProblem,
  MixChip,
  QuantityEntry,
  ResultConfirmationData,
  ReturnToPlayData,
  UndoRebuyData,
} from '../results/types';

/** Codes every correction can be rejected with before it looks at the records in question. */
export type CorrectionAccessCode =
  | 'gameNotFound'
  | 'notInProgress'
  | 'gameCompleted'
  | 'notCashGame'
  | 'participantNotFound';

// ----- Dependent records: the fix flow -----

/** Where a blocked correction starts its fix: whose record, and whether a count or a removal waits. */
export interface FixStart {
  participantId: string;
  /** `count`: a corrected count. `result`: removing the result (Return to play). */
  target: 'count' | 'result';
}

/**
 * The correction (or removal) would take chips out of the bank that a later rebuy now uses.
 * Nothing was saved: open the fix flow (`play.getFix(gameId, fix)`) at step 1.
 */
export interface CorrectionDependent {
  status: 'dependent';
  fix: FixStart;
}

/** "Fix <name>’s count / result" (`play.getFix`), without the screen's context line. */
export interface FixView {
  /** Whose record is being corrected (Back to count, Edit count first). */
  participantId: string;
  /** "Alice". */
  playerName: string;
  target: 'count' | 'result';
  /** 1 undo the dependent rebuy, 2 save the correction (or removal), 3 give a new rebuy, then `done`. */
  step: 1 | 2 | 3 | 'done';
  /** The dependent rebuy (at step 1 the recorded one; afterwards as it was before it was undone). */
  blocker: {
    /** "Bob". */
    ownerName: string;
    /** 2 for "rebuy 2". */
    rebuyNumber: number;
    /** "EUR 20.00". */
    amountText: string;
    /** Its actual mix. */
    mix: readonly MixChip[];
    /** The chip the correction is short of, with its badge ("−5"). */
    chip: BlockedChip;
    /** "Bob’s rebuy 2 is using 5 of these White chips". */
    usageText: string;
  };
  /** Step 1's Undo popup (context `fix`). */
  undo: UndoRebuyData;
  /** A count: the retained corrected mix and its Replace result popup. */
  correction: { mix: readonly MixChip[]; confirmation: ResultConfirmationData } | null;
  /** A result removal: the Return to play popup. */
  removal: ReturnToPlayData | null;
  /** Step 3: whose new rebuy to propose (`play.proposeRebuy`) and the line the rebuy popup adds. */
  newRebuy: {
    participantId: string;
    /** "Swap Bob’s chips so they match this stack." */
    note: string;
  };
  /** Step 1 (nothing recorded yet): pass it to `play.undoFixBlocker`. `null` once the fix is recorded. */
  start: FixStart | null;
}

export type FixCode = CorrectionAccessCode | 'noFix' | 'fixChanged' | 'fixInProgress';

/** Step 1: undoing the dependent rebuy. */
export type UndoFixBlockerResult = Accepted | CountBlocked | Rejected<FixCode | 'noResult'>;

/** Step 2: Replace result (count) or remove the result (removal). */
export type SaveFixStepResult = Accepted | CountBlocked | Rejected<FixCode | 'noResult' | 'countChanged'>;

export type FinishFixResult = Accepted | Rejected<CorrectionAccessCode | 'noFix'>;

// ----- Correcting and removing a confirmed result -----

export type NoResultCode = 'noResult';

export type CorrectionEditResult = Accepted | Rejected<CorrectionAccessCode | NoResultCode | 'denominationNotFound'>;

/** "Review correction →": changes nothing. */
export type ReviewCorrectionResult =
  | NeedsConfirmation<ResultConfirmationData>
  | { status: 'needsCorrection'; firstDenominationValue: number; problem: EditorProblem }
  | CountBlocked
  | CorrectionDependent
  | Rejected<CorrectionAccessCode | NoResultCode>;

export type ReplaceResultResult =
  | Accepted
  | CountBlocked
  | CorrectionDependent
  | Rejected<CorrectionAccessCode | NoResultCode | 'countIncomplete' | 'countChanged'>;

/** Back in the game: removes the result and its return, keeps every buy-in, issues nothing. */
export type ReturnToPlayResult = Accepted | CountBlocked | CorrectionDependent | Rejected<CorrectionAccessCode | NoResultCode>;

// ----- Rebuy records: Undo, forgotten rebuys and Correct mix -----

export type RebuyRecordCode = Exclude<CorrectionAccessCode, 'notCashGame'> | 'rebuyNotFound' | 'notARebuy';

/** One quiet ✓ toast after an accepted correction: "Rebuy undone". */
export interface CorrectionFeedback {
  /** "Rebuy undone", "Forgotten rebuy added", "Rebuy corrected". */
  title: string;
}

export type UndoRebuyResult = Accepted<{ participantId: string; feedback: CorrectionFeedback }> | CountBlocked | Rejected<RebuyRecordCode>;

/** Progress toward the exact stack value. */
export interface MixGoal {
  /** Chip units entered so far, e.g. "150". */
  unitsText: string;
  /** Stack value, e.g. "200". */
  targetText: string;
  /** For the bar: entered units and the stack value as numbers. */
  units: number;
  target: number;
  /**
   * `toGo` below the value, `over` above it (red), `exact` with every quantity entered (green),
   * `exactSoFar` exact while some quantities are still blank.
   */
  status: 'toGo' | 'over' | 'exact' | 'exactSoFar';
  /** "50 to go", "25 over", "Exactly 200 ✓", "200 so far · enter the rest, even if 0". */
  statusText: string;
}

/** `play.getRebuyMixEditor`: the forgotten-rebuy / Correct mix editor except the screen's context line. */
export interface RebuyMixEditorView {
  playerName: string;
  /** `forgotten` adds a historical rebuy; `correct` replaces the mix of a recorded one. */
  kind: 'forgotten' | 'correct';
  /** The rebuy being corrected ("Rebuy 2"); `null` for a forgotten rebuy. */
  rebuyNumber: number | null;
  /** The stack value for the instruction line: "200". */
  stackUnitsText: string;
  /** The player has a recorded result (cash) or elimination (tournament) that stays. */
  resultStays: boolean;
  /** One entry per denomination, ascending value; the texts the screen passed (or the starting ones). */
  entries: readonly QuantityEntry[];
  goal: MixGoal;
  /**
   * With `showErrors`: "Quantities missing." or "180 chip units, not 200." with
   * "Check the quantities you entered."; otherwise `null`.
   */
  problem: EditorProblem | null;
}

/** A warning the host must explicitly accept. */
export interface MixWarning {
  /** Passed back on acceptance. */
  code: 'reducedCoverage' | 'weakenedReserve';
  /** "Covers only 3 of 4 blind payments with separate chips." / "Leaves chips for only 0 of 1 reserve stacks (was 2)." */
  text: string;
}

/** The "Add <name>’s forgotten rebuy?" / "Correct <name>’s rebuy k?" popup. */
export interface RebuyMixConfirmationData {
  kind: 'forgotten' | 'correct';
  playerName: string;
  /** For `correct`: 2 in "rebuy 2". */
  rebuyNumber: number | null;
  /** The mix as entered, every denomination including ×0. */
  mix: readonly MixChip[];
  /** For an addition: buy-ins before → after ("EUR 20.00" → "EUR 40.00"); `null` for a correction. */
  buyInsChange: { beforeText: string; afterText: string } | null;
  /** Extra before → after facts (tournament: Prize pool). */
  extraFacts: readonly ExtraFact[];
  /** One ⚠ line per problem; any warning turns the buttons into Decline / Accept & …. */
  warnings: readonly MixWarning[];
  /** "Alice’s result stays." (tournament: "Bob · Stays out · 6th"). */
  notes: readonly string[];
}

/** Which rebuy-mix editor: a new forgotten rebuy (no `rebuyId`) or Correct mix of a recorded rebuy. */
export interface RebuyMixTarget {
  rebuyId?: string;
}

export type RebuyMixReviewResult =
  | NeedsConfirmation<RebuyMixConfirmationData>
  /** Missing quantities (first one to fix) or a wrong total (`null`): read the editor with `showErrors`. */
  | { status: 'needsCorrection'; firstDenominationValue: number | null; problem: EditorProblem }
  /** The bank doesn't have these chips ("Not enough chips for this mix"). Nothing was saved. */
  | CountBlocked
  | Rejected<RebuyRecordCode | 'tooComplex'>;

/** What the host confirmed: the mix the popup showed and every warning it showed, accepted. */
export interface RebuyMixAcceptance extends RebuyMixTarget {
  /** Quantities per denomination, ascending (`confirmation.mix[].count`). */
  counts: readonly number[];
  acceptedWarnings: readonly MixWarning['code'][];
}

export type RecordRebuyMixResult =
  | Accepted<{ issuanceId: string; feedback: CorrectionFeedback }>
  | CountBlocked
  | Rejected<RebuyRecordCode | 'tooComplex' | 'wrongMix' | 'warningsNotAccepted'>;

/** `play.getPlayerBuyIns`: the Buy-ins section of a player page (both modes) and what it offers. */
export interface PlayerBuyInsView {
  /** "EUR 40.00". */
  buyInsTotalText: string;
  /** First stack, then rebuys in recorded order; rebuys carry their Undo popup while editable. */
  buyIns: readonly BuyInRecord[];
  actions: {
    /** + Add forgotten rebuy (In progress). */
    addForgottenRebuy: boolean;
    /** + Rebuy: still playing (cash: no result; tournament: not eliminated). */
    rebuy: boolean;
  };
}
