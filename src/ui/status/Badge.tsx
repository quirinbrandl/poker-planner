import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';
import { radii, space, toneColors, type Tone } from '../theme';

export interface BadgeProps {
  label: string;
  /**
   * `neutral` for mode/player-count tags ("Cash game", "6 players"), `primary` for Planning / In progress,
   * `confirmed` for Completed, `warning` for open work ("Count draft"), `error` for blocked records.
   */
  tone?: Tone;
  icon?: IconName;
  size?: 'regular' | 'small';
}

/** Status/mode pill. The words carry the meaning; the colour only supports them. */
export function Badge({ label, tone = 'neutral', icon, size = 'regular' }: BadgeProps) {
  const t = toneColors[tone];
  return (
    <View
      style={[styles.badge, size === 'small' && styles.small, { backgroundColor: t.background, borderColor: t.border }]}
    >
      {icon ? <Icon name={icon} size={14} color={t.text} /> : null}
      <Text variant={size === 'small' ? 'caption' : 'supporting'} style={[{ color: t.text }, styles.text]}>
        {label}
      </Text>
    </View>
  );
}

export interface BadgeRowProps {
  children: React.ReactNode;
}

/** Wrapping row of badges. */
export function BadgeRow({ children }: BadgeRowProps) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    paddingHorizontal: space.md - 1,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  small: { paddingHorizontal: space.sm, paddingVertical: 1 },
  text: { fontWeight: '500' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2, alignItems: 'center' },
});
