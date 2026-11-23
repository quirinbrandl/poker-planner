import { type Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '../Icon';
import { usePressFeedback } from '../motion';
import { type ViewRef } from '../refs';
import { Text } from '../Text';
import { colors, radii, space, touchTarget } from '../theme';

export interface CheckboxRowProps {
  label: string;
  /** Optional line under the label, e.g. why the row is unavailable ("Already in this game"). */
  description?: string;
  checked: boolean;
  onPress: () => void;
  /** Keeps the row focusable and readable, reports it as disabled and never toggles. */
  unavailable?: boolean;
  ref?: Ref<ViewRef>;
  testID?: string;
}

/** Labelled multiple-choice row. The whole row is the target and exposes its checked state. */
export function CheckboxRow({ label, description, checked, onPress, unavailable, ref, testID }: CheckboxRowProps) {
  const feedback = usePressFeedback();
  return (
    <Pressable
      ref={ref}
      testID={testID}
      onPress={unavailable ? undefined : onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked, disabled: Boolean(unavailable) }}
      aria-checked={checked}
      style={({ pressed }) => [
        styles.row,
        checked ? styles.checked : styles.unchecked,
        !unavailable && feedback(pressed, checked ? colors.selectedTint : colors.surfacePressed),
      ]}
    >
      <View style={[styles.box, checked && styles.boxChecked, unavailable && styles.boxUnavailable]}>
        {checked ? <Icon name="check" size={16} color={colors.onPrimary} strokeWidth={2.6} /> : null}
      </View>
      <View style={styles.text}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? <Text variant="supporting">{description}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: touchTarget + 6,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    borderRadius: radii.field + 2,
  },
  unchecked: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.controlBorder },
  checked: {
    backgroundColor: colors.selectedTint,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: space.lg - 1,
    paddingVertical: space.md + 1,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { borderColor: colors.primary, backgroundColor: colors.primary },
  boxUnavailable: { borderColor: colors.divider, backgroundColor: colors.surfacePressed },
  text: { flex: 1, minWidth: 0, gap: 2 },
});
