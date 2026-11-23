import { StyleSheet, View } from 'react-native';

import { type ChipColor } from '@/domain/types';
import { Text } from '../Text';
import { colors, palette, radii, space } from '../theme';
import { ChipSymbol } from './ChipSymbol';
import { chipColorName } from './palette';

export interface ChipPillProps {
  color: ChipColor | null;
  /** Chip-unit value of the denomination. */
  value: number;
  /** Number of chips. Zero is shown (×0) – callers decide whether to include zero rows. */
  count: number;
  /**
   * Kept for compatibility; adds nothing any more. The value is printed readably on the chip itself,
   * so the pill is always chip + "×N".
   */
  showValue?: boolean;
  /** Also print the colour name after the count ("×135 White"), where the chip set is shown as the record. */
  showColorName?: boolean;
  size?: 'regular' | 'compact';
  /** Optional ±N badge for blocked-mix explanations ("−5"). */
  delta?: string;
}

/** Chip symbol plus ×N. Spoken as "N × <value> <color>", e.g. "15 × 1 White". */
export function ChipPill({ color, value, count, showColorName, size = 'regular', delta }: ChipPillProps) {
  const compact = size === 'compact';
  return (
    <View
      accessible
      accessibilityLabel={`${count} × ${value} ${chipColorName(color)}${delta ? `, ${delta.replace('−', 'minus ')}` : ''}`}
      style={[styles.pill, compact && styles.compact]}
    >
      <ChipSymbol color={color} value={value} size={compact ? 28 : 32} />
      <Text variant={compact ? 'label' : 'bodyStrong'} tabular>
        {`×${count}`}
      </Text>
      {showColorName ? (
        <Text variant={compact ? 'caption' : 'supporting'} tone="supporting">
          {chipColorName(color)}
        </Text>
      ) : null}
      {delta ? (
        <View style={styles.delta}>
          <Text variant="caption" tone="error" strong tabular>
            {delta}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Wrapping strip of ChipPills (bank pills, a recorded mix). */
export function ChipPillRow({
  children,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  accessibilityLabel?: string;
}) {
  return (
    <View style={styles.row} accessibilityRole="list" accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: 5,
    paddingRight: space.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: palette.slate500,
  },
  compact: { paddingLeft: 3, paddingRight: space.sm + 2, paddingVertical: 3, gap: 6 },
  delta: {
    paddingHorizontal: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.error,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
