/**
 * Development and test fixtures shared by Results, the count editor, the player page, the fix flow
 * and the rebuy-mix editor. The prototype's story: Alice, Bob, Clara, David, Emma, Felix; chips
 * 1 White / 5 Red / 25 Blue / 100 Black / 500 Green; EUR 20 buy-in for a 200-unit stack
 * (EUR 0.10 per unit). The small helpers below stand in for game management so the editors can be
 * tried; they are fixture code, never used by the components.
 */
import { formatEur, formatExactEur, formatSignedExactEur } from '@/domain/money';
import type { Cents } from '@/domain/types';
import { chipColorName } from '@/ui';

import type {
  ChipFace,
  CountEditorData,
  CountReviewOutcome,
  CountTotals,
  MixChip,
  QuantityEntry,
  ResultConfirmationData,
  SignedMoney,
} from './types';

export const DENOMINATIONS: readonly ChipFace[] = [
  { value: 1, color: 'white' },
  { value: 5, color: 'red' },
  { value: 25, color: 'blue' },
  { value: 100, color: 'black' },
  { value: 500, color: 'green' },
];

export const BUY_IN = 2000 as Cents;
export const STACK_UNITS = 200;
export const CONTEXT = 'Cash game · 16 Nov, 19:30';

/** A mix from counts in denomination order: mix([15, 2, 3, 1, 0]). */
export function mix(counts: readonly number[]): MixChip[] {
  return DENOMINATIONS.map((chip, index) => ({ ...chip, count: counts[index] ?? 0 }));
}

export function unitsOf(counts: readonly number[]): number {
  return DENOMINATIONS.reduce((sum, chip, index) => sum + chip.value * (counts[index] ?? 0), 0);
}

/** Exact chip value in cents of `units` at `buyIn` per 200 units. */
function chipValue(units: number, buyIn: Cents = BUY_IN) {
  return { numerator: units * buyIn, denominator: STACK_UNITS };
}

export function chipValueText(units: number, buyIn: Cents = BUY_IN): string {
  return formatExactEur(chipValue(units, buyIn));
}

/** Exact win / loss of `units` against `contributions` cents. */
export function winLoss(units: number, contributions: Cents, buyIn: Cents = BUY_IN): SignedMoney {
  const numerator = units * buyIn - contributions * STACK_UNITS;
  return {
    amountText: formatSignedExactEur({ numerator, denominator: STACK_UNITS }),
    direction: numerator > 0 ? 'gain' : numerator < 0 ? 'loss' : 'even',
  };
}

export const eur = (cents: number) => formatEur(cents as Cents);

/** "1,600". */
export const grouped = (value: number) => value.toLocaleString('en-US');

/** Raw text → entry, as game management would judge it. */
export function entriesFrom(texts: readonly string[], errors: Readonly<Record<number, string>> = {}): QuantityEntry[] {
  return DENOMINATIONS.map((chip, index) => {
    const text = texts[index] ?? '';
    const valid = /^\d+$/.test(text) && Number.isSafeInteger(Number(text));
    return {
      ...chip,
      quantityText: text,
      state: text === '' ? 'notEntered' : valid ? 'entered' : 'invalid',
      count: valid ? Number(text) : null,
      ...(errors[chip.value] ? { error: errors[chip.value] } : {}),
    };
  });
}

/** Counts of the entered quantities (blanks and invalid text count as nothing). */
export function countsOf(entries: readonly QuantityEntry[]): number[] {
  return entries.map((entry) => entry.count ?? 0);
}

export function countTotals(entries: readonly QuantityEntry[], contributions: Cents, buyIn: Cents = BUY_IN): CountTotals {
  const units = unitsOf(countsOf(entries));
  const complete = entries.every((entry) => entry.state === 'entered');
  return {
    unitsText: grouped(units),
    complete,
    chipValueText: chipValueText(units, buyIn),
    contributionsText: eur(contributions),
    winLoss: complete ? winLoss(units, contributions, buyIn) : null,
  };
}

/** A count editor fixture from raw texts. */
export function countEditorData(
  playerName: string,
  texts: readonly string[],
  contributions: Cents,
  options: { kind?: CountEditorData['kind']; errors?: Readonly<Record<number, string>>; problem?: CountEditorData['problem'] } = {},
): CountEditorData {
  const entries = entriesFrom(texts, options.errors);
  return {
    playerName,
    context: CONTEXT,
    kind: options.kind ?? 'count',
    entries,
    totals: countTotals(entries, contributions),
    problem: options.problem ?? null,
  };
}

