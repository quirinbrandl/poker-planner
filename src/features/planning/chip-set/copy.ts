import type { ChipColor } from '@/domain/types';
import { chipColorName } from '@/ui';

/** Line under the "Chip color" palette title for one denomination. */
export function paletteDescription(valueText: string): string {
  const value = valueText.trim();
  const lead = value ? `Value: ${value} ${value === '1' ? 'chip unit' : 'chip units'}.` : 'New denomination.';
  return `${lead} Match your physical chips. Color doesn’t set a value.`;
}

/** Body of "Remove denomination?" naming the row's value, quantity and colour. */
export function removeDenominationText(
  row: { valueText: string; quantityText: string; color: ChipColor | null },
  from: 'game' | 'template',
): string {
  const value = row.valueText.trim() || 'not entered';
  const quantity = row.quantityText.trim() || 'not entered';
  const target = from === 'game' ? 'this game’s chip set' : 'this template';
  return `Remove value “${value}” with quantity “${quantity}” (${chipColorName(row.color)}) from ${target}?`;
}
