import { View } from 'react-native';
import { Circle, Svg, Text as SvgText } from 'react-native-svg';

import { type ChipColor } from '@/domain/types';
import { svgFontFamily } from '../theme';
import { paintFor } from './palette';

export interface ChipSymbolProps {
  color: ChipColor | null;
  /** Chip-unit value printed on the face. Omit for a blank face (e.g. a value not entered yet). */
  value?: number | string;
  /** Diameter in logical units: 20 list bullet, 28 pill, 48 tray, 60 editor row, 96 count editor. Default 48. */
  size?: number;
  /** Only when the chip stands alone; usually the value and colour name are shown as text beside it. */
  accessibilityLabel?: string;
}

/** Round chip in a denomination colour (or the neutral No color treatment), optionally with its value. */
export function ChipSymbol({ color, value, size = 48, accessibilityLabel }: ChipSymbolProps) {
  const paint = paintFor(color);
  const text = value === undefined || value === '' ? '' : String(value);
  const fontSize = text.length > 4 ? 10.5 : text.length > 3 ? 12.5 : text.length > 2 ? 15 : 18;
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
        <Circle cx={36} cy={36} r={34} fill={paint.fill} stroke="#AAB6C0" strokeWidth={1.5} />
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
        {text && size >= 18 ? (
          <SvgText
            x={36}
            y={36 + fontSize * 0.36}
            textAnchor="middle"
            fill={paint.ink}
            fontSize={fontSize}
            fontWeight="700"
            fontFamily={svgFontFamily}
          >
            {text}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}
