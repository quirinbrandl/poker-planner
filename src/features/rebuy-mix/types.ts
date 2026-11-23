/**
 * Data contracts of the forgotten-rebuy / Correct mix editor and its confirmation.
 * Plain data only: game management fills these. The chip picker types come from the count editor.
 */
import type {
  BlockedMixData,
  EditorProblem,
  MixChip,
  QuantityEntry,
} from '@/features/count/types';

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

/** Everything the rebuy-mix editor shows. */
export interface RebuyMixEditorData {
  playerName: string;
  /** "Cash game · 16 Nov, 19:30". */
  context: string;
  /** `forgotten` adds a historical rebuy; `correct` replaces the mix of an existing one. */
  kind: 'forgotten' | 'correct';
  /** The rebuy being corrected ("Rebuy 2"); `null` for a forgotten rebuy. */
  rebuyNumber: number | null;
  /** The stack value as text for the instruction line: "200". */
  stackUnitsText: string;
  /** The player has a confirmed result that stays: adds "<name>’s result stays." */
  resultStays: boolean;
  /** One entry per denomination, ascending value. */
  entries: readonly QuantityEntry[];
  goal: MixGoal;
  /**
   * Set after a review that cannot continue: missing quantities, or a wrong total
   * ("180 chip units, not 200." / "Check the quantities you entered."). `null` otherwise.
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

/** One extra before → after line (tournament: Prize pool, Payouts). */
export interface ExtraFact {
  label: string;
  /** "EUR 120.00 → EUR 140.00". */
  value: string;
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
  /** Extra before → after facts after the buy-ins line (tournament: Prize pool, Payouts). */
  extraFacts: readonly ExtraFact[];
  /** One ⚠ line per problem; any warning turns the buttons into Decline / Accept & …. */
  warnings: readonly MixWarning[];
  /** Footnotes under the facts: "Alice’s result stays." (tournament: "Bob · Stays out · 6th"). */
  notes: readonly string[];
}

/** What the host accepted when confirming. */
export interface MixAcceptance {
  /** The warnings shown, all explicitly accepted (empty without warnings). */
  acceptedWarnings: readonly MixWarning['code'][];
}

/** What game management answers to "Review rebuy →". */
export type MixReviewOutcome =
  | { kind: 'confirm'; confirmation: RebuyMixConfirmationData }
  /** Missing quantities or a wrong total: `problem` / entry errors say what; go to that denomination if any. */
  | { kind: 'needsCorrection'; firstDenominationValue: number | null }
  /** The bank doesn't have these chips: "Not enough chips for this mix". Nothing was saved. */
  | { kind: 'blocked'; blocked: BlockedMixData };
