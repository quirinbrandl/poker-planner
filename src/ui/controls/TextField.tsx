import { type ReactNode, type Ref, useId, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type ReturnKeyTypeOptions,
  type TextInputProps,
} from 'react-native';

import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';
import { colors, radii, space, tabularNums, type } from '../theme';
import { type TextInputRef } from '../refs';

/** `text` names, `decimal` EUR amounts, `whole` counts (depth, coverage, reserve, quantities). */
export type FieldKeyboard = 'text' | 'decimal' | 'whole';

export interface TextFieldProps {
  /** Persistent visible label. Never replaced by a placeholder, except a search field (`labelHidden` + `inputIcon`). */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Unit suffix shown inside the field and spoken with the label: EUR, BB, payments, stacks, chips … */
  unit?: string;
  /** Spoken form of the unit when it differs ("euros" for EUR). Default: `unit`. */
  unitSpoken?: string;
  /** Leading icon beside the label (decorative). */
  icon?: IconName;
  /** Decorative icon inside the box before the text (the search field, with `labelHidden` and a placeholder). */
  inputIcon?: IconName;
  /** Short helper line under the field. Shown together with an error. */
  helper?: string;
  /** Actionable error for this field. Shown under it in words and colour, and spoken with the field. */
  error?: string;
  keyboard?: FieldKeyboard;
  /**
   * `large` is the centred hero number of the count editor / stepper; `compact` is a 48-high box for
   * fields inside cards (a payout place's share).
   */
  size?: 'regular' | 'large' | 'compact';
  /**
   * The label is spoken but not shown, for a field whose visible context already names it (the
   * place badge on a payout card). Use sparingly: visible labels are the rule.
   */
  labelHidden?: boolean;
  /**
   * Fixed width of the input box (grows with text size, at most 60% of the row); `before` / `after`
   * then take the rest of the row. Default: the box fills the row.
   */
  inputWidth?: number;
  /** Content beside the input box (e.g. stepper − and + buttons). */
  before?: ReactNode;
  after?: ReactNode;
  /** Extra content under the helper (e.g. "Use automatic (3)"). */
  footer?: ReactNode;
  /** Centre the label (count editor). */
  centerLabel?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  returnKeyType?: ReturnKeyTypeOptions;
  autoFocus?: boolean;
  editable?: boolean;
  placeholder?: string;
  inputRef?: Ref<TextInputRef>;
  testID?: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
}

const keyboardType: Record<FieldKeyboard, TextInputProps['keyboardType']> = {
  text: 'default',
  decimal: 'decimal-pad',
  whole: 'number-pad',
};

/**
 * Labelled text/numeric input with unit suffix, helper and error. The error is linked to the input:
 * it is part of the input's accessibility hint and is announced politely when it appears.
 */