export function resultConfirmation(
  playerName: string,
  counts: readonly number[],
  contributions: Cents,
  kind: ResultConfirmationData['kind'] = 'confirm',
): ResultConfirmationData {
  const units = unitsOf(counts);
  return {
    kind,
    playerName,
    mix: mix(counts),
    unitsText: grouped(units),
    chipValueText: chipValueText(units),
    contributionsText: eur(contributions),
    winLossText: winLoss(units, contributions).amountText,
    zeroChips: units === 0,
  };
}

const CLARA_CONTRIBUTIONS = 2000 as Cents;

/** Count editor states for /dev/count. */
export const COUNT_FIXTURES = {
  /** Clara's draft: only 12 White chips entered. */
  draft: countEditorData('Clara', ['12', '', '', '', ''], CLARA_CONTRIBUTIONS),
  /** All quantities entered: 250 units, +EUR 5.00. */
  complete: countEditorData('Clara', ['15', '2', '5', '1', '0'], CLARA_CONTRIBUTIONS),
  /** Review with blanks and invalid text: errors kept beside the raw text. */
  invalid: countEditorData('Clara', ['12', '', 'x3', '', ''], CLARA_CONTRIBUTIONS, {
    errors: { 5: 'Enter a quantity, including zero.', 25: 'Use a whole number, digits only.', 100: 'Enter a quantity, including zero.', 500: 'Enter a quantity, including zero.' },
    problem: { title: 'Count incomplete.', message: 'Your entries are kept. Fix the marked quantities.' },
  }),
  /** Alice's correction of a confirmed result. */
  correction: countEditorData('Alice', ['10', '3', '5', '1', '0'], 2000 as Cents, { kind: 'correction' }),
  /** Explicit zero everywhere. */
  zero: countEditorData('Clara', ['0', '0', '0', '0', '0'], CLARA_CONTRIBUTIONS),
} satisfies Record<string, CountEditorData>;

export type CountFixtureName = keyof typeof COUNT_FIXTURES;

/** The configured chip set of the story: no count may return more than this. */
export const CHIP_SET = [135, 24, 27, 12, 1];

/**
 * Fixture review of a count, standing in for game management: blanks and invalid text need
 * correction; a quantity above the chip set is blocked; otherwise the confirmation popup.
 */
export function reviewFixtureCount(
  data: CountEditorData,
  contributions: Cents,
): { outcome: CountReviewOutcome; errors: Record<number, string>; problem: CountEditorData['problem'] } {
  const errors: Record<number, string> = {};
  for (const entry of data.entries) {
    if (entry.state === 'notEntered') errors[entry.value] = 'Enter a quantity, including zero.';
    if (entry.state === 'invalid') errors[entry.value] = 'Use a whole number, digits only.';
  }
  const first = data.entries.find((entry) => errors[entry.value]);
  if (first) {
    return {
      outcome: { kind: 'needsCorrection', firstDenominationValue: first.value },
      errors,
      problem: { title: 'Count incomplete.', message: 'Your entries are kept. Fix the marked quantities.' },
    };
  }
  const counts = countsOf(data.entries);
  const over = DENOMINATIONS.map((chip, index) => ({ chip, extra: counts[index] - CHIP_SET[index] })).filter((item) => item.extra > 0);
  if (over.length > 0) {
    const names = over.map(({ chip, extra }) => `${extra} ${chipColorName(chip.color)} ${extra === 1 ? 'chip' : 'chips'}`).join(' and ');
    return {
      outcome: {
        kind: 'blocked',
        blocked: {
          title: 'More chips than the game has',
          chips: over.map(({ chip, extra }) => ({ ...chip, deltaText: `+${extra}` })),
          message: `That’s ${names} more than the game has. Check the quantities you entered.`,
        },
      },
      errors,
      problem: null,
    };
  }
  return {
    outcome: { kind: 'confirm', confirmation: resultConfirmation(data.playerName, counts, contributions, data.kind === 'correction' ? 'replace' : 'confirm') },
    errors,
    problem: null,
  };
}
