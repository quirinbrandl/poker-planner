import { memo, useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Svg,
  Text as SvgText,
} from 'react-native-svg';

import { type ChipColor } from '@/domain/types';
import { Text } from '../Text';
import { space, svgFontFamily } from '../theme';
import { paintFor } from './palette';

/** Chips per storage channel. A visual convention only, never a chip-set rule. */
export const CHIPS_PER_CHANNEL = 100;
/** Defensive drawing bound per denomination; more channels are indicated schematically. */
export const MAX_CHANNELS_PER_DENOMINATION = 32;
/** The case never has fewer storage channels than this: an empty or small set leaves channels empty. */
export const MIN_CASE_CHANNELS = 4;

export interface ChipCaseDenomination {
  /** Stable key (row id). */
  key: string;
  color: ChipColor | null;
  /** Whole quantity, or `null` while the field is blank or malformed (draws nothing). */
  quantity: number | null;
}

export interface CaseChannel {
  key: string;
  color: ChipColor | null;
  count: number;
  /** Last drawn channel of a denomination that needs more than the drawing bound. */
  more: boolean;
}

/** Pure layout of the case: one channel per started 100 chips per denomination, never shared. */
export function chipCaseLayout(denominations: readonly ChipCaseDenomination[]) {
  const channels: CaseChannel[] = [];
  let schematic = false;
  for (const d of denominations) {
    if (d.quantity === null || !Number.isFinite(d.quantity) || d.quantity <= 0) continue;
    const quantity = Math.floor(d.quantity);
    const needed = Math.ceil(quantity / CHIPS_PER_CHANNEL);
    const shown = Math.min(needed, MAX_CHANNELS_PER_DENOMINATION);
    if (needed > shown) schematic = true;
    for (let i = 0; i < shown; i += 1) {
      channels.push({
        key: `${d.key}-${i}`,
        color: d.color,
        count: Math.min(CHIPS_PER_CHANNEL, quantity - i * CHIPS_PER_CHANNEL),
        more: needed > shown && i === shown - 1,
      });
    }
  }
  const width = Math.max(MIN_CASE_CHANNELS, channels.length) * 42 + 46;
  return { channels, schematic, width };
}

const HEIGHT = 388;
const LID_Y = 10;
const BASE_Y = LID_Y + 78 + 8;
const BASE_H = 258;
const CHANNEL_W = 32;
const CHANNEL_H = 212;
const CHANNEL_GAP = 10;
const CHANNEL_Y = BASE_Y + 10 + 8;
const CHIP_H = 1.9;

function roundedPath(x: number, y: number, w: number, h: number, top: number, bottom: number) {
  return `M${x + top} ${y}H${x + w - top}Q${x + w} ${y} ${x + w} ${y + top}V${y + h - bottom}Q${x + w} ${y + h} ${x + w - bottom} ${y + h}H${x + bottom}Q${x} ${y + h} ${x} ${y + h - bottom}V${y + top}Q${x} ${y} ${x + top} ${y}Z`;
}

