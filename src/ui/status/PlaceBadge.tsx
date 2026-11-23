import { StyleSheet, View } from 'react-native';

import { Text } from '../Text';
import { colors, radii, space } from '../theme';

export interface PlaceBadgeProps {
  /** "1st", "2nd" … */
  label: string;
  /** Lavender ring and text (1st place). */
  highlight?: boolean;
  /** Filled lavender with dark text: the winner (1st place of a finished order). */
  filled?: boolean;
}

/**
 * Round finishing-place badge. Grows into a pill with larger text instead of clipping. Decorative by
 * default: the place is spoken by the row or field it belongs to.
 */
export function PlaceBadge({ label, highlight, filled }: PlaceBadgeProps) {
  return (
    <View
      style={[styles.badge, (highlight || filled) && styles.highlight, filled && styles.filled]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text variant="label" tabular numberOfLines={1} tone={filled ? 'main' : highlight ? 'primary' : 'main'} style={[styles.text, filled && styles.filledText]}>
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
  filled: { backgroundColor: colors.primary },
  filledText: { color: colors.onPrimary },
  text: { fontWeight: '700' },
});
