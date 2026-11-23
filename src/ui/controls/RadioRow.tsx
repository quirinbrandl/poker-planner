import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { usePressFeedback } from '../motion';
import { Text } from '../Text';
import { colors, radii, space, touchTarget } from '../theme';

export interface RadioRowProps {
  label: string;
  /** Optional one-line explanation under the label. */
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** Extra content inside the row under the text (e.g. a chip preview in the template picker). */
  children?: ReactNode;
  unavailable?: boolean;
  testID?: string;
}

/** Labelled single-choice row. The whole row is the target and exposes its checked state. */
export function RadioRow({ label, description, selected, onPress, children, unavailable, testID }: RadioRowProps) {
  const feedback = usePressFeedback();
  return (
    <Pressable
      testID={testID}
      onPress={unavailable ? undefined : onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: selected, selected, disabled: Boolean(unavailable) }}
      aria-checked={selected}
      style={({ pressed }) => [
        styles.row,
        selected ? styles.selected : styles.unselected,
        unavailable && styles.unavailable,
        !unavailable && feedback(pressed, selected ? '#3B3352' : colors.surfacePressed),
      ]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.dot} /> : null}
      </View>
      <View style={styles.text}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? <Text variant="supporting">{description}</Text> : null}
        {children}
      </View>
    </Pressable>
  );
}

export interface RadioGroupProps {
  /** Group label ("Distribution preference"). Visible unless `hideLabel`. */
  label: string;
  children: ReactNode;
  /** Keep the label for screen readers only, when the screen title already names the choice ("Choose mode"). */
  hideLabel?: boolean;
}

/** Labels a set of RadioRows as one radio group. */
export function RadioGroup({ label, children, hideLabel }: RadioGroupProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group}>
      {hideLabel ? null : <Text variant="title">{label}</Text>}
      <View style={styles.options}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    minHeight: touchTarget + 6,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    borderRadius: radii.field + 2,
  },
  unselected: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.controlBorder },
  selected: {
    backgroundColor: colors.selectedTint,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: space.md + 1,
  },
  unavailable: { opacity: 0.6, borderStyle: 'dashed' },
  radio: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.onPrimary },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  text: { flex: 1, minWidth: 0, gap: 2 },
  group: { gap: space.md },
  options: { gap: space.sm },
});