function Channel({ channel, x, gradientId }: { channel: CaseChannel; x: number; gradientId: string }) {
  const paint = paintFor(channel.color);
  const bottom = CHANNEL_Y + 204;
  const top = bottom - channel.count * CHIP_H;
  const chipX = x + 3.6;
  const chipW = 24.8;
  let lines = '';
  for (let i = 0; i < channel.count; i += 1) lines += `M${chipX} ${(top + i * CHIP_H + 0.5).toFixed(2)}h${chipW}`;
  return (
    <G>
      <Path d={roundedPath(x, CHANNEL_Y, CHANNEL_W, CHANNEL_H, 16, 13)} fill="#050D13" />
      <Path
        d={`M${x + CHANNEL_W - 1} ${CHANNEL_Y + 14}V${CHANNEL_Y + CHANNEL_H - 12}`}
        stroke="#33414B"
        strokeWidth={2}
      />
      {channel.count > 0 ? (
        <G>
          <Ellipse cx={x + 16} cy={bottom} rx={12.4} ry={3} fill={paint.fill} stroke={paint.ink} strokeOpacity={0.5} />
          <Rect x={chipX} y={top} width={chipW} height={bottom - top} rx={2} fill={paint.fill} />
          <Path d={lines} stroke={paint.ink} strokeOpacity={0.5} strokeWidth={0.55} />
          <Rect x={x + 5.8} y={top} width={1.45} height={bottom - top} fill={paint.ink} fillOpacity={0.6} />
          <Rect x={x + 24.7} y={top} width={1.45} height={bottom - top} fill={paint.ink} fillOpacity={0.6} />
          <Ellipse cx={x + 16} cy={top} rx={12.4} ry={3} fill={paint.fill} stroke={paint.ink} strokeOpacity={0.65} />
          <Ellipse cx={x + 16} cy={top} rx={8} ry={1.7} fill="none" stroke={paint.ink} strokeOpacity={0.4} />
        </G>
      ) : null}
      {channel.more ? (
        <G>
          <Rect x={x} y={CHANNEL_Y + CHANNEL_H - 30} width={CHANNEL_W} height={30} fill={`url(#${gradientId})`} />
          <SvgText
            x={x + 16}
            y={CHANNEL_Y + CHANNEL_H - 5}
            fill="#F1F4F5"
            fontSize={12}
            textAnchor="middle"
            letterSpacing={2}
            fontFamily={svgFontFamily}
          >
            •••
          </SvgText>
        </G>
      ) : null}
    </G>
  );
}

const CaseArt = memo(function CaseArt({
  channels,
  width,
  scale,
}: {
  channels: CaseChannel[];
  width: number;
  scale: number;
}) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ids = {
    lid: `lid${raw}`,
    base: `base${raw}`,
    well: `well${raw}`,
    clip: `clip${raw}`,
    more: `more${raw}`,
    metal: `metal${raw}`,
  };
  const baseX = 8;
  const baseW = width - 16;
  const lidX = 11;
  const lidW = width - 22;
  const rowW = channels.length * CHANNEL_W + Math.max(0, channels.length - 1) * CHANNEL_GAP;
  const startX = width / 2 - rowW / 2;
  const hingeW = Math.min(18, baseW * 0.16);
  const claspW = Math.min(22, baseW * 0.18);
  const handleW = Math.min(72, baseW * 0.46);
  const handleX = width / 2 - handleW / 2;
  const inner = { x: lidX + 14, y: LID_Y + 14, w: lidW - 28, h: 78 - 28 };
  let stripes = '';
  for (let s = inner.x - 60; s < inner.x + inner.w + 10; s += 7)
    stripes += `M${s} ${inner.y + inner.h}l${inner.h * 0.7} ${-inner.h}`;

  return (
    <Svg width={width * scale} height={HEIGHT * scale} viewBox={`0 0 ${width} ${HEIGHT}`}>
      <Defs>
        <LinearGradient id={ids.lid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ACB8C0" />
          <Stop offset="0.25" stopColor="#8C9CA7" />
          <Stop offset="1" stopColor="#3B4D5A" />
        </LinearGradient>
        <LinearGradient id={ids.base} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#A3AFB8" />
          <Stop offset="0.5" stopColor="#7D8D99" />
          <Stop offset="1" stopColor="#4B5E6C" />
        </LinearGradient>
        <RadialGradient id={ids.well} cx="50%" cy="0%" rx="75%" ry="100%" fx="50%" fy="0%">
          <Stop offset="0" stopColor="#1B252D" />
          <Stop offset="1" stopColor="#0C151C" />
        </RadialGradient>
        <LinearGradient id={ids.metal} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#556773" />
          <Stop offset="0.5" stopColor="#B6C2CA" />
          <Stop offset="1" stopColor="#617583" />
        </LinearGradient>
        <LinearGradient id={ids.more} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#081118" stopOpacity={0} />
          <Stop offset="1" stopColor="#081118" stopOpacity={1} />
        </LinearGradient>
        <ClipPath id={ids.clip}>
          <Rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} rx={7} />
        </ClipPath>
      </Defs>
      {/* Handle, behind the base */}
      <Path
        d={`M${handleX} ${BASE_Y + BASE_H}V${BASE_Y + BASE_H + 14}Q${handleX} ${BASE_Y + BASE_H + 23} ${handleX + 9} ${BASE_Y + BASE_H + 23}H${handleX + handleW - 9}Q${handleX + handleW} ${BASE_Y + BASE_H + 23} ${handleX + handleW} ${BASE_Y + BASE_H + 14}V${BASE_Y + BASE_H}`}
        stroke="#516979"
        strokeWidth={6}
        fill="none"
      />
      {/* Lid */}
      <Rect x={width * 0.26} y={LID_Y - 9} width={width * 0.48} height={3} rx={1.5} fill="#D2D9DE" fillOpacity={0.6} />
      <Path d={roundedPath(lidX, LID_Y, lidW, 78, 18, 7)} fill={`url(#${ids.lid})`} />
      <Path d={roundedPath(lidX + 8, LID_Y + 8, lidW - 16, 62, 11, 3)} fill="#0A1117" />
      <Rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} rx={7} fill="#121B22" stroke="#29343B" />
      <Path d={stripes} stroke="#0D151B" strokeWidth={4} clipPath={`url(#${ids.clip})`} />
      {/* Hinges */}
      <Rect
        x={baseX + baseW * 0.19}
        y={BASE_Y - 17}
        width={hingeW}
        height={15}
        rx={3}
        fill={`url(#${ids.metal})`}
        stroke="#344650"
      />
      <Rect
        x={baseX + baseW * 0.81 - hingeW}
        y={BASE_Y - 17}
        width={hingeW}
        height={15}
        rx={3}
        fill={`url(#${ids.metal})`}
        stroke="#344650"
      />
      {/* Base */}
      <Path d={roundedPath(baseX, BASE_Y, baseW, BASE_H, 10, 17)} fill={`url(#${ids.base})`} />
      <Path
        d={roundedPath(baseX + 10, BASE_Y + 10, baseW - 20, BASE_H - 20, 4, 9)}
        fill={`url(#${ids.well})`}
        stroke="#040B10"
        strokeWidth={2}
      />
      {channels.map((channel, index) => (
        <Channel
          key={channel.key}
          channel={channel}
          x={startX + index * (CHANNEL_W + CHANNEL_GAP)}
          gradientId={ids.more}
        />
      ))}
      {/* Clasps */}
      <Rect
        x={baseX + baseW * 0.17}
        y={BASE_Y + BASE_H - 1}
        width={claspW}
        height={17}
        rx={3}
        fill={`url(#${ids.metal})`}
        stroke="#30414B"
      />
      <Rect
        x={baseX + baseW * 0.83 - claspW}
        y={BASE_Y + BASE_H - 1}
        width={claspW}
        height={17}
        rx={3}
        fill={`url(#${ids.metal})`}
        stroke="#30414B"
      />
    </Svg>
  );
});

