import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';

import { Card } from '../layout/Card';
import { Text } from '../Text';
import { colors, space } from '../theme';
import { Avatar } from './Avatar';

export interface TransferCardProps {
  from: string;
  to: string;
  /** Pre-formatted amount, e.g. "EUR 8.00". */
  amount: string;
  /** Word under the arrow. Default "pays". */
  verb?: string;
  onPress?: () => void;
}

function Person({ name }: { name: string }) {
  return (
    <View style={styles.person}>
      <Avatar name={name} />
      <Text variant="label" align="center">
        {name}
      </Text>
    </View>
  );
}

/**
 * Payment instruction card: payer → amount → receiver. Spoken as "Bob pays Clara EUR 8.00".
 * At large text or narrow widths it stacks vertically instead of clipping.
 */
export function TransferCard({ from, to, amount, verb = 'pays', onPress }: TransferCardProps) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.5 || width < 340;
  const label = `${from} ${verb} ${to} ${amount}`;
  if (stacked) {
    return (
      <Card padding={space.lg} gap={space.sm} accessibilityLabel={label} onPress={onPress}>
        <View style={styles.stackRow}>
          <Avatar name={from} />
          <Text variant="title">{from}</Text>
        </View>
        <View style={styles.stackMiddle}>
          <Text variant="amount" tabular>
            {amount}
          </Text>
          <Text variant="caption">{`${verb} ↓`}</Text>
        </View>
        <View style={styles.stackRow}>
          <Avatar name={to} />
          <Text variant="title">{to}</Text>
        </View>
      </Card>
    );
  }
  return (
    <Card padding={space.md + 2} accessibilityLabel={label} onPress={onPress} style={styles.row}>
      <Person name={from} />
      <View style={styles.middle}>
        <Text variant="amount" tabular align="center">
          {amount}
        </Text>
        <View style={styles.arrow}>
          <View style={styles.line} />
          <Svg width={12} height={16} viewBox="0 0 12 16">
            <Path d="M0 0 L12 8 L0 16 Z" fill={colors.primary} />
          </Svg>
        </View>
        <Text variant="caption" align="center">
          {verb}
        </Text>
      </View>
      <Person name={to} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  person: { alignItems: 'center', gap: space.xs, minWidth: 64, maxWidth: 96 },
  middle: { flex: 1, minWidth: 0, alignItems: 'stretch', gap: 2 },
  arrow: { flexDirection: 'row', alignItems: 'center' },
  line: { flex: 1, height: 2, backgroundColor: colors.primary, marginRight: -1 },
  stackRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stackMiddle: { paddingLeft: 52, gap: 2 },
});
