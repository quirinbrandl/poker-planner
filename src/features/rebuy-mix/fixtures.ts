/**
 * Development and test fixtures for the forgotten-rebuy / Correct mix editor, following the
 * prototype's example mixes for Alice (who has a 250-unit result) and Bob's rebuy 1. The review
 * helper stands in for game management: it is fixture code, not used by the components.
 */
import type { Cents } from '@/domain/types';
import { BUY_IN, CONTEXT, countsOf, entriesFrom, eur, grouped, mix, STACK_UNITS, unitsOf } from '@/features/count/fixtures';
import type { BlockedMixData } from '@/features/count/types';

import type { MixGoal, MixReviewOutcome, MixWarning, RebuyMixConfirmationData, RebuyMixEditorData } from './types';

export function mixGoal(texts: readonly string[]): MixGoal {
  const entries = entriesFrom(texts);
  const units = unitsOf(countsOf(entries));
  const complete = entries.every((entry) => entry.state === 'entered');
  const target = STACK_UNITS;
  const status: MixGoal['status'] =
    units > target ? 'over' : units < target ? 'toGo' : complete ? 'exact' : 'exactSoFar';
  const statusText = {
    over: `${units - target} over`,
    toGo: `${target - units} to go`,
    exact: `Exactly ${target} ✓`,
    exactSoFar: `${target} so far · enter the rest, even if 0`,
  }[status];
  return { unitsText: grouped(units), targetText: String(target), units, target, status, statusText };
}

interface EditorOptions {
  kind?: RebuyMixEditorData['kind'];
  rebuyNumber?: number;
  resultStays?: boolean;
  problem?: RebuyMixEditorData['problem'];
  errors?: Readonly<Record<number, string>>;
}

export function mixEditorData(playerName: string, texts: readonly string[], options: EditorOptions = {}): RebuyMixEditorData {
  return {
    playerName,
    context: CONTEXT,
    kind: options.kind ?? 'forgotten',
    rebuyNumber: options.rebuyNumber ?? null,
    stackUnitsText: String(STACK_UNITS),
    resultStays: options.resultStays ?? false,
    entries: entriesFrom(texts, options.errors),
    goal: mixGoal(texts),
    problem: options.problem ?? null,
  };
}

const ALICE = { resultStays: true } as const;
const BOB_REBUY = { kind: 'correct', rebuyNumber: 1 } as const;

const COVERAGE = (covered: number): MixWarning => ({
  code: 'reducedCoverage',
  text: `Covers only ${covered} of 4 blind payments with separate chips.`,
});
const WEAKENED: MixWarning = { code: 'weakenedReserve', text: 'Leaves chips for only 0 of 1 reserve stacks (was 2).' };

function confirmation(
  playerName: string,
  counts: readonly number[],
  warnings: readonly MixWarning[],
  options: { kind?: 'forgotten' | 'correct'; rebuyNumber?: number; resultStays?: boolean; contributions?: Cents } = {},
): RebuyMixConfirmationData {
  const kind = options.kind ?? 'forgotten';
  const contributions = options.contributions ?? BUY_IN;
  return {
    kind,
    playerName,
    rebuyNumber: options.rebuyNumber ?? null,
    mix: mix(counts),
    buyInsChange: kind === 'forgotten' ? { beforeText: eur(contributions), afterText: eur(contributions + BUY_IN) } : null,
    extraFacts: [],
    warnings,
    notes: options.resultStays ? [`${playerName}’s result stays.`] : [],
  };
}

const NOT_ENOUGH: BlockedMixData = {
  title: 'Not enough chips for this mix',
  chips: [{ value: 1, color: 'white', deltaText: '−155' }],
  message: 'The bank is 155 White chips short. Check the quantities you entered.',
};

/** The prototype's example mixes and what reviewing them shows. */
const EXAMPLES: readonly { counts: readonly number[]; outcome: (name: string, correct: boolean) => MixReviewOutcome }[] = [
  { counts: [15, 2, 3, 1, 0], outcome: (name, correct) => ({ kind: 'confirm', confirmation: confirmFor(name, [15, 2, 3, 1, 0], [], correct) }) },
  { counts: [10, 3, 3, 1, 0], outcome: (name, correct) => ({ kind: 'confirm', confirmation: confirmFor(name, [10, 3, 3, 1, 0], [COVERAGE(3)], correct) }) },
  { counts: [0, 0, 0, 2, 0], outcome: (name, correct) => ({ kind: 'confirm', confirmation: confirmFor(name, [0, 0, 0, 2, 0], [COVERAGE(0)], correct) }) },
  { counts: [40, 2, 2, 1, 0], outcome: (name, correct) => ({ kind: 'confirm', confirmation: confirmFor(name, [40, 2, 2, 1, 0], [WEAKENED], correct) }) },
  { counts: [200, 0, 0, 0, 0], outcome: () => ({ kind: 'blocked', blocked: NOT_ENOUGH }) },
];

