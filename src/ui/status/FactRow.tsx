import { StyleSheet, View } from 'react-native';

import { Text, type TextTone } from '../Text';
import { colors, space } from '../theme';

export interface FactRowProps {
  label: string;
  value: string;
  /** Small unit after the value ("stack left"). */
  unit?: string;
  /** `large` for the money rows in confirmation popups. Default `regular`. */
  emphasis?: 'regular' | 'large';
  tone?: TextTone;
  /** Bottom hairline. Default true. */
  divider?: boolean;
  /** Put the value under the label instead of at the right (Game details, stacked facts). */
  stacked?: boolean;
}

/** Read-only label / value line, e.g. "New total contribution   EUR 60.00". Wraps at large text. */
export function FactRow({ label, value, unit, emphasis = 'regular', tone, divider = true, stacked }: FactRowProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
      style={[styles.row, stacked && styles.stacked, divider && styles.divider]}
    >
      <Text variant={stacked ? 'supporting' : 'body'} tone="supporting" style={!stacked && styles.label}>
        {label}
      </Text>
      <Text
        variant={emphasis === 'large' ? 'amount' : 'bodyStrong'}
        tone={tone}
        tabular
        align={stacked ? 'left' : 'right'}
        style={!stacked && styles.value}
      >
        {value}
        {unit ? (
          <Text variant="supporting" tone="supporting" style={styles.unit}>
            {` ${unit}`}
          </Text>
        ) : null}
      </Text>
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
  stacked: { flexDirection: 'column', alignItems: 'flex-start' },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  label: { flexShrink: 1, flexBasis: 140, flexGrow: 1 },
  value: { marginLeft: 'auto' },
  unit: { letterSpacing: 0, fontWeight: '400' },
});
