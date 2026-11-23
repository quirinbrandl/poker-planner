import { View, type ViewStyle } from 'react-native';

import { colors } from '../theme';

export interface DividerProps {
  /** Vertical margin as a number. Default 0. */
  spacing?: number;
  /** Extend through the parent's horizontal padding (e.g. the page gutter). */
  inset?: number;
  style?: ViewStyle;
}

/** Decorative hairline divider. Never a substitute for a control boundary. */
export function Divider({ spacing = 0, inset = 0, style }: DividerProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ height: 1, backgroundColor: colors.divider, marginVertical: spacing, marginHorizontal: -inset }, style]}
    />
  );
}
