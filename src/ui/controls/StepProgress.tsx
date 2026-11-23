import { Pressable, StyleSheet, View } from 'react-native';

import { usePressFeedback } from '../motion';
import { colors, radii, space, touchTarget } from '../theme';

export interface StepProgressProps {
  /** Number of steps. */
  count: number;
  /** 1-based position of the current step. Steps before it show as done, after it as ahead. */
  current: number;
  /** Spoken name, e.g. "Step 3 of 5, Chip set. Setup steps". */
  accessibilityLabel: string;
  /** Makes the bar a button (opens the step list). Omit for a read-only bar (a Games card). */
  onPress?: () => void;
  accessibilityHint?: string;
  /** `small` for a card; default for a step header. */
  size?: 'regular' | 'small';
}

/** Segmented wizard progress: one segment per step, done / current / ahead. Never animates. */
export function StepProgress({
  count,
  current,
  accessibilityLabel,
  onPress,
  accessibilityHint = 'Shows all setup steps',
  size = 'regular',
}: StepProgressProps) {
  const feedback = usePressFeedback();
  const small = size === 'small';
  const segments = (
    <View style={[styles.segments, small && styles.segmentsSmall]}>
      {Array.from({ length: count }, (_, index) => {
        const position = index + 1;
        const state = position < current ? 'done' : position === current ? 'current' : 'ahead';
        return (
          <View
            key={index}
            style={[styles.segment, small && styles.segmentSmall, styles[state], state === 'current' && !small && styles.currentWide]}
          />
        );
      })}
    </View>
  );
  if (!onPress) {
    return (
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 1, max: count, now: current }}
        style={small ? styles.staticSmall : styles.static}
      >
        {segments}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={4}
      style={({ pressed }) => [styles.button, feedback(pressed, colors.surface)]}
    >
      {segments}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: 260,
    minWidth: 120,
    minHeight: touchTarget,
    justifyContent: 'center',
    paddingHorizontal: space.xs,
    marginHorizontal: -space.xs,
    borderRadius: radii.sm,
  },
  static: { alignSelf: 'stretch' },
  staticSmall: { width: 120 },
  segments: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  segmentsSmall: { gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: radii.pill },
  segmentSmall: { height: 4 },
  currentWide: { flex: 1.8 },
  done: { backgroundColor: colors.highlightBorder },
  current: { backgroundColor: colors.primary },
  ahead: { backgroundColor: colors.divider },
});
