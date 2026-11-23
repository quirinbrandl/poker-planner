import { type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Icon } from '../Icon';
import { Text } from '../Text';
import { colors, palette, radii, space } from '../theme';

export interface MetricTileProps {
  /** Upper-case label: "Blinds", "Cash value", "Reserve". */
  label: string;
  /** Main value: "1 / 2", "EUR 20.00", "3 stacks". */
  value: string;
  /** Sub-label: "100 BB depth", "EUR 0.10 / unit". */
  subLabel?: string;
  /** Amber adjusted state: the old value is struck through before the new one. */
  adjustedFrom?: string;
  /**
   * What `adjustedFrom` replaces: the main `value` (default, e.g. "~~3~~ → 1 stack") or the
   * `subLabel` (e.g. Blinds "1 / 2" over "~~100 BB~~ → 98 BB").
   */
  adjusts?: 'value' | 'subLabel';
}

/** Compact label / value / sub-label tile for the game-terms strip. */
export function MetricTile({ label, value, subLabel, adjustedFrom, adjusts = 'value' }: MetricTileProps) {
  const adjusted = adjustedFrom !== undefined;
  const valueAdjusted = adjusted && adjusts === 'value';
  const subAdjusted = adjusted && adjusts === 'subLabel' && subLabel !== undefined;
  const spoken = [
    label,
    valueAdjusted ? `${value}, adjusted from ${adjustedFrom}` : value,
    subAdjusted ? `${subLabel}, adjusted from ${adjustedFrom}` : subLabel,
  ]
    .filter(Boolean)
    .join(', ');
  // A tile asks for at least its content's width (which grows with the text size) so a value such
  // as "EUR 20.00" stays on one line; tiles then share the row and wrap to a new row when they don't fit.
  const { fontScale } = useWindowDimensions();
  const minBasis = TILE_BASIS * Math.max(1, fontScale || 1);
  return (
    <View accessible accessibilityLabel={spoken} style={[styles.tile, { minWidth: minBasis }, adjusted && styles.adjusted]}>
      <View style={styles.labelRow}>
        {adjusted ? <Icon name="warning" size={13} color={colors.warning} /> : null}
        <Text variant="overline" tone={adjusted ? 'warning' : 'supporting'}>
          {label}
        </Text>
      </View>
      <Text variant="title" tabular>
        {valueAdjusted ? (
          <>
            <Text variant="title" tabular strike style={styles.old}>
              {nonBreaking(adjustedFrom ?? '')}
            </Text>
            <Text variant="title" tone="warning">
              {' → '}
            </Text>
            <Text variant="title" tabular tone="warning">
              {nonBreaking(value)}
            </Text>
          </>
        ) : (
          nonBreaking(value)
        )}
      </Text>
      {subAdjusted ? (
        <Text variant="caption" tabular tone="warning" strong>
          <Text variant="caption" tabular strike style={styles.old}>
            {adjustedFrom}
          </Text>
          {` → ${subLabel}`}
        </Text>
      ) : subLabel ? (
        <Text variant="caption">{subLabel}</Text>
      ) : null}
    </View>
  );
}

/** Row of MetricTiles that wraps at narrow widths and large text. */
export function MetricStrip({ children, accessibilityLabel }: { children: ReactNode; accessibilityLabel?: string }) {
  return (
    <View style={styles.strip} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

/** Keep ratios like "1 / 2" and amounts like "EUR 20.00" on one line (long values may still wrap between words). */
const nonBreaking = (text: string) => text.replace(/ \/ /g, '\u00A0/\u00A0').replace(/^([A-Z]{3}) (?=\d)/, '$1\u00A0');

const TILE_BASIS = 100;

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    maxWidth: '100%',
    gap: 3,
    paddingHorizontal: space.md,
    paddingVertical: space.md - 1,
    borderRadius: radii.tile,
    backgroundColor: palette.slate800,
    borderWidth: 1,
    borderColor: '#31414F',
  },
  adjusted: { borderColor: colors.warning, backgroundColor: '#2D2312' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  old: { color: colors.warningMuted, fontWeight: '500' },
});
