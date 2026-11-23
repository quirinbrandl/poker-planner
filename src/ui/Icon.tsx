import { View } from 'react-native';
import { Circle, Path, Rect, Svg } from 'react-native-svg';

import { colors } from './theme';

type Shape =
  | { kind: 'path'; d: string }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: boolean }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx?: number };

const p = (d: string): Shape => ({ kind: 'path', d });
const c = (cx: number, cy: number, r: number, fill = false): Shape => ({ kind: 'circle', cx, cy, r, fill });

/**
 * One consistent 24×24 stroke icon set (1.8 stroke, round caps), ported from the approved
 * prototypes' inline icons.
 */
const icons = {
  back: [p('M19 12H5'), p('m12 19-7-7 7-7')],
  forward: [p('M5 12h14'), p('m12 5 7 7-7 7')],
  chevronLeft: [p('m15 18-6-6 6-6')],
  chevronRight: [p('m9 18 6-6-6-6')],
  chevronUp: [p('m6 15 6-6 6 6')],
  chevronDown: [p('m6 9 6 6 6-6')],
  arrowUp: [p('M12 19V5'), p('m5 12 7-7 7 7')],
  arrowDown: [p('M12 5v14'), p('m19 12-7 7-7-7')],
  external: [p('M7 17 17 7'), p('M9 7h8v8')],
  more: [c(5, 12, 1.3, true), c(12, 12, 1.3, true), c(19, 12, 1.3, true)],
  plus: [p('M12 5v14M5 12h14')],
  minus: [p('M5 12h14')],
  removeCircle: [c(12, 12, 9), p('M8 12h8')],
  close: [p('M6 6l12 12M18 6 6 18')],
  check: [p('m5 12.5 4.5 4.5L19 7.5')],
  edit: [p('M4 20h4L19 9l-4-4L4 16v4Z'), p('m13.5 6.5 4 4')],
  trash: [p('M4 7h16'), p('M10 11v6M14 11v6'), p('M6 7l1 13h10l1-13'), p('M9 7V4h6v3')],
  warning: [p('M12 4 2.5 20h19L12 4Z'), p('M12 10v4M12 17.2v.1')],
  error: [c(12, 12, 9), p('M12 7.5v5.5M12 16.5v.1')],
  info: [c(12, 12, 9), p('M12 11v5.5M12 7.6v.1')],
  clock: [c(12, 12, 9), p('M12 7v5l3 2')],
  players: [
    c(9, 8, 3.2),
    p('M3 19c.6-3.4 3-5 6-5s5.4 1.6 6 5'),
    p('M16 5.2a3 3 0 0 1 0 5.6M18 14.3c1.6.7 2.6 2.2 3 4.7'),
  ],
  user: [c(12, 7, 4), p('M4 21v-2a8 8 0 0 1 16 0v2')],
  userPlus: [c(8, 7, 3), p('M2 21v-3a6 6 0 0 1 12 0v3M19 7v8M15 11h8')],
  templates: [p('M12 3 3 8l9 5 9-5-9-5Z'), p('m3 12.5 9 5 9-5'), p('m3 16.5 9 5 9-5')],
  chip: [c(12, 12, 9), c(12, 12, 4.5), p('M12 3v3M12 18v3M3 12h3M18 12h3')],
  play: [p('m8 5 11 7-11 7V5Z')],
  lock: [{ kind: 'rect', x: 5, y: 11, width: 14, height: 10, rx: 2 }, p('M8 11V7a4 4 0 0 1 8 0v4')],
  undo: [p('M9 14 4 9l5-5'), p('M4 9h10.5a5.5 5.5 0 0 1 0 11H11')],
  reopen: [p('M4 12a8 8 0 1 0 2.6-5.9'), p('M4 4v5h5')],
  wallet: [p('M20 8V5H4a2 2 0 0 0 0 4h17v11H4a2 2 0 0 1-2-2V7'), p('M21 12h-5v5h5')],
  shield: [p('m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z'), p('M8 12l3 3 5-6')],
  reserve: [p('M3 8h18v13H3zM2 3h20v5H2zM9 12h6')],
  list: [p('M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01')],
  calculator: [{ kind: 'rect', x: 5, y: 3, width: 14, height: 18, rx: 2 }, p('M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2')],
  exit: [p('M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4'), p('M9 8l-4 4 4 4'), p('M5 12h10')],
  home: [p('m3 11 9-8 9 8M6 9v12h12V9M10 21v-7h4v7')],
  count: [{ kind: 'rect', x: 4, y: 4, width: 16, height: 16, rx: 3 }, p('M8 9h8M8 13h8M8 17h4')],
  trophy: [p('M8 4h8v5a4 4 0 0 1-8 0V4Z'), p('M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4'), p('M12 13v4M8.5 20h7M9.5 17h5v3h-5z')],
  search: [c(11, 11, 6.5), p('m16 16 4.5 4.5')],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof icons;
export const iconNames = Object.keys(icons) as IconName[];

export interface IconProps {
  name: IconName;
  /** Edge length in logical units. Default 22. */
  size?: number;
  color?: string;
  /** Give a label only when the icon alone carries meaning; otherwise it is hidden from assistive tech. */
  accessibilityLabel?: string;
  strokeWidth?: number;
}

/** Stroke icon. Decorative (hidden from assistive tech) unless `accessibilityLabel` is set. */
export function Icon({ name, size = 22, color = colors.text, accessibilityLabel, strokeWidth = 1.8 }: IconProps) {
  const labelled = Boolean(accessibilityLabel);
  return (
    <View
      accessible={labelled}
      accessibilityRole={labelled ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!labelled}
      importantForAccessibility={labelled ? 'yes' : 'no-hide-descendants'}
      style={{ width: size, height: size }}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icons[name].map((shape, index) => {
          if (shape.kind === 'path') return <Path key={index} d={shape.d} />;
          if (shape.kind === 'rect')
            return <Rect key={index} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} />;
          return (
            <Circle
              key={index}
              cx={shape.cx}
              cy={shape.cy}
              r={shape.r}
              fill={shape.fill ? color : 'none'}
              stroke={shape.fill ? 'none' : color}
            />
          );
        })}
      </Svg>
    </View>
  );
}
