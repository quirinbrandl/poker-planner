import { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import type { ChipColor } from '@/domain/types';
import { Button, ChipCase, InlineNotice, space, Stack, Text } from '@/ui';

import { DenominationHeadings } from './DenominationRow';

export interface ChipSetBlockRow {
  id: string;
  color: ChipColor | null;
  /** The valid quantity from game management, or `null` (draws nothing). */
  chipCount: number | null;
}

export interface ChipSetBlockProps {
  rows: readonly ChipSetBlockRow[];
  /** "4 denominations · 500 chips · 8,450 chip units", "Incomplete chip set" … */
  summary: string;
  /** Between the case and the summary: Choose template and the origin note on the game step. */
  top?: ReactNode;
  /** Set-level problem to show now ("Add at least one denomination."). */
  setError?: string;
  onAdd: () => void;
  /** The denomination rows (`DenominationRow`); the column headings are added above them. */
  children?: ReactNode;
}

/**
 * The open chip case above the denomination rows, with the live summary and Add denomination.
 * An empty set shows only the case and the actions. Shared by a game's Chip set step and the
 * template editor.
 */
export function ChipSetBlock({ rows, summary, top, setError, onAdd, children }: ChipSetBlockProps) {
  const drawsChips = rows.some((row) => (row.chipCount ?? 0) > 0);
  const unfinished = drawsChips && rows.some((row) => row.chipCount === null);
  return (
    <Stack gap="lg">
      <Stack gap="xs" style={styles.stage}>
        <ChipCase denominations={rows.map((row) => ({ key: row.id, color: row.color, quantity: row.chipCount }))} />
        {unfinished ? <Text variant="caption">Unfinished quantities aren’t shown.</Text> : null}
      </Stack>
      {top}
      {rows.length > 0 ? (
        <Text variant="supporting" tabular accessibilityLiveRegion="polite">
          {summary}
        </Text>
      ) : null}
      {rows.length > 0 ? (
        <Stack gap="md">
          <DenominationHeadings />
          {children}
        </Stack>
      ) : null}
      {setError ? <InlineNotice tone="error">{setError}</InlineNotice> : null}
      <Button label="Add denomination" icon="plus" fullWidth onPress={onAdd} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  // The chip case is the picture of this screen: give it air above and below.
  stage: { paddingTop: space.sm, paddingBottom: space.md },
});
