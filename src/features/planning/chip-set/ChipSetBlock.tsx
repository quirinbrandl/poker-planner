import { type ReactNode } from 'react';

import type { ChipColor } from '@/domain/types';
import { Button, Card, ChipCase, InlineNotice, space, Stack, Text } from '@/ui';

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
  /** The paired denomination rows. */
  children?: ReactNode;
}

/**
 * The open chip case above the denomination rows, with the live summary and Add denomination.
 * Shared by a game's Chip set step and the template editor.
 */
export function ChipSetBlock({ rows, summary, top, setError, onAdd, children }: ChipSetBlockProps) {
  const drawsChips = rows.some((row) => (row.chipCount ?? 0) > 0);
  const unfinished = drawsChips && rows.some((row) => row.chipCount === null);
  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <ChipCase denominations={rows.map((row) => ({ key: row.id, color: row.color, quantity: row.chipCount }))} />
        {unfinished ? <Text variant="caption">Unfinished quantities aren’t shown.</Text> : null}
      </Stack>
      {top}
      {rows.length === 0 ? (
        <Card variant="inset" gap={space.xs}>
          <Text variant="bodyStrong">No denominations yet</Text>
          <Text variant="supporting">Enter the values and quantities in your physical chip set.</Text>
        </Card>
      ) : (
        <Text variant="supporting" tabular accessibilityLiveRegion="polite">
          {summary}
        </Text>
      )}
      {children}
      {setError ? <InlineNotice tone="error">{setError}</InlineNotice> : null}
      <Button label="Add denomination" icon="plus" fullWidth onPress={onAdd} />
    </Stack>
  );
}