export function TextField({
  label,
  value,
  onChangeText,
  unit,
  unitSpoken,
  icon,
  inputIcon,
  helper,
  error,
  keyboard = 'text',
  size = 'regular',
  labelHidden,
  inputWidth,
  before,
  after,
  footer,
  centerLabel,
  onBlur,
  onFocus,
  onSubmitEditing,
  returnKeyType,
  autoFocus,
  editable = true,
  placeholder,
  inputRef,
  testID,
  autoCapitalize,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  const labelId = `${id}-label`;
  const { fontScale } = useWindowDimensions();
  const large = size === 'large';
  const compact = size === 'compact';
  const spokenLabel = unit ? `${label}, ${unitSpoken ?? unit}` : label;
  const hint = [error ? `Error: ${error}` : null, helper ?? null].filter(Boolean).join('. ') || undefined;
  const borderColor = error ? colors.error : focused ? colors.primary : colors.controlBorder;
  const borderWidth = error || focused ? 2 : 1;

  return (
    <View style={styles.field}>
      {labelHidden ? null : (
        <View style={[styles.labelRow, centerLabel && styles.center]}>
          {icon ? <Icon name={icon} size={18} color={colors.textSupporting} /> : null}
          <Text variant="label" nativeID={labelId} align={centerLabel ? 'center' : undefined}>
            {label}
          </Text>
        </View>
      )}
      <View style={styles.inputRow}>
        {before}
        <View
          style={[
            styles.box,
            large && styles.boxLarge,
            compact && styles.boxCompact,
            // A fixed-width box must not carry `flex: 1` at all: on Android that shorthand keeps a
            // zero basis even when the longhands are overridden, and the box collapses.
            inputWidth === undefined
              ? styles.boxFill
              : {
                  flexGrow: 0,
                  flexShrink: 1,
                  width: inputWidth * Math.min(Math.max(fontScale || 1, 1), 2),
                  maxWidth: '60%',
                },
            { borderColor, borderWidth, padding: borderWidth === 2 ? 0 : 1 },
            !editable && styles.readOnly,
          ]}
        >
          {inputIcon ? (
            <View style={styles.inputIcon}>
              <Icon name={inputIcon} size={20} color={colors.textSupporting} />
            </View>
          ) : null}
          <TextInput
            ref={inputRef}
            testID={testID}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => {
              setFocused(true);
              onFocus?.();
            }}
            onBlur={() => {
              setFocused(false);
              onBlur?.();
            }}
            onSubmitEditing={onSubmitEditing}
            returnKeyType={returnKeyType}
            submitBehavior={onSubmitEditing ? 'submit' : undefined}
            autoFocus={autoFocus}
            editable={editable}
            keyboardType={keyboardType[keyboard]}
            inputMode={keyboard === 'decimal' ? 'decimal' : keyboard === 'whole' ? 'numeric' : 'text'}
            autoCapitalize={autoCapitalize ?? (keyboard === 'text' ? 'words' : 'none')}
            autoCorrect={false}
            placeholder={placeholder}
            placeholderTextColor={colors.controlBorder}
            accessibilityLabel={spokenLabel}
            accessibilityHint={hint}
            aria-invalid={error ? true : undefined}
            selectionColor={colors.primary}
            cursorColor={colors.primary}
            style={[
              styles.input,
              large ? styles.inputLarge : null,
              compact ? styles.inputCompact : null,
              keyboard !== 'text' && { fontVariant: tabularNums },
              inputIcon ? styles.inputAfterIcon : null,
            ]}
          />
          {unit ? (
            <Text
              variant="supporting"
              importantForAccessibility="no"
              accessibilityElementsHidden
              style={[styles.unit, compact && styles.unitCompact]}
            >
              {unit}
            </Text>
          ) : null}
        </View>
        {after}
      </View>
      {error ? (
        <View style={styles.message} accessibilityLiveRegion="polite">
          <Icon name="error" size={16} color={colors.error} />
          <Text variant="supporting" tone="error" style={styles.messageText}>
            {error}
          </Text>
        </View>
      ) : null}
      {helper ? (
        <Text variant="caption" style={styles.helper} importantForAccessibility="no" accessibilityElementsHidden>
          {helper}
        </Text>
      ) : null}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.sm, minWidth: 0 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  center: { justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  boxFill: { flex: 1 },
  box: {
    minWidth: 0,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.field,
  },
  boxLarge: { minHeight: 84 },
  boxCompact: { minHeight: 48 },
  readOnly: { opacity: 0.7 },
  input: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    color: colors.text,
    fontSize: 18,
  },
  inputCompact: { paddingHorizontal: space.md, paddingVertical: space.sm },
  inputIcon: { paddingLeft: space.lg },
  inputAfterIcon: { paddingLeft: space.sm },
  inputLarge: { ...type.amountHero, color: colors.text, textAlign: 'center', paddingVertical: space.sm },
  unit: { paddingRight: space.lg, paddingLeft: space.xs },
  unitCompact: { paddingRight: space.md },
  message: { flexDirection: 'row', gap: space.xs + 2, alignItems: 'flex-start' },
  messageText: { flex: 1 },
  helper: { marginTop: -2 },
});