function confirmFor(name: string, counts: readonly number[], warnings: readonly MixWarning[], correct: boolean) {
  return correct
    ? confirmation(name, counts, warnings, { kind: 'correct', rebuyNumber: 1 })
    : confirmation(name, counts, warnings, { resultStays: name === 'Alice' });
}

/**
 * Fixture review: missing quantities and wrong totals need correction; the example mixes give
 * their approved popups; any other exact mix confirms without a warning.
 */
export function reviewFixtureMix(data: RebuyMixEditorData): { outcome: MixReviewOutcome; problem: RebuyMixEditorData['problem']; errors: Record<number, string> } {
  const errors: Record<number, string> = {};
  for (const entry of data.entries) {
    if (entry.state === 'notEntered') errors[entry.value] = 'Enter a quantity, including zero.';
    if (entry.state === 'invalid') errors[entry.value] = 'Use a whole number, digits only.';
  }
  const first = data.entries.find((entry) => errors[entry.value]);
  if (first) {
    return {
      outcome: { kind: 'needsCorrection', firstDenominationValue: first.value },
      problem: { title: 'Quantities missing.', message: 'Enter every quantity, including zero.' },
      errors,
    };
  }
  if (data.goal.units !== data.goal.target) {
    return {
      outcome: { kind: 'needsCorrection', firstDenominationValue: null },
      problem: { title: `${data.goal.unitsText} chip units, not ${data.goal.targetText}.`, message: 'Check the quantities you entered.' },
      errors,
    };
  }
  const counts = countsOf(data.entries);
  const example = EXAMPLES.find((candidate) => candidate.counts.every((count, index) => count === counts[index]));
  const correct = data.kind === 'correct';
  return {
    outcome: example ? example.outcome(data.playerName, correct) : { kind: 'confirm', confirmation: confirmFor(data.playerName, counts, [], correct) },
    problem: null,
    errors,
  };
}

const BLANK = ['', '', '', '', ''];

export const REBUY_MIX_FIXTURES = {
  /** Alice's forgotten rebuy, 2 of 5 entered. */
  partial: { data: mixEditorData('Alice', ['15', '2', '', '', ''], ALICE), index: 1 },
  /** Every quantity entered: exactly 200. */
  ready: { data: mixEditorData('Alice', ['15', '2', '3', '1', '0'], ALICE), index: 1 },
  empty: { data: mixEditorData('Alice', BLANK, ALICE), index: 0 },
  /** 200 reached with blanks left. */
  'so-far': { data: mixEditorData('Alice', ['15', '2', '3', '1', ''], ALICE), index: 4 },
  over: { data: mixEditorData('Alice', ['40', '2', '3', '1', '0'], ALICE), index: 0 },
  /** Review of a wrong total. */
  'wrong-total': {
    data: mixEditorData('Alice', ['15', '2', '2', '1', '0'], {
      ...ALICE,
      problem: { title: '175 chip units, not 200.', message: 'Check the quantities you entered.' },
    }),
    index: 2,
  },
  /** Review with a blank: the field says what is missing. */
  incomplete: {
    data: mixEditorData('Alice', ['15', '', '3', '1', '0'], {
      ...ALICE,
      errors: { 5: 'Enter a quantity, including zero.' },
      problem: { title: 'Quantities missing.', message: 'Enter every quantity, including zero.' },
    }),
    index: 1,
  },
  /** Bob's rebuy 1, Correct mix (no result). */
  correct: { data: mixEditorData('Bob', ['10', '3', '3', '1', '0'], BOB_REBUY), index: 0 },
  /** Popups. */
  confirm: { data: mixEditorData('Alice', ['15', '2', '3', '1', '0'], ALICE), index: 0, dialog: EXAMPLES[0].outcome('Alice', false) },
  reduced: { data: mixEditorData('Alice', ['10', '3', '3', '1', '0'], ALICE), index: 0, dialog: EXAMPLES[1].outcome('Alice', false) },
  'zero-coverage': { data: mixEditorData('Alice', ['0', '0', '0', '2', '0'], ALICE), index: 3, dialog: EXAMPLES[2].outcome('Alice', false) },
  weaken: { data: mixEditorData('Alice', ['40', '2', '2', '1', '0'], ALICE), index: 0, dialog: EXAMPLES[3].outcome('Alice', false) },
  impossible: { data: mixEditorData('Alice', ['200', '0', '0', '0', '0'], ALICE), index: 0, dialog: EXAMPLES[4].outcome('Alice', false) },
  'correct-confirm': { data: mixEditorData('Bob', ['10', '3', '3', '1', '0'], BOB_REBUY), index: 0, dialog: EXAMPLES[1].outcome('Bob', true) },
} satisfies Record<string, { data: RebuyMixEditorData; index: number; dialog?: MixReviewOutcome }>;

export type RebuyMixFixtureName = keyof typeof REBUY_MIX_FIXTURES;
