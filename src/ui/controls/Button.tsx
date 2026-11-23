import { type Ref } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '../Icon';
import { usePressFeedback } from '../motion';
import { Text } from '../Text';
import { colors, radii, space, touchTarget } from '../theme';
import { type ViewRef } from '../refs';

/**
 * - `primary`: the one dominant action of a task. Lavender pill, dark text.
 * - `secondary`: outlined raised surface (Back, Cancel, Choose template).
 * - `tertiary`: text control with a full touch target (+ Add player, Use automatic).
 * - `destructive`: coral treatment for Delete / Return to Planning. Never Lavender.
 * - `tonal`: Lavender-tinted pill for repeated row actions (+ Rebuy).
 */
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'tonal';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** `compact` for buttons inside rows (Rebuy / Result). Both sizes keep the 48 target. */
  size?: 'regular' | 'compact';
  icon?: IconName;
  trailingIcon?: IconName;
  /** Stretch to the container width. */
  fullWidth?: boolean;
  /**
   * Hug the label at the start of the container. A tertiary button also pulls its padding into the
   * margin so its icon lines up with the text above it ("Use automatic (3)" under a field).
   */
  alignStart?: boolean;
  /**
   * The action cannot run now. The button keeps its place and focusability, reports itself as
   * disabled to assistive tech and never calls `onPress`; `onUnavailablePress` may explain why.
   */
  unavailable?: boolean;
  onUnavailablePress?: () => void;
  /** Work in progress: shows `loadingLabel` (e.g. "Calculating…"), reports busy and ignores presses. */
  loading?: boolean;
  loadingLabel?: string;
  /** Override the spoken name when the visible label needs context ("Rebuy for Ben"). */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  ref?: Ref<ViewRef>;
  testID?: string;
}

const look: Record<ButtonVariant, { bg: string; border: string; text: string; pressed: string; radius: number }> = {
  primary: {
    bg: colors.primary,
    border: colors.primary,
    text: colors.onPrimary,
    pressed: colors.primaryPressed,
    radius: radii.pill,
  },
  secondary: {
    bg: colors.surface,
    border: colors.controlBorder,
    text: colors.text,
    pressed: colors.surfacePressed,
    radius: radii.control,
  },
  tertiary: {
    bg: 'transparent',
    border: 'transparent',
    text: colors.text,
    pressed: colors.surface,
    radius: radii.control,
  },
  destructive: {
    bg: colors.errorBackground,
    border: colors.error,
    text: colors.error,
    pressed: '#4D2C30',
    radius: radii.control,
  },
  tonal: {
    bg: colors.selectedTint,
    border: colors.primary,
    text: colors.primary,
    pressed: '#41385A',
    radius: radii.pill,
  },
};

/** Labelled action button in the approved treatments, with optional icons and unavailable/loading states. */
export function Button({
  label,
  onPress,
  variant = 'secondary',
  size = 'regular',
  icon,
  trailingIcon,
  fullWidth,
  alignStart,
  unavailable,
  onUnavailablePress,
  loading,
  loadingLabel,
  accessibilityLabel,
  accessibilityHint,
  style,
  ref,
  testID,
}: ButtonProps) {
  const feedback = usePressFeedback();
  const l = look[variant];
  const muted = unavailable || loading;
  const textColor = muted && variant !== 'primary' ? colors.textSupporting : l.text;
  const shownLabel = loading && loadingLabel ? loadingLabel : label;
  const compact = size === 'compact';

  const handlePress = () => {
    if (loading) return;
    if (unavailable) onUnavailablePress?.();
    else onPress?.();
  };

  return (
    <Pressable
      ref={ref}
      testID={testID}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? shownLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(unavailable || loading), busy: Boolean(loading) }}
      aria-disabled={Boolean(unavailable || loading)}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: l.bg,
          borderColor: l.border,
          borderRadius: l.radius,
          paddingHorizontal: variant === 'tertiary' ? space.md : compact ? space.md : space.xl,
          gap: compact ? 6 : space.sm,
          minHeight: compact ? touchTarget : 52,
        },
        muted && variant === 'primary' && styles.primaryMuted,
        unavailable && variant !== 'primary' && variant !== 'tertiary' && styles.unavailableBorder,
        fullWidth && styles.fullWidth,
        alignStart && styles.alignStart,
        alignStart && variant === 'tertiary' && styles.pullStart,
        style,
        !muted && feedback(pressed, l.pressed),
      ]}
    >
      {icon ? <Icon name={icon} size={compact ? 16 : 20} color={textColor} /> : null}
      <Text
        variant={compact ? 'label' : 'bodyStrong'}
        align="center"
        style={{ color: textColor, fontWeight: variant === 'primary' ? '700' : '600' }}
      >
        {shownLabel}
      </Text>
      {trailingIcon ? <Icon name={trailingIcon} size={compact ? 16 : 20} color={textColor} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    // Explicit, so Android returns to a solid border when a dashed state ends.
    borderStyle: 'solid',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderWidth: 1,
    minWidth: touchTarget,
    paddingVertical: space.sm,
  },
  fullWidth: { alignSelf: 'stretch' },
  alignStart: { alignSelf: 'flex-start' },
  pullStart: { marginLeft: -space.md },
  primaryMuted: { opacity: 0.55 },
  unavailableBorder: { borderStyle: 'dashed' },
});
