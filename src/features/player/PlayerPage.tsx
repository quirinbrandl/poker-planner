import { type ReactNode, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MixPills } from '@/features/count/MixPills';
import { BlockedMixDialog } from '@/features/count/BlockedMixDialog';
import type { BlockedMixData, ConfirmOutcome } from '@/features/count/types';
import {
  Badge,
  BadgeRow,
  Button,
  Card,
  colors,
  FactRow,
  Screen,
  ScreenHeader,
  SectionHeading,
  space,
  Text,
  TopBar,
} from '@/ui';

import { ReturnToPlayDialog, UndoRebuyDialog } from './PlayerDialogs';
import type { BuyInRecord, PlayerPageData, PlayerResult, UndoRebuyData } from './types';

/** A popup of the page, for development fixtures that open one on load. */
export type PlayerPageDialog =
  | { kind: 'undo'; rebuyId: string }
  | { kind: 'return' }
  | { kind: 'blocked'; blocked: BlockedMixData };

export interface PlayerPageProps {
  data: PlayerPageData;
  onBack: () => void;
  onMore?: () => void;
  /** Count final chips / Resume count (still playing). */
  onCountFinalChips: () => void;
  /** + Rebuy (still playing): the ordinary rebuy popup. */
  onRebuy: () => void;
  /** Correct (final chips): opens the count editor as a correction draft. */
  onCorrectResult: () => void;
  /** Correct mix on one rebuy: opens the rebuy-mix editor. */
  onCorrectMix: (rebuyId: string) => void;
  /** + Add forgotten rebuy: opens the rebuy-mix editor for a new historical rebuy. */
  onAddForgottenRebuy: () => void;
  /** Undo rebuy (after its popup). Removes only that rebuy's record. On `accepted` show "✓ Rebuy undone". */
  onUndoRebuy: (rebuyId: string) => Promise<ConfirmOutcome>;
  /** Back in the game (after its popup): removes the result and its return; issues nothing. */
  onReturnToPlay: () => Promise<ConfirmOutcome>;
  /**
   * Slot for extra rows in the summary card (tournament: place, payout). Rendered after the
   * chip value / contributions rows, or under the "Still playing." line.
   */
  summaryExtra?: ReactNode;
  /** Slot for extra sections after Buy-ins (tournament: "Back in the game…"). */
  sectionsExtra?: ReactNode;
  /**
   * What the page offers a player without a result. Default: the cash-game status line with Count
   * final chips and + Rebuy. Tournaments have no chip counts: they pass their own status line (or
   * none) and whether a rebuy is on offer.
   */
  playing?: PlayingOptions;
  /** Development fixtures: a popup open on load. */
  initialDialog?: PlayerPageDialog;
}

export interface PlayingOptions {
  /** Line under the name; `null` shows none. */
  statusText: string | null;
  /** Count final chips / Resume count. */
  count: boolean;
  /** + Rebuy. */
  rebuy: boolean;
}

const OUTCOME = { gain: 'Won', loss: 'Lost', even: 'Break-even' } as const;
const AMOUNT_TONE = { gain: 'confirmed', loss: 'error', even: 'even' } as const;

/**
 * Player page: the win / loss summary, Final chips with Correct, Buy-ins with each actual mix
 * (Correct mix / Undo per rebuy), + Add forgotten rebuy and Return to play…; or Count final
 * chips / + Rebuy while still playing. Completed is read-only.
 */
