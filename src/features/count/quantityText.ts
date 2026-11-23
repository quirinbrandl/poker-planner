import { chipColorName } from '@/ui';

import type { ChipFace, QuantityEntry } from './types';

/** "1 chip unit", "25 chip units". */
export function chipUnitsName(value: number): string {
  return `${value} chip ${value === 1 ? 'unit' : 'units'}`;
}

/** "1 chip unit, White": the spoken identity of a denomination. */
export function denominationName(chip: ChipFace): string {
  return `${chipUnitsName(chip.value)}, ${chipColorName(chip.color)}`;
}

/** Picker caption under a chip: "×12", "×0", "–" for a blank, "Check entry" for text that is not a quantity. */
export function quantityCaption(entry: QuantityEntry): string {
  if (entry.state === 'invalid') return 'Check entry';
  if (entry.state === 'notEntered') return '–';
  return `×${entry.count ?? 0}`;
}

/** Spoken status of a quantity: a blank is "quantity not entered", never zero. */
export function quantitySpoken(entry: QuantityEntry): string {
  if (entry.state === 'notEntered') return 'quantity not entered';
  if (entry.state === 'invalid') return 'invalid quantity';
  return `${entry.count} ${entry.count === 1 ? 'chip' : 'chips'}`;
}

/**
 * The raw text after an explicit −1 / +1. Only edits what is already a quantity (a blank plus one
 * is "1"); invalid text is left for the host to fix. Never goes below zero.
 */
export function steppedQuantityText(entry: QuantityEntry, delta: 1 | -1): string | null {
  if (entry.state === 'invalid') return null;
  const current = entry.count ?? (delta > 0 ? 0 : null);
  if (current === null) return null;
  const next = current + delta;
  return next < 0 ? null : String(next);
}
