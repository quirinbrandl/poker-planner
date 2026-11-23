import { CHIP_COLORS, type ChipColor } from '@/domain/types';

export interface ChipPaint {
  /** Display name: "White" … or "No color". */
  name: string;
  /** Face colour. */
  fill: string;
  /** Darker side wall for 3D towers and case channels. */
  edge: string;
  /** Contrasting colour for the edge stripes and the printed value. */
  ink: string;
}

/** Paint for the neutral "No color" treatment. */
export const noColorPaint: ChipPaint = { name: 'No color', fill: '#1E2A34', edge: '#0F171E', ink: '#F1F4F5' };

/** Paint for each of the eleven denomination colours (approved distribution-preview values). */
export const chipPaint: Record<ChipColor, ChipPaint> = {
  white: { name: 'White', fill: '#EEEAE1', edge: '#CFC9BC', ink: '#222830' },
  grey: { name: 'Grey', fill: '#A5ACB5', edge: '#7F8791', ink: '#222830' },
  red: { name: 'Red', fill: '#C23B4E', edge: '#8E2433', ink: '#FFFFFF' },
  blue: { name: 'Blue', fill: '#2F70BA', edge: '#1E4C82', ink: '#FFFFFF' },
  green: { name: 'Green', fill: '#288769', edge: '#195C46', ink: '#FFFFFF' },
  yellow: { name: 'Yellow', fill: '#EBCB5B', edge: '#BFA036', ink: '#222830' },
  purple: { name: 'Purple', fill: '#845AB8', edge: '#5B3985', ink: '#FFFFFF' },
  black: { name: 'Black', fill: '#262D36', edge: '#13171C', ink: '#F1F4F5' },
  orange: { name: 'Orange', fill: '#DC934B', edge: '#A86829', ink: '#222830' },
  pink: { name: 'Pink', fill: '#DF96BB', edge: '#B0688C', ink: '#222830' },
  brown: { name: 'Brown', fill: '#85583F', edge: '#5C3A27', ink: '#FFFFFF' },
};

/** Paint for a denomination colour; `null` is "No color". */
export function paintFor(color: ChipColor | null | undefined): ChipPaint {
  return color ? chipPaint[color] : noColorPaint;
}

/** Display name for a denomination colour; `null` is "No color". */
export function chipColorName(color: ChipColor | null | undefined): string {
  return paintFor(color).name;
}

/** The twelve palette choices in picker order (approved palette): No color, then the eleven colours. */
export const chipColorChoices: readonly (ChipColor | null)[] = [null, ...CHIP_COLORS];
