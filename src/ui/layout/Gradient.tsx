import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { Defs, RadialGradient, Rect, Stop, Svg } from 'react-native-svg';

export interface GradientStop {
  offset: number;
  color: string;
}

/**
 * Absolute-fill radial light behind a surface (hero/showcase/active cards). Purely decorative.
 * Centre and radii are fractions of the box.
 */
export function RadialBackdrop({
  stops,
  cx = 0.5,
  cy = 0,
  rx = 1.2,
  ry = 0.9,
}: {
  stops: GradientStop[];
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
}) {
  const id = `rg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient
            id={id}
            cx={cx * 100}
            cy={cy * 100}
            rx={rx * 100}
            ry={ry * 100}
            fx={cx * 100}
            fy={cy * 100}
            gradientUnits="userSpaceOnUse"
          >
            {stops.map((stop) => (
              <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={1} />
            ))}
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
