import { StyleSheet, View } from 'react-native';

import { colors, space, Text } from '@/ui';

import type { OrderChangeRow } from './types';

export interface ChangeRowsProps {
  rows: readonly OrderChangeRow[];
}

/**
 * The "only what changes" list of an order confirmation: "David   5th → 4th", "Winner   ~~Alice~~ · none yet".
 * Label left, value right; wraps at large text.
 */
export function ChangeRows({ rows }: ChangeRowsProps) {
  return (
    <View>
      {rows.map((row, index) => (
        <View
          key={row.key}
          accessible
          accessibilityLabel={`${row.label}: ${row.spokenValue ?? [row.struck, row.value].filter(Boolean).join(' ')}`}
          style={[styles.row, index < rows.length - 1 && styles.divider]}
        >
          <Text tone="supporting" style={styles.label}>
            {row.label}
          </Text>
          <Text variant="bodyStrong" tabular align="right" style={styles.value}>
            {row.struck ? (
              <Text variant="bodyStrong" tone="supporting" strike>
                {row.struck}
              </Text>
            ) : null}
            {row.struck ? ` ${row.value}` : row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: space.md,
    rowGap: 2,
    paddingVertical: space.md,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  label: { flexShrink: 1, flexBasis: 110, flexGrow: 1 },
  value: { marginLeft: 'auto', flexShrink: 1 },
});
