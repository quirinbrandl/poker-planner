import { type Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  IconButton,
  ChipSymbol,
  chipColorName,
  colors,
  Icon,
  radii,
  space,
  StepperField,
  Text,
  type TextInputRef,
  touchTarget,
  usePressFeedback,
} from '@/ui';

import { denominationName, quantityCaption, quantitySpoken, steppedQuantityText } from './quantityText';
import type { QuantityEntry } from './types';

export interface ChipEntryPanelProps {
  /** One entry per denomination, ascending value. */
  entries: readonly QuantityEntry[];
  /** Index of the denomination shown large. */
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  /** The host typed (or stepped) a quantity: raw text, kept exactly as typed. */
  onChangeQuantity: (denominationValue: number, text: string) => void;
  quantityRef?: Ref<TextInputRef>;
}

/**
 * Count editor B's chip entry, shared by the final count and the rebuy-mix editors: one large chip
 * with its value and colour name, −1 / quantity / +1, Previous (icon) / Next, and the chip-image
 * picker with captions (×12, ×0, a dimmed "–" for a blank, Check entry) and a check on the selected
 * chip. Blank stays blank: it never reads as zero.
 */
export function ChipEntryPanel({ entries, selectedIndex, onSelectIndex, onChangeQuantity, quantityRef }: ChipEntryPanelProps) {
  const index = Math.min(Math.max(selectedIndex, 0), entries.length - 1);
  const entry = entries[index];
  const last = index === entries.length - 1;
  if (!entry) return null;

  const step = (delta: 1 | -1) => {
    const next = steppedQuantityText(entry, delta);
    if (next !== null) onChangeQuantity(entry.value, next);
  };

  return (
    <View style={styles.panel}>
      <Card variant="highlight" padding={space.xl} gap={space.sm} style={styles.focus}>
        <ChipSymbol
          color={entry.color}
          value={entry.value}
          size={116}
          accessibilityLabel={`${denominationName(entry)} (${index + 1} of ${entries.length})`}
        />
        <Text variant="supporting" tone="supporting" align="center">
          {chipColorName(entry.color)}
        </Text>
        <View style={styles.stepper}>
          <StepperField
            label="Quantity (chips)"
            labelHidden
            value={entry.quantityText}
            onChangeText={(text) => onChangeQuantity(entry.value, text)}
            onDecrement={() => step(-1)}
            onIncrement={() => step(1)}
            decrementLabel={`Decrease ${denominationName(entry)} by one`}
            incrementLabel={`Increase ${denominationName(entry)} by one`}
            decrementUnavailable={entry.state !== 'entered' || entry.count === 0}
            error={entry.error}
            inputRef={quantityRef}
          />
        </View>
      </Card>

      <View style={styles.navigation}>
        <IconButton
          icon="back"
          accessibilityLabel="Previous denomination"
          unavailable={index === 0}
          onPress={() => onSelectIndex(index - 1)}
        />
        <View style={styles.navItem}>
          <Button
            label={last ? 'Back to first' : 'Next'}
            trailingIcon={last ? undefined : 'forward'}
            accessibilityLabel={last ? 'Back to first denomination' : 'Next denomination'}
            fullWidth
            onPress={() => onSelectIndex(last ? 0 : index + 1)}
          />
        </View>
      </View>

      <View style={styles.picker} accessibilityRole="tablist" accessibilityLabel="Jump to denomination">
        {entries.map((item, itemIndex) => (
          <PickerChip
            key={item.value}
            entry={item}
            selected={itemIndex === index}
            onPress={() => onSelectIndex(itemIndex)}
          />
        ))}
      </View>
    </View>
  );
}

function PickerChip({ entry, selected, onPress }: { entry: QuantityEntry; selected: boolean; onPress: () => void }) {
  const feedback = usePressFeedback();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${denominationName(entry)}, ${quantitySpoken(entry)}`}
      style={({ pressed }) => [styles.tile, selected && styles.tileSelected, feedback(pressed)]}
    >
      <ChipSymbol color={entry.color} value={entry.value} size={36} />
      <Text
        variant="label"
        tone={entry.state === 'invalid' ? 'error' : entry.state === 'notEntered' ? 'supporting' : 'main'}
        tabular
        align="center"
      >
        {quantityCaption(entry)}
      </Text>
      {selected ? (
        <View style={styles.check}>
          <Icon name="check" size={14} color={colors.primary} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.md },
  focus: { alignItems: 'center' },
  stepper: { alignSelf: 'stretch', marginTop: space.xs },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  navItem: { flexGrow: 1, flexShrink: 1 },
  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tile: {
    flexGrow: 1,
    flexBasis: 50,
    minWidth: touchTarget,
    minHeight: touchTarget,
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    borderRadius: radii.tile,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
  },
  tileSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.selectedTint },
  check: { position: 'absolute', top: 4, right: 4 },
});
