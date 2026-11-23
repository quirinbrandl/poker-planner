import { Pressable, StyleSheet, View } from 'react-native';

import { usePressFeedback } from '../motion';
import { Text } from '../Text';
import { colors, radii, space, touchTarget } from '../theme';

export interface SegmentedChoiceOption {
  key: string;
  label: string;
}

export interface SegmentedChoiceProps {
  /** Visible group label ("Distribution preference"), also the radio group's name. */
  label: string;
  options: readonly SegmentedChoiceOption[];
  selectedKey: string | null;
  onChange: (key: string) => void;
}

/**
 * A short single choice on one line ("Fewer chips" | "More chips"): a segmented control with radio
 * semantics. Each segment is a radio exposing its checked state; segments wrap under each other at
 * large text instead of clipping.
 */
export function SegmentedChoice({ label, options, selectedKey, onChange }: SegmentedChoiceProps) {
  const feedback = usePressFeedback();
  return (
    <View style={styles.group}>
      <Text variant="label">{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.track}>
        {options.map((option) => {
          const selected = option.key === selectedKey;
          return (
            <Pressable
              key={option.key}
              onPress={() => onChange(option.key)}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected, selected }}
              aria-checked={selected}
              style={({ pressed }) => [
                styles.segment,
                selected && styles.selected,
                !selected && feedback(pressed, colors.surfacePressed),
              ]}
            >
              <Text variant="bodyStrong" tone={selected ? 'onPrimary' : 'main'} align="center">
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  track: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    padding: space.xs,
    borderRadius: radii.control + space.xs,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surfaceSunken,
  },
  segment: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.control,
  },
  selected: { backgroundColor: colors.primary },
});
