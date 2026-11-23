import { type Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { type ChipColor } from '@/domain/types';
import { usePressFeedback } from '../motion';
import { type ViewRef } from '../refs';
import { Text } from '../Text';
import { colors, radii, space, touchTarget } from '../theme';
import { ChipSymbol } from './ChipSymbol';
import { chipColorName } from './palette';

export interface ChipColorButtonProps {
  color: ChipColor | null;
  value?: number | string;
  onPress: () => void;
  /** Specific name, e.g. "Change chip color for denomination 2, value 5 chip units. Current color Red." */
  accessibilityLabel: string;
  /** Caption above the colour name. Default "Chip color". */
  caption?: string;
  /** For returning focus here when the palette closes. */
  ref?: Ref<ViewRef>;
  /**
   * `row` (default): chip with "Chip color / Red" beside it. `compact`: a smaller chip with only the
   * colour name as a caption under it, for the one-line denomination row.
   */
  layout?: 'row' | 'compact';
}

/** Tappable chip symbol with "Chip color / Red" text; opens the colour palette in a denomination row. */
export function ChipColorButton({
  color,
  value,
  onPress,
  accessibilityLabel,
  caption = 'Chip color',
  ref,
  layout = 'row',
}: ChipColorButtonProps) {
  const feedback = usePressFeedback();
  if (layout === 'compact') {
    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Opens the color palette"
        style={({ pressed }) => [styles.compact, feedback(pressed, colors.surfacePressed)]}
      >
        <ChipSymbol color={color} value={value} size={48} />
        <Text variant="caption" align="center">
          {chipColorName(color)}
        </Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens the color palette"
      style={({ pressed }) => [styles.button, feedback(pressed, colors.surfacePressed)]}
    >
      <ChipSymbol color={color} value={value} size={60} />
      <View style={styles.text}>
        <Text variant="caption">{caption}</Text>
        <Text variant="bodyStrong">{chipColorName(color)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: touchTarget,
    padding: 6,
    marginLeft: -6,
    borderRadius: radii.control,
    flexShrink: 1,
  },
  text: { flexShrink: 1 },
  compact: {
    alignItems: 'center',
    gap: 2,
    minWidth: 64,
    minHeight: touchTarget,
    paddingVertical: space.xs,
    paddingHorizontal: 2,
    borderRadius: radii.control,
  },
});
