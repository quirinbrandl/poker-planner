import { StyleSheet, View } from 'react-native';

import { colors, radii, toneColors, type Tone } from '../theme';

export interface ProgressBarProps {
  /** Completed amount (e.g. players counted). */
  value: number;
  max: number;
  /** Spoken description, e.g. "4 of 6 players counted". */
  accessibilityLabel: string;
  tone?: Tone;
  /** Number of equal segments (e.g. the 3-step fix flow). Omit for a continuous bar. */
  segments?: number;
}

/** Thin progress bar exposing its value to assistive tech. Never animates. */
export function ProgressBar({ value, max, accessibilityLabel, tone = 'primary', segments }: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const fill = tone === 'neutral' ? colors.text : toneColors[tone].text;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max, now: value }}
      style={segments ? styles.segments : styles.track}
    >
      {segments ? (
        Array.from({ length: segments }, (_, index) => (
          <View
            key={index}
            style={[styles.segment, { backgroundColor: index < Math.round(ratio * segments) ? fill : colors.divider }]}
          />
        ))
      ) : (
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: fill }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.divider,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  fill: { height: 8, borderRadius: radii.pill },
  segments: { flexDirection: 'row', gap: 6, alignSelf: 'stretch' },
  segment: { flex: 1, height: 6, borderRadius: radii.pill },
});
