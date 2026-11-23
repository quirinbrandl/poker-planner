import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '../layout/Card';
import { Text } from '../Text';
import { space } from '../theme';

export interface StackShowcaseProps {
  /** Left label, e.g. "1 starting stack" or "Stack to hand out". */
  label: string;
  /** Right value, e.g. "200". */
  value: string;
  /** Unit after the value, e.g. "chip units". */
  unit?: string;
  /** Under the label, e.g. a ChangePill for an adjusted depth. */
  adjustment?: ReactNode;
  /** Usually ChipTowers. */
  children: ReactNode;
  size?: 'showcase' | 'compact';
}

/** Radial-lit stage with a "label … value unit" header, used around ChipTowers. */
export function StackShowcase({ label, value, unit, adjustment, children, size = 'showcase' }: StackShowcaseProps) {
  const compact = size === 'compact';
  return (
    <Card variant="showcase" padding={compact ? space.md : space.lg} style={styles.card}>
      <View style={styles.header} accessible accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}>
        <View style={styles.left}>
          <Text variant={compact ? 'supporting' : 'overline'} tone={compact ? 'main' : 'supporting'}>
            {label}
          </Text>
        </View>
        <Text variant={compact ? 'bodyStrong' : 'amountLarge'} tabular style={!compact && styles.big}>
          {value}
          {unit ? (
            <Text
              variant={compact ? 'bodyStrong' : 'supporting'}
              tone={compact ? 'main' : 'supporting'}
              style={styles.unit}
            >
              {` ${unit}`}
            </Text>
          ) : null}
        </Text>
      </View>
      {adjustment ? <View style={styles.adjustment}>{adjustment}</View> : null}
      <View style={styles.rule} />
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  left: { flexShrink: 1, paddingBottom: 4 },
  big: { fontSize: 40, lineHeight: 44 },
  adjustment: { flexDirection: 'row', marginTop: -space.xs },
  unit: { letterSpacing: 0 },
  rule: { height: 1, backgroundColor: '#2B3A47' },
});