export interface ChipCaseProps {
  denominations: readonly ChipCaseDenomination[];
  /** Spoken description. Default points to the exact fields below. */
  accessibilityLabel?: string;
}

/**
 * The open chip case: one storage channel per started 100 chips of a denomination, no numbers.
 * Drawn at natural size while it fits and scaled down proportionally when it does not.
 */
export function ChipCase({
  denominations,
  accessibilityLabel = 'Chip case illustration, scaled to fit the screen. Exact chip values and quantities are in the fields below.',
}: ChipCaseProps) {
  const [available, setAvailable] = useState(0);
  const { channels: filled, schematic, width } = chipCaseLayout(denominations);
  // Empty channels fill a small or empty set up to the smallest case, so it reads as a case.
  const channels = [...filled];
  for (let i = filled.length; i < MIN_CASE_CHANNELS; i += 1) {
    channels.push({ key: `empty-${i}`, color: null, count: 0, more: false });
  }
  const scale = available > 0 ? Math.min(1, available / width) : 0;
  const onLayout = (event: LayoutChangeEvent) => setAvailable(event.nativeEvent.layout.width);
  return (
    <View style={styles.wrap}>
      <View
        onLayout={onLayout}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.stage,
          { height: scale > 0 ? HEIGHT * scale : undefined, minHeight: scale > 0 ? undefined : 120 },
        ]}
      >
        {scale > 0 ? <CaseArt channels={channels} width={width} scale={scale} /> : null}
      </View>
      {schematic ? <Text variant="caption">Very large quantities are shown schematically.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, alignSelf: 'stretch' },
  stage: { alignSelf: 'stretch', alignItems: 'center', overflow: 'hidden' },
});
