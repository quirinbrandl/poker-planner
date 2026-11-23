import { type Ref } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '../Icon';
import { usePressFeedback } from '../motion';
import { colors, radii, touchTarget } from '../theme';
import { type ViewRef } from '../refs';

export interface IconButtonProps {
  icon: IconName;
  /** Required: the specific action, e.g. "Remove denomination 2 (value 5)". */
  accessibilityLabel: string;
  onPress?: () => void;
  /** `outline` (bordered raised square, row actions) or `plain` (top bar ⋯). Default `outline`. */
  variant?: 'outline' | 'plain';
  /** `destructive` colours the glyph coral. */
  tone?: 'default' | 'destructive' | 'primary';
  unavailable?: boolean;
  accessibilityHint?: string;
  style?: ViewStyle;
  ref?: Ref<ViewRef>;
  testID?: string;
}

/** Icon-only 48×48 button with a required accessible name. */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'outline',
  tone = 'default',
  unavailable,
  accessibilityHint,
  style,
  ref,
  testID,
}: IconButtonProps) {
  const feedback = usePressFeedback();
  const color = unavailable
    ? colors.controlBorder
    : tone === 'destructive'
      ? colors.error
      : tone === 'primary'
        ? colors.primary
        : colors.text;
  return (
    <Pressable
      ref={ref}
      testID={testID}
      onPress={unavailable ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(unavailable) }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        variant === 'outline' ? styles.outline : styles.plain,
        style,
        !unavailable && feedback(pressed, colors.surfacePressed),
      ]}
    >
      <Icon name={icon} size={22} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.control,
  },
  outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.controlBorder },
  plain: { backgroundColor: 'transparent' },
});
