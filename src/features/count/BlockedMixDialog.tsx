import { StyleSheet, View } from 'react-native';

import { ChipSymbol, chipColorName, Dialog, space, Text, toneColors, radii } from '@/ui';

import type { BlockedChip, BlockedMixData } from './types';

/** A large chip with its "+1" / "−5" badge. Spoken "White chip, 1 chip unit, minus 5". */
export function ChipWithDelta({ chip, size = 72 }: { chip: BlockedChip; size?: number }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${chipColorName(chip.color)} chip, value ${chip.value}, ${chip.deltaText.replace('−', 'minus ')}`}
      style={styles.chip}
    >
      <ChipSymbol color={chip.color} value={chip.value} size={size} />
      <View style={[styles.delta, { top: size * 0.62, left: size * 0.62 + space.lg }]}>
        <Text variant="supporting" tone="error" strong tabular allowFontScaling={false}>
          {chip.deltaText}
        </Text>
      </View>
    </View>
  );
}

export interface BlockedMixDialogProps {
  visible: boolean;
  blocked: BlockedMixData | null;
  /** Back to editing: closes the popup; the entries stay as they were. */
  onBack: () => void;
}

/** "More chips than the game has" / "Not enough chips for this mix": nothing was saved, Back to editing. */
export function BlockedMixDialog({ visible, blocked, onBack }: BlockedMixDialogProps) {
  return (
    <Dialog visible={visible && blocked !== null} title={blocked?.title ?? ''} onCancel={onBack} cancelLabel="Back to editing">
      {blocked ? (
        <>
          <View style={styles.chips}>
            {blocked.chips.map((chip) => (
              <ChipWithDelta key={chip.value} chip={chip} />
            ))}
          </View>
          <Text>{blocked.message}</Text>
          <Text variant="supporting" tone="supporting">
            Nothing was saved.
          </Text>
        </>
      ) : null}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md },
  chip: { alignSelf: 'center', paddingHorizontal: space.lg, paddingBottom: space.xs },
  delta: {
    position: 'absolute',
    paddingHorizontal: space.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: toneColors.error.border,
    backgroundColor: toneColors.error.background,
  },
});
