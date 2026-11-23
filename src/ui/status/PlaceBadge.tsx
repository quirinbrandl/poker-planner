import { StyleSheet, View } from 'react-native';

import { Text } from '../Text';
import { colors, radii, space } from '../theme';

export interface PlaceBadgeProps {
  /** "1st", "2nd" … */
  label: string;
  /** Lavender ring and text (1st place). */
  highlight?: boolean;
}

/**
 * Round finishing-place badge. Grows into a pill with larger text instead of clipping. Decorative by
 * default: the place is spoken by the row or field it belongs to.
 */
export function PlaceBadge({ label, highlight }: PlaceBadgeProps) {
  return (
    <View
      style={[styles.badge, highlight && styles.highlight]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text variant="label" tabular numberOfLines={1} tone={highlight ? 'primary' : 'main'} style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 42,
    minHeight: 42,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surfaceSunken,
  },
  highlight: { borderColor: colors.primary },
  text: { fontWeight: '700' },
});
