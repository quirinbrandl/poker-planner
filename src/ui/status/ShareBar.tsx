import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';

import { colors, palette, radii } from '../theme';

export interface ShareBarProps {
  /** Fill, 0–100. Values outside are clamped. */
  percent: number;
}

/**
 * Proportional bar for one share of a whole (a payout place's percentage). Decorative: the number it
 * shows is always next to it in words, so it is hidden from assistive tech. Never animates.
 */
export function ShareBar({ percent }: ShareBarProps) {
  const id = `sb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const width = Math.min(100, Math.max(0, percent));
  return (
    <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {width > 0 ? (
        <View style={[styles.fill, { width: `${width}%` }]}>
          <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 10">
            <Defs>
              <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
                <Stop offset={0} stopColor={palette.lavenderDeep} stopOpacity={1} />
                <Stop offset={1} stopColor={colors.primary} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={100} height={10} fill={`url(#${id})`} />
          </Svg>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    minWidth: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  // A sliver still shows for tiny shares.
  fill: { height: 10, minWidth: 10, borderRadius: radii.pill, overflow: 'hidden' },
});
