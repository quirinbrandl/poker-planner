import { type Ref } from 'react';

import { IconButton } from './IconButton';
import { TextField } from './TextField';
import { type TextInputRef } from '../refs';

export interface StepperFieldProps {
  label: string;
  /** Raw text, kept exactly as typed (empty is not zero). */
  value: string;
  onChangeText: (text: string) => void;
  /** The caller decides what − and + do; the stepper has no number rules of its own. */
  onDecrement: () => void;
  onIncrement: () => void;
  /** Spoken names of the buttons. Defaults: "Decrease <label>" / "Increase <label>". */
  decrementLabel?: string;
  incrementLabel?: string;
  decrementUnavailable?: boolean;
  unit?: string;
  helper?: string;
  error?: string;
  inputRef?: Ref<TextInputRef>;
  testID?: string;
}

/** − / quantity / + whole-number field: the count editor's large quantity entry. */
export function StepperField({
  label,
  value,
  onChangeText,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  decrementUnavailable,
  unit,
  helper,
  error,
  inputRef,
  testID,
}: StepperFieldProps) {
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      keyboard="whole"
      size="large"
      centerLabel
      unit={unit}
      helper={helper}
      error={error}
      inputRef={inputRef}
      testID={testID}
      before={
        <IconButton
          icon="minus"
          accessibilityLabel={decrementLabel ?? `Decrease ${label}`}
          onPress={onDecrement}
          unavailable={decrementUnavailable}
        />
      }
      after={
        <IconButton icon="plus" accessibilityLabel={incrementLabel ?? `Increase ${label}`} onPress={onIncrement} />
      }
    />
  );
}
