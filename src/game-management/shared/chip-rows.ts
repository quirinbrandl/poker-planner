/**
 * Validation and summaries for chip-set rows, shared by a game's chip set and chip set templates.
 */
import { CHIP_COLORS, type ChipColor, type ChipDenomination } from '@/domain/types';

import { type Problem, problem } from '../core/problems';
import { formatCount, parseWholeNumber } from './numbers';

/** One denomination row as typed. `id` is any string unique within the rows (a counter is fine). */
export interface ChipRowInput {
  id: string;
  valueText: string;
  quantityText: string;
  color: ChipColor | null;
}

export interface ChipRowProblems {
  value: Problem | null;
  quantity: Problem | null;
  /** The quantity as a whole number while it is valid (for the chip-case drawing), else `null`. */
  chipCount: number | null;
}

export type ChipSetSummary =
  | { kind: 'empty'; label: string }
  | { kind: 'incomplete'; label: string }
  | { kind: 'valid'; label: string; denominations: number; chips: number; chipUnits: number };

export interface ChipRowsValidation {
  /** Problems per row id. Every row has an entry. */
  rows: Readonly<Record<string, ChipRowProblems>>;
  /** Set-level problem (no denominations), if any. */
  setProblem: Problem | null;
  /** Every problem in row order, set-level first. */
  problems: readonly Problem[];
  /** The validated denominations in row order, or `null` while any problem remains. */
  denominations: ChipDenomination[] | null;
  summary: ChipSetSummary;
}

export function isBlankRow(row: Pick<ChipRowInput, 'valueText' | 'quantityText'>): boolean {
  return row.valueText.trim() === '' && row.quantityText.trim() === '';
}

export function isChipColor(value: unknown): value is ChipColor {
  return (CHIP_COLORS as readonly unknown[]).includes(value);
}

export function validateChipRows(rows: readonly ChipRowInput[]): ChipRowsValidation {
  const result: Record<string, ChipRowProblems> = {};
  const problems: Problem[] = [];
  const denominations: ChipDenomination[] = [];
  const seenValues = new Set<number>();

  const setProblem = rows.length === 0 ? problem('noDenominations', 'chipSet', 'Add at least one denomination.') : null;
  if (setProblem) problems.push(setProblem);

  for (const row of rows) {
    let valueProblem: Problem | null = null;
    let quantityProblem: Problem | null = null;
    const valueField = `chipValue:${row.id}` as const;
    const quantityField = `chipQuantity:${row.id}` as const;

    const value = parseWholeNumber(row.valueText);
    if (!value.ok) {
      valueProblem =
        value.error === 'empty'
          ? problem('valueMissing', valueField, 'Enter a value.')
          : value.error === 'tooLarge'
            ? problem('numberTooLarge', valueField, 'Enter a smaller number.')
            : problem('valueNotWholeNumber', valueField, 'Enter a whole number of chip units.');
    } else if (value.value === 0) {
      valueProblem = problem('valueNotPositive', valueField, 'Value must be at least 1.');
    } else if (seenValues.has(value.value)) {
      valueProblem = problem('duplicateValue', valueField, 'Combine quantities in the existing row');
    } else {
      seenValues.add(value.value);
    }

    const quantity = parseWholeNumber(row.quantityText);
    if (!quantity.ok) {
      quantityProblem =
        quantity.error === 'empty'
          ? problem('quantityMissing', quantityField, 'Enter a quantity.')
          : quantity.error === 'tooLarge'
            ? problem('numberTooLarge', quantityField, 'Enter a smaller number.')
            : problem('quantityNotWholeNumber', quantityField, 'Enter a whole number of chips (0 or more).');
    }

    result[row.id] = { value: valueProblem, quantity: quantityProblem, chipCount: quantity.ok ? quantity.value : null };
    if (valueProblem) problems.push(valueProblem);
    if (quantityProblem) problems.push(quantityProblem);
    if (!valueProblem && !quantityProblem && value.ok && quantity.ok) {
      denominations.push({ value: value.value, quantity: quantity.value, color: row.color });
    }
  }

  const valid = problems.length === 0;
  return {
    rows: result,
    setProblem,
    problems,
    denominations: valid ? denominations : null,
    summary: valid ? summarizeDenominations(denominations) : rows.length === 0 ? EMPTY_SUMMARY : INCOMPLETE_SUMMARY,
  };
}

const EMPTY_SUMMARY: ChipSetSummary = { kind: 'empty', label: 'No denominations yet' };
const INCOMPLETE_SUMMARY: ChipSetSummary = { kind: 'incomplete', label: 'Incomplete chip set' };

export function summarizeDenominations(denominations: readonly ChipDenomination[]): ChipSetSummary {
  if (denominations.length === 0) return EMPTY_SUMMARY;
  const chips = denominations.reduce((sum, d) => sum + d.quantity, 0);
  const chipUnits = denominations.reduce((sum, d) => sum + d.value * d.quantity, 0);
  const count = denominations.length;
  return {
    kind: 'valid',
    denominations: count,
    chips,
    chipUnits,
    label: `${count} ${count === 1 ? 'denomination' : 'denominations'} · ${formatCount(chips)} ${chips === 1 ? 'chip' : 'chips'} · ${formatCount(chipUnits)} chip ${chipUnits === 1 ? 'unit' : 'units'}`,
  };
}

/** Raw rows for an editor, from validated denominations. Row ids are `row-1`, `row-2`, ... */
export function rowsFromDenominations(denominations: readonly ChipDenomination[]): ChipRowInput[] {
  return denominations.map((d, index) => ({
    id: `row-${index + 1}`,
    valueText: String(d.value),
    quantityText: String(d.quantity),
    color: d.color,
  }));
}
