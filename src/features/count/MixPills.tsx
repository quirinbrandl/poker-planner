import { ChipPill, ChipPillRow } from '@/ui';

import type { MixChip } from './types';

export interface MixPillsProps {
  mix: readonly MixChip[];
  /** Compact rows (buy-ins) hide zero quantities; results and confirmations show ×0. */
  hideZero?: boolean;
  size?: 'regular' | 'compact';
  accessibilityLabel?: string;
}

/** A recorded or proposed mix as chip image + ×N pills, spoken "15 × 1 White". */
export function MixPills({ mix, hideZero, size, accessibilityLabel }: MixPillsProps) {
  return (
    <ChipPillRow accessibilityLabel={accessibilityLabel}>
      {mix
        .filter((chip) => !hideZero || chip.count > 0)
        .map((chip) => (
          <ChipPill key={chip.value} color={chip.color} value={chip.value} count={chip.count} size={size} />
        ))}
    </ChipPillRow>
  );
}
