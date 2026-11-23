import { type RefObject, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { type ChipColor } from '@/domain/types';
import { usePressFeedback } from '../motion';
import { Dialog } from '../overlays/Dialog';
import { focusView } from '../overlays/focus';
import { type ViewRef } from '../refs';
import { Text } from '../Text';
import { colors, radii, space, touchTarget } from '../theme';
import { ChipSymbol } from './ChipSymbol';
import { chipColorChoices, chipColorName } from './palette';

export interface ChipColorPaletteProps {
  visible: boolean;
  /** The denomination's current colour; the staged choice starts here each time the palette opens. */
  color: ChipColor | null;
  /** Short line under the title, e.g. "Value: 5 chip units. Match your physical chips." */
  description?: string;
  /** Apply color: called with the staged choice. */
  onApply: (color: ChipColor | null) => void;
  /** Cancel, back button or backdrop: nothing changes. */
  onCancel: () => void;
  /** The chip button that opened the palette; focus returns to it when the palette closes. */
  returnFocusRef?: RefObject<ViewRef | null>;
}

/**
 * The labelled palette of all twelve chip colours (eleven colours plus No color) in a dialog.
 * The choice is staged until Apply color; Cancel keeps the previous colour.
 */
export function ChipColorPalette({
  visible,
  color,
  description,
  onApply,
  onCancel,
  returnFocusRef,
}: ChipColorPaletteProps) {
  const [staged, setStaged] = useState(color);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    // Opening again starts from the denomination's current colour.
    setWasVisible(visible);
    if (visible) setStaged(color);
  }
  const { fontScale } = useWindowDimensions();

  const returnFocus = () => setTimeout(() => focusView(returnFocusRef?.current ?? null), 50);

  return (
    <Dialog
      visible={visible}
      title="Chip color"
      confirmLabel="Apply color"
      onConfirm={() => {
        onApply(staged);
        returnFocus();
      }}
      onCancel={() => {
        onCancel();
        returnFocus();
      }}
    >
      {description ? <Text variant="supporting">{description}</Text> : null}
      <View accessibilityRole="radiogroup" accessibilityLabel="Chip color" style={styles.grid}>
        {chipColorChoices.map((choice) => (
          <ColorTile
            key={choice ?? 'none'}
            color={choice}
            selected={choice === staged}
            minWidth={76 * Math.max(1, fontScale)}
            onPress={() => setStaged(choice)}
          />
        ))}
      </View>
    </Dialog>
  );
}

function ColorTile({
  color,
  selected,
  minWidth,
  onPress,
}: {
  color: ChipColor | null;
  selected: boolean;
  minWidth: number;
  onPress: () => void;
}) {
  const feedback = usePressFeedback();
  const name = chipColorName(color);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={name}
      accessibilityState={{ checked: selected, selected }}
      aria-checked={selected}
      testID={`chip-color-${color ?? 'none'}`}
      style={({ pressed }) => [
        styles.tile,
        { flexBasis: minWidth },
        selected ? styles.tileSelected : null,
        feedback(pressed, selected ? colors.selectedTint : colors.surfacePressed),
      ]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.dot} /> : null}
      </View>
      <ChipSymbol color={color} size={44} />
      <Text variant="label" align="center">
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    flexGrow: 1,
    minHeight: Math.max(touchTarget, 104),
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space.xs + 2,
    paddingTop: space.xl,
    paddingBottom: space.md,
    paddingHorizontal: space.xs,
    borderRadius: radii.tile,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
  },
  tileSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.selectedTint,
  },
  radio: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    width: 16,
    height: 16,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  dot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.primary },
});
