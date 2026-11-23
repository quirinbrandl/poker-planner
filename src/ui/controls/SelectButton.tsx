import { type Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '../Icon';
import { usePressFeedback } from '../motion';
import { Text } from '../Text';
import { colors, radii, space, touchTarget } from '../theme';
import { type ViewRef } from '../refs';

export interface SelectButtonProps {
  /** Small label above the value: "Preset". */
  label: string;
  /** The current choice: "Top 2", "Custom". */
  value: string;
  /** Optional line under the value: "Suggested for 6 players: Top 2". */
  description?: string | null;
  /** Opens the list of choices (a `ChoiceSheet`). */
  onPress: () => void;
  /** Spoken after the name. Default "Opens the list of choices". */
  accessibilityHint?: string;
  ref?: Ref<ViewRef>;
  testID?: string;
}

/** Full-width button showing the current choice with a chevron; opens a sheet of choices. */
export function SelectButton({ label, value, description, onPress, accessibilityHint, ref, testID }: SelectButtonProps) {
  const feedback = usePressFeedback();
  return (
    <Pressable
      ref={ref}
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[`${label}: ${value}`, description].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint ?? 'Opens the list of choices'}
      style={({ pressed }) => [styles.button, feedback(pressed, colors.surfacePressed)]}
    >
      <View style={styles.text}>
        <Text variant="supporting">{label}</Text>
        <Text variant="title">{value}</Text>
        {description ? <Text variant="supporting">{description}</Text> : null}
      </View>
      <Icon name="chevronDown" size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: touchTarget,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radii.field + 2,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
  },
  text: { flex: 1, minWidth: 0 },
});
