import { type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityRole, type ViewStyle } from 'react-native';

import { usePressFeedback } from '../motion';
import { colors, radii, space } from '../theme';
import { RadialBackdrop } from './Gradient';
import { type ViewRef } from '../refs';

/**
 * - `raised`: the standard grouped surface (field groups, rows, payment cards).
 * - `highlight`: the prominent active-game card with a soft Lavender light.
 * - `inset`: page-coloured well inside a raised surface or dialog (game identity, pills strip).
 * - `showcase`: the radial-lit stage behind the chip towers.
 */
export type CardVariant = 'raised' | 'highlight' | 'inset' | 'showcase';

export interface CardProps {
  variant?: CardVariant;
  /** Inner padding. Default 18. */
  padding?: number;
  /** Gap between children. Default 0. */
  gap?: number;
  /** Makes the whole card one button. Give it an `accessibilityLabel` that summarises the card. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  style?: ViewStyle;
  ref?: Ref<ViewRef>;
  children?: ReactNode;
}

const variantStyle: Record<CardVariant, ViewStyle> = {
  raised: { backgroundColor: colors.surface, borderColor: colors.divider, borderRadius: radii.card },
  highlight: { backgroundColor: colors.surface, borderColor: colors.highlightBorder, borderRadius: radii.card },
  inset: { backgroundColor: colors.surfaceSunken, borderColor: colors.divider, borderRadius: radii.tile },
  showcase: { backgroundColor: '#141E27', borderColor: '#3F5263', borderRadius: radii.sheet },
};

function Backdrop({ variant }: { variant: CardVariant }) {
  if (variant === 'highlight')
    return (
      <RadialBackdrop
        cx={1}
        cy={0}
        rx={1.3}
        ry={1}
        stops={[
          { offset: 0, color: '#3A304A' },
          { offset: 0.8, color: colors.surface },
          { offset: 1, color: colors.surface },
        ]}
      />
    );
  if (variant === 'showcase')
    return (
      <RadialBackdrop
        stops={[
          { offset: 0, color: '#293847' },
          { offset: 0.58, color: '#141E27' },
          { offset: 1, color: '#0C1319' },
        ]}
      />
    );
  return null;
}

/** Raised, highlighted, inset or showcase surface. Pressable when `onPress` is given. */
export function Card({
  variant = 'raised',
  padding = space.card,
  gap = 0,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  style,
  ref,
  children,
}: CardProps) {
  const feedback = usePressFeedback();
  const base = [styles.card, variantStyle[variant], { padding, gap }, style];
  if (onPress) {
    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [...base, feedback(pressed, variant === 'raised' ? colors.surfacePressed : undefined)]}
      >
        <Backdrop variant={variant} />
        {children}
      </Pressable>
    );
  }
  return (
    <View
      ref={ref}
      style={base}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessible={accessibilityLabel ? true : undefined}
    >
      <Backdrop variant={variant} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden', minWidth: 0 },
});
