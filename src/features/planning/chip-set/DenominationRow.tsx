import { type Ref } from 'react';

import type { ChipColor } from '@/domain/types';
import {
  Card,
  ChipColorButton,
  chipColorName,
  Columns,
  IconButton,
  space,
  Stack,
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

/**
 * One paired denomination row: the chip colour control and an icon-only remove on top, the
 * Value (chip units) and Quantity (chips) fields side by side below (stacked when narrow or at
 * large text). Shared by a game's Chip set step and the template editor.
 */
export function DenominationRow({ index, color, value, quantity, onColorPress, colorRef, onRemove }: DenominationRowProps) {
  const valueText = value.text.trim();
  return (
    <Card gap={space.lg}>
      <Stack direction="row" justify="space-between" wrap={false}>
        <ChipColorButton
          ref={colorRef}
          color={color}
          value={valueText || undefined}
          onPress={onColorPress}
          accessibilityLabel={`Change chip color for denomination ${index}, value ${valueText || 'not entered'}${valueText ? ' chip units' : ''}. Current color ${chipColorName(color)}.`}
        />
        <IconButton
          icon="trash"
          variant="outline"
          accessibilityLabel={`Remove denomination ${index}${valueText ? ` (value ${valueText})` : ''}`}
          onPress={onRemove}
        />
      </Stack>
      <Columns>
        <TextField
          label="Value (chip units)"
          keyboard="whole"
          returnKeyType="next"
          value={value.text}
          onChangeText={value.onChangeText}
          onBlur={value.onBlur}
          error={value.error}
          inputRef={value.inputRef}
          testID={`chip-value-${index}`}
        />
        <TextField
          label="Quantity (chips)"
          keyboard="whole"
          value={quantity.text}
          onChangeText={quantity.onChangeText}
          onBlur={quantity.onBlur}
          error={quantity.error}
          inputRef={quantity.inputRef}
          testID={`chip-quantity-${index}`}
        />
      </Columns>
    </Card>
  );
}
