import { type Ref } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import type { ChipColor } from '@/domain/types';
import {
  ChipColorButton,
  chipColorName,
  colors,
  Icon,
  IconButton,
  space,
  Text,
  TextField,
  type TextInputRef,
  type ViewRef,
} from '@/ui';

export interface DenominationField {
  /** Raw text, exactly as stored. */
  text: string;
  /** The problem to show now, if any. */
  error?: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  inputRef?: Ref<TextInputRef>;
}

export interface DenominationRowProps {
  /** 1-based position, used in the spoken names. */
  index: number;
  color: ChipColor | null;
  value: DenominationField;
  quantity: DenominationField;
  onColorPress: () => void;
  colorRef?: Ref<ViewRef>;
  onRemove: () => void;
}

/** From this text size on, a row stacks (chip and remove on top, labelled fields below). */
const STACK_FROM_FONT_SCALE = 1.3;
/** Width of the chip column; the column headings line up with it. */
const CHIP_COLUMN = 64;

function useStacked(): boolean {
  const { fontScale } = useWindowDimensions();
  return (fontScale || 1) >= STACK_FROM_FONT_SCALE;
}

/**
 * The "Value" and "Chips" column headings, once above the denomination rows. Decorative for screen
 * readers (each field speaks its full name). Nothing at large text, where every row labels its fields.
 */
export function DenominationHeadings() {
  if (useStacked()) return null;
  return (
    <View style={styles.headings} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={styles.chipColumn} />
      <Text variant="caption" style={styles.field}>
        Value
      </Text>
      <View style={styles.times} />
      <Text variant="caption" style={styles.field}>
        Chips
      </Text>
      <View style={styles.removeColumn} />
    </View>
  );
}

/**
 * One denomination on one line: the chip symbol with its value (opens the colour chooser) and the
 * colour name under it, the value field, "×", the quantity field and an icon-only remove. Field
 * errors sit under the row. At large text the row stacks. Shared by a game's Chip set step and the
 * template editor.
 */
export function DenominationRow({ index, color, value, quantity, onColorPress, colorRef, onRemove }: DenominationRowProps) {
  const stacked = useStacked();
  const valueText = value.text.trim();
  const errors = [value.error, quantity.error].filter((message): message is string => Boolean(message));

  const chip = (
    <ChipColorButton
      ref={colorRef}
      layout="compact"
      color={color}
      value={valueText || undefined}
      onPress={onColorPress}
      accessibilityLabel={`Change chip color for denomination ${index}, value ${valueText || 'not entered'}${valueText ? ' chip units' : ''}. Current color ${chipColorName(color)}.`}
    />
  );
  const remove = (
    <IconButton
      icon="trash"
      variant="plain"
      accessibilityLabel={`Remove denomination ${index}${valueText ? ` (value ${valueText})` : ''}`}
      onPress={onRemove}
    />
  );
  const valueField = (
    <TextField
      label="Value"
      spokenLabel={`Value (chip units), denomination ${index}`}
      labelHidden={!stacked}
      errorTextHidden
      size="compact"
      keyboard="whole"
      returnKeyType="next"
      value={value.text}
      onChangeText={value.onChangeText}
      onBlur={value.onBlur}
      error={value.error}
      inputRef={value.inputRef}
      testID={`chip-value-${index}`}
    />
  );
  const quantityField = (
    <TextField
      label="Chips"
      spokenLabel={`Quantity (chips), denomination ${index}`}
      labelHidden={!stacked}
      errorTextHidden
      size="compact"
      keyboard="whole"
      value={quantity.text}
      onChangeText={quantity.onChangeText}
      onBlur={quantity.onBlur}
      error={quantity.error}
      inputRef={quantity.inputRef}
      testID={`chip-quantity-${index}`}
    />
  );
  const times = (
    <View style={styles.times}>
      <Text tone="supporting" importantForAccessibility="no" accessibilityElementsHidden>
        ×
      </Text>
    </View>
  );

  return (
    <View style={styles.wrap}>
      {stacked ? (
        <View style={styles.stack}>
          <View style={styles.stackTop}>
            {chip}
            {remove}
          </View>
          {valueField}
          {quantityField}
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.chipColumn}>{chip}</View>
          <View style={styles.field}>{valueField}</View>
          {times}
          <View style={styles.field}>{quantityField}</View>
          <View style={styles.removeColumn}>{remove}</View>
        </View>
      )}
      {errors.map((message) => (
        <View key={message} style={[styles.error, !stacked && styles.errorIndented]} accessibilityLiveRegion="polite">
          <Icon name="error" size={16} color={colors.error} />
          <Text variant="supporting" tone="error" style={styles.errorText}>
            {message}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  headings: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginBottom: -space.sm },
  chipColumn: { width: CHIP_COLUMN, alignItems: 'center' },
  field: { flex: 1, minWidth: 0 },
  times: { width: 12, alignItems: 'center' },
  removeColumn: { width: 48 },
  stack: { gap: space.md },
  stackTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  error: { flexDirection: 'row', gap: space.xs + 2, alignItems: 'flex-start' },
  errorIndented: { paddingLeft: CHIP_COLUMN + space.sm },
  errorText: { flex: 1 },
});
