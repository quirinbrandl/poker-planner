import { StyleSheet, View } from 'react-native';

import { Icon } from '../Icon';
import { Text } from '../Text';
import { colors, radii, space } from '../theme';

export interface ChangePillProps {
  /** Requested / configured value, shown struck through: "100 BB". */
  from: string;
  /** The value actually used: "98 BB". */
  to: string;
  /** Spoken form. Default "Adjusted from <from> to <to>". */
  accessibilityLabel?: string;
}

/** Amber "⚠ ~~100 BB~~ → 98 BB" adjustment pill. */
export function ChangePill({ from, to, accessibilityLabel }: ChangePillProps) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel ?? `Adjusted from ${from} to ${to}`} style={styles.pill}>
      <Icon name="warning" size={14} color={colors.warning} />
      <Text variant="label" tabular style={styles.text}>
        <Text variant="label" strike style={styles.old}>
          {from}
        </Text>
        {` → ${to}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs + 1,
    paddingHorizontal: space.sm + 1,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: '#362912',
  },
  text: { color: colors.warning, fontWeight: '700' },
  old: { color: colors.warningMuted, fontWeight: '500' },
});
