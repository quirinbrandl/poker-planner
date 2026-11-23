import { View } from 'react-native';
import { Circle, Svg, Text as SvgText } from 'react-native-svg';

import { type ChipColor } from '@/domain/types';
import { svgFontFamily } from '../theme';
import { paintFor } from './palette';

export interface ChipSymbolProps {
  color: ChipColor | null;
  /** Chip-unit value printed on the face. Omit for a blank face (e.g. a value not entered yet). */
  value?: number | string;
  /** Diameter in logical units: 20 list bullet, 28–32 pill, 48 tray, 60 editor row, 96 count editor. Default 48. */
  size?: number;
  /** Only when the chip stands alone; usually the value and colour name are shown as text beside it. */
  accessibilityLabel?: string;
}

/** Below this diameter the face is simplified so the value stays readable (pills, bullets). */
const SMALL_FACE = 40;

/**
 * Short form of a chip value for a small face: thousands become "K" and millions "M"
 * ("1000" → "1K", "2500" → "2.5K"). Anything that is not a whole number is returned unchanged.
 */
export function shortChipValue(value: number | string): string {
  const text = String(value);
  if (!/^\d+$/.test(text)) return text;
  const n = Number(text);
  const unit = n >= 1_000_000 ? { d: 1_000_000, s: 'M' } : n >= 1000 ? { d: 1000, s: 'K' } : null;
  if (!unit) return text;
  const scaled = n / unit.d;
  // One decimal at most; otherwise keep the full number rather than round it away.
  if (Number.isInteger(scaled)) return `${scaled}${unit.s}`;
  if (Number.isInteger(scaled * 10)) return `${scaled.toFixed(1)}${unit.s}`;
  return text;
}

/** Round chip in a denomination colour (or the neutral No color treatment), optionally with its value. */
export function ChipSymbol({ color, value, size = 48, accessibilityLabel }: ChipSymbolProps) {
  const paint = paintFor(color);
  const small = size < SMALL_FACE;
  const raw = value === undefined || value === '' ? '' : String(value);
  const text = small && raw ? shortChipValue(raw) : raw;
  const fontSize = small
    ? text.length > 4
      ? 19
      : text.length > 3
        ? 22
        : text.length > 2
          ? 26
          : 34
    : text.length > 4
      ? 10.5
      : text.length > 3
        ? 12.5
        : text.length > 2
          ? 15
          : 18;
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
      <Svg width={size} height={size} viewBox="0 0 72 72">
        <Circle cx={36} cy={36} r={34} fill={paint.fill} stroke="#AAB6C0" strokeWidth={small ? 2.5 : 1.5} />
        {small ? (
          // Simplified face: a thin edge pattern at the rim and the whole centre for the numeral.
          <Circle
            cx={36}
            cy={36}
            r={31}
            fill="none"
            stroke={paint.ink}
            strokeOpacity={0.8}
            strokeWidth={4}
            strokeDasharray={color ? '7 12.5' : '2 8'}
          />
        ) : (
          <>
            <Circle
              cx={36}
              cy={36}
              r={29}
              fill="none"
              stroke={paint.ink}
              strokeOpacity={0.85}
              strokeWidth={6}
              strokeDasharray={color ? '8 15' : '2 7'}
            />
            <Circle cx={36} cy={36} r={22} fill={paint.fill} stroke={paint.ink} strokeOpacity={0.65} strokeWidth={1} />
          </>
        )}
        {text && size >= 18 ? (
          <SvgText
            x={36}
            y={36 + fontSize * 0.36}
            textAnchor="middle"
            fill={paint.ink}
            fontSize={fontSize}
            fontWeight={small ? '800' : '700'}
            fontFamily={svgFontFamily}
            letterSpacing={small && text.length > 2 ? -1 : 0}
          >
            {text}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}
