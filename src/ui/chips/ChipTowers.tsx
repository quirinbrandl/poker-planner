import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ellipse, G, Path, Svg, Text as SvgText } from 'react-native-svg';

import { type ChipColor } from '@/domain/types';
import { Text } from '../Text';
import { colors, space, svgFontFamily } from '../theme';
import { chipColorName, paintFor } from './palette';

/** Most discs drawn per tower; the ×N label always states the exact count. */
export const MAX_TOWER_DISCS = 20;

export interface TowerColumn {
  value: number;
  color: ChipColor | null;
  count: number;
}

const RX = 33;
const RY = 11.5;
const DISC_H = 5.6;
const STEP = 5.4;
const BASE_CY = 166;

/** The part of the drawing a tower of `count` chips needs: the empty sky above the top disc is cropped. */
function towerView(count: number): { viewTop: number; viewHeight: number } {
  const drawn = Math.max(1, Math.min(MAX_TOWER_DISCS, count));
  const topY = BASE_CY - (drawn - 1) * STEP;
  const viewTop = Math.max(0, Math.floor(topY - RY - 3));
  return { viewTop, viewHeight: 186 - viewTop };
}

const Tower = memo(function Tower({ value, color, count, width }: TowerColumn & { width: number }) {
  const paint = paintFor(color);
  const drawn = Math.max(1, Math.min(MAX_TOWER_DISCS, count));
  const label = String(value);
  const discs = [];
  for (let i = 0; i < drawn; i += 1) {
    const cy = BASE_CY - i * STEP;
    const fifth = (i + 1) % 5 === 0 && i < drawn - 1;
    discs.push(
      <G key={i}>
        <Path
          d={`M${50 - RX} ${cy}A${RX} ${RY} 0 0 0 ${50 + RX} ${cy}L${50 + RX} ${cy + DISC_H}A${RX} ${RY} 0 0 1 ${50 - RX} ${cy + DISC_H}Z`}
          fill={paint.edge}
          stroke="#080D12"
          strokeWidth={0.7}
        />
        <Path
          d={`M28 ${cy + 2.2}v${DISC_H - 0.8}M50 ${cy + RY - 0.3}v${DISC_H - 0.8}M72 ${cy + 2.2}v${DISC_H - 0.8}`}
          stroke={paint.ink}
          strokeOpacity={0.72}
          strokeWidth={3.6}
        />
        <Ellipse
          cx={50}
          cy={cy}
          rx={RX}
          ry={RY}
          fill={paint.fill}
          stroke={fifth ? colors.primary : '#FFFFFF'}
          strokeOpacity={fifth ? 1 : 0.27}
          strokeWidth={fifth ? 1.4 : 0.7}
        />
      </G>,
    );
  }
  const topY = BASE_CY - (drawn - 1) * STEP;
  const fontSize = label.length > 3 ? 9.5 : 12;
  const { viewTop, viewHeight } = towerView(count);
  return (
    <Svg width={width} height={(width * viewHeight) / 100} viewBox={`0 ${viewTop} 100 ${viewHeight}`}>
      <Ellipse cx={50} cy={174} rx={38} ry={12} fill="#04080C" opacity={0.75} />
      {discs}
      <Ellipse
        cx={50}
        cy={topY}
        rx={27}
        ry={9.2}
        fill="none"
        stroke={paint.ink}
        strokeOpacity={0.82}
        strokeWidth={3.2}
        strokeDasharray="6 9"
      />
      <Ellipse
        cx={50}
        cy={topY}
        rx={20}
        ry={6.8}
        fill={paint.fill}
        stroke={paint.ink}
        strokeOpacity={0.55}
        strokeWidth={0.9}
      />
      <SvgText
        x={50}
        y={topY + fontSize * 0.36}
        textAnchor="middle"
        fill={paint.ink}
        fontSize={fontSize}
        fontWeight="800"
        fontFamily={svgFontFamily}
      >
        {label}
      </SvgText>
    </Svg>
  );
});

export interface ChipTowersProps {
  /** One entry per denomination; zero counts are skipped and columns are shown in ascending value order. */
  columns: readonly TowerColumn[];
  /** `showcase` for Distribution preview, `compact` for popups (rebuy, late entry). */
  size?: 'showcase' | 'compact';
  /** Spoken name of the list. Default "One starting stack". */
  accessibilityLabel?: string;
}

/**
 * 3D isometric chip towers for one stack: tower, ×N, then "1 · White" (only the value for a chip
 * without a colour). Each column is a labelled list item.
 */
export function ChipTowers({ columns, size = 'showcase', accessibilityLabel = 'One starting stack' }: ChipTowersProps) {
  const used = columns.filter((c) => c.count > 0).sort((a, b) => a.value - b.value);
  const compact = size === 'compact';
  const towerWidth = compact ? 58 : 76;
  // Up to three towers share the row in thirds, so a label like "100 · Black" stays on one line.
  const basis = used.length <= 3 ? '33.33%' : '25%';
  // Every tower stands in a box as tall as the tallest one, so the towers share a ground line even
  // when one caption needs two lines.
  const tallest = Math.max(0, ...used.map((c) => (towerWidth * towerView(c.count).viewHeight) / 100));
  return (
    <View role="list" accessibilityLabel={accessibilityLabel} style={[styles.stage, compact && styles.stageCompact]}>
      {used.map((column) => {
        const name = chipColorName(column.color);
        return (
          <View
            key={column.value}
            role="listitem"
            accessible
            accessibilityLabel={`${column.count} ${column.count === 1 ? 'chip' : 'chips'} of value ${column.value} (${name})`}
            style={[styles.column, { flexBasis: basis }, compact ? styles.columnCompact : null]}
          >
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.ground, { height: tallest }]}
            >
              <Tower {...column} width={towerWidth} />
            </View>
            <Text variant={compact ? 'sectionTitle' : 'amount'} tabular align="center" style={styles.count}>
              {`×${column.count}`}
            </Text>
            <Text variant="caption" tabular align="center">
              {column.color ? `${column.value} · ${name}` : String(column.value)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'center',
    rowGap: space.lg,
    paddingTop: space.sm,
  },
  stageCompact: { rowGap: space.md, paddingTop: 0 },
  column: { flexGrow: 0, minWidth: 78, alignItems: 'center', gap: 2, paddingHorizontal: space.xs },
  columnCompact: { minWidth: 64 },
  ground: { justifyContent: 'flex-end' },
  count: { fontWeight: '800', marginTop: -space.xs },
});