export function PlayerPage({
  data,
  onBack,
  onMore,
  onCountFinalChips,
  onRebuy,
  onCorrectResult,
  onCorrectMix,
  onAddForgottenRebuy,
  onUndoRebuy,
  onReturnToPlay,
  summaryExtra,
  sectionsExtra,
  playing,
  initialDialog,
}: PlayerPageProps) {
  const [dialog, setDialog] = useState<PlayerPageDialog | null>(initialDialog ?? null);
  const [running, setRunning] = useState(false);
  const busy = useRef(false);
  const editable = data.phase === 'inProgress';
  const { result } = data;
  const statusText = playing
    ? playing.statusText
    : data.countDraft
      ? 'Count started, not confirmed yet.'
      : 'Still playing.';
  const showCount = playing?.count ?? true;
  const showRebuy = playing?.rebuy ?? true;

  const run = async (operation: () => Promise<ConfirmOutcome>) => {
    if (busy.current) return;
    busy.current = true;
    setRunning(true);
    try {
      const outcome = await operation();
      setDialog(outcome.kind === 'blocked' ? { kind: 'blocked', blocked: outcome.blocked } : null);
    } finally {
      busy.current = false;
      setRunning(false);
    }
  };

  const undo: UndoRebuyData | null =
    dialog?.kind === 'undo' ? (data.buyIns.find((record) => record.id === dialog.rebuyId)?.undo ?? null) : null;

  return (
    <>
      <Screen topBar={<TopBar backLabel={data.backLabel} onBack={onBack} onMore={onMore} />}>
        <ScreenHeader
          context={data.context}
          badges={
            <BadgeRow>
              {editable ? <Badge label="In progress" tone="primary" /> : <Badge label="Completed" tone="confirmed" />}
            </BadgeRow>
          }
          title={data.name}
        >
          {result || !statusText ? null : (
            <Text variant="supporting" tone="supporting">
              {statusText}
            </Text>
          )}
        </ScreenHeader>

        {result ? (
          <ResultSections
            result={result}
            name={data.name}
            editable={editable}
            onCorrect={onCorrectResult}
            summaryExtra={summaryExtra}
          />
        ) : (
          <>
            {summaryExtra}
            {editable && (showCount || showRebuy) ? (
              <View style={styles.actions}>
                {showCount ? (
                  <View style={styles.action}>
                    <Button
                      label={data.countDraft ? 'Resume count' : 'Count final chips'}
                      variant="primary"
                      fullWidth
                      onPress={onCountFinalChips}
                    />
                  </View>
                ) : null}
                {showRebuy ? (
                  <View style={styles.action}>
                    <Button label="Rebuy" icon="plus" fullWidth accessibilityLabel={`Rebuy for ${data.name}`} onPress={onRebuy} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        )}

        <View>
          <SectionHeading title={`Buy-ins · ${data.buyInsTotalText}`} />
          {data.buyIns.map((record, index) => (
            <BuyInRow
              key={record.id}
              record={record}
              editable={editable}
              divider={index < data.buyIns.length - 1 || editable}
              onCorrectMix={() => onCorrectMix(record.id)}
              onUndo={() => setDialog({ kind: 'undo', rebuyId: record.id })}
            />
          ))}
          {editable ? (
            <Button
              label="Add forgotten rebuy"
              icon="plus"
              variant="tertiary"
              fullWidth
              accessibilityLabel={`Add forgotten rebuy for ${data.name}`}
              onPress={onAddForgottenRebuy}
            />
          ) : null}
        </View>

        {sectionsExtra}

        {editable && result && data.returnToPlay ? (
          <Button label="Return to play…" fullWidth onPress={() => setDialog({ kind: 'return' })} />
        ) : null}

        {editable ? null : (
          <Text variant="supporting" tone="supporting">
            Read-only. To change something, reopen the game from ⋯.
          </Text>
        )}
      </Screen>

      <UndoRebuyDialog
        visible={dialog?.kind === 'undo'}
        undo={undo}
        busy={running}
        onConfirm={() => {
          if (undo) void run(() => onUndoRebuy(undo.rebuyId));
        }}
        onCancel={() => setDialog(null)}
      />
      <ReturnToPlayDialog
        visible={dialog?.kind === 'return'}
        data={data.returnToPlay}
        busy={running}
        onConfirm={() => void run(onReturnToPlay)}
        onCancel={() => setDialog(null)}
      />
      <BlockedMixDialog
        visible={dialog?.kind === 'blocked'}
        blocked={dialog?.kind === 'blocked' ? dialog.blocked : null}
        onBack={() => setDialog(null)}
      />
    </>
  );
}

function ResultSections({
  result,
  name,
  editable,
  onCorrect,
  summaryExtra,
}: {
  result: PlayerResult;
  name: string;
  editable: boolean;
  onCorrect: () => void;
  summaryExtra?: ReactNode;
}) {
  const direction = result.winLoss.direction;
  return (
    <>
      <Card variant="highlight" gap={space.xs}>
        <View accessible accessibilityLabel={`${OUTCOME[direction]} ${result.winLoss.amountText.replace('−', 'minus ')}`}>
          <Text tone="supporting">{OUTCOME[direction]}</Text>
          <Text variant="amountHero" tone={AMOUNT_TONE[direction]} tabular>
            {result.winLoss.amountText}
          </Text>
        </View>
        <FactRow label="Confirmed chip value" value={result.chipValueText} />
        <FactRow label="All contributions" value={result.contributionsText} divider={Boolean(summaryExtra)} />
        {summaryExtra}
      </Card>

      <View style={styles.section}>
        <SectionHeading
          title={`Final chips · ${result.unitsText}`}
          meta={result.correctionDraft && editable ? 'Correction draft' : undefined}
          action={
            editable
              ? {
                  label: result.correctionDraft ? 'Resume correction' : 'Correct',
                  accessibilityLabel: `${result.correctionDraft ? 'Resume correction of' : 'Correct'} ${name}’s final chips`,
                  onPress: onCorrect,
                }
              : undefined
          }
        />
        <MixPills mix={result.finalChips} accessibilityLabel={`${name}’s final chips`} />
      </View>
    </>
  );
}

function BuyInRow({
  record,
  editable,
  divider,
  onCorrectMix,
  onUndo,
}: {
  record: BuyInRecord;
  editable: boolean;
  divider: boolean;
  onCorrectMix: () => void;
  onUndo: () => void;
}) {
  const rebuy = record.kind === 'rebuy';
  return (
    <View style={[styles.record, divider && styles.divider]}>
      <View style={styles.recordHead}>
        <View style={styles.recordTitle}>
          <Text variant="title">{record.label}</Text>
          {record.addedLater ? <Badge label="added later" size="small" /> : null}
          {record.corrected ? <Badge label="corrected" size="small" /> : null}
          {record.coverageText ? <Badge label={record.coverageText} tone="warning" size="small" /> : null}
        </View>
        <Text variant="supporting" tone="supporting" tabular>
          {record.amountText}
        </Text>
      </View>
      <MixPills mix={record.mix} hideZero size="compact" accessibilityLabel={`${record.label} chips`} />
      {rebuy && editable ? (
        <View style={styles.recordActions}>
          <Button label="Correct mix" size="compact" accessibilityLabel={`Correct the mix of ${record.label.toLowerCase()}`} onPress={onCorrectMix} />
          <Button label="Undo" size="compact" accessibilityLabel={`Undo ${record.label.toLowerCase()}`} onPress={onUndo} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  action: { flexGrow: 1, flexBasis: 140 },
  section: { gap: space.sm },
  record: { gap: space.sm, paddingVertical: space.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  recordHead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  recordTitle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  recordActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
