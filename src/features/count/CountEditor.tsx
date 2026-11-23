import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Badge,
  BadgeRow,
  Button,
  Card,
  FactRow,
  FooterActions,
  InlineNotice,
  Screen,
  ScreenHeader,
  space,
  Text,
  type TextInputRef,
  TopBar,
} from '@/ui';

import { BlockedMixDialog } from './BlockedMixDialog';
import { ChipEntryPanel } from './ChipEntryPanel';
import { ResultConfirmationDialog } from './ResultConfirmationDialog';
import type {
  BlockedMixData,
  ConfirmOutcome,
  CountEditorData,
  CountReviewOutcome,
  CountTotals,
  ResultConfirmationData,
} from './types';

/** A popup of the editor, for development fixtures that open one on load. */
export type CountEditorDialog =
  | { kind: 'confirm'; confirmation: ResultConfirmationData }
  | { kind: 'blocked'; blocked: BlockedMixData };

export interface CountEditorProps {
  data: CountEditorData;
  /** Raw text of one denomination changed (typing, −1 / +1). Save it as the draft. */
  onChangeQuantity: (denominationValue: number, text: string) => void;
  /** "Rest is 0": fill blanks only, never change entered text. */
  onSetRemainingToZero: () => void;
  /** Back: keep the draft and leave. Nothing is returned. */
  onLeave: () => void;
  /** Game actions (⋯). */
  onMore?: () => void;
  /** "Review result →" / "Review correction →". Changes nothing. */
  onReview: () => Promise<CountReviewOutcome>;
  /** Confirm result / Replace result: records the return once. On `accepted` the caller navigates. */
  onConfirm: () => Promise<ConfirmOutcome>;
  /** Denomination shown first (default the first). */
  initialIndex?: number;
  /** Development fixtures: a popup open on load. */
  initialDialog?: CountEditorDialog;
}

/**
 * Final chip count editor, B · one denomination at a time. Presentational: quantities are the
 * parent's raw text, totals and validation come from `data`.
 */
export function CountEditor({
  data,
  onChangeQuantity,
  onSetRemainingToZero,
  onLeave,
  onMore,
  onReview,
  onConfirm,
  initialIndex = 0,
  initialDialog,
}: CountEditorProps) {
  const [index, setIndex] = useState(initialIndex);
  const [dialog, setDialog] = useState<CountEditorDialog | null>(initialDialog ?? null);
  const [reviewing, setReviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const busy = useRef(false);
  const quantityRef = useRef<TextInputRef>(null);
  const correction = data.kind === 'correction';
  const hasBlank = data.entries.some((entry) => entry.state === 'notEntered');

  const review = async () => {
    if (busy.current) return;
    busy.current = true;
    setReviewing(true);
    try {
      const outcome = await onReview();
      if (outcome.kind === 'confirm') setDialog({ kind: 'confirm', confirmation: outcome.confirmation });
      else if (outcome.kind === 'blocked') setDialog({ kind: 'blocked', blocked: outcome.blocked });
      else if (outcome.kind === 'needsCorrection') {
        const target = data.entries.findIndex((entry) => entry.value === outcome.firstDenominationValue);
        if (target >= 0) setIndex(target);
        setTimeout(() => quantityRef.current?.focus(), 50);
      }
    } finally {
      busy.current = false;
      setReviewing(false);
    }
  };

  const confirm = async () => {
    if (busy.current) return;
    busy.current = true;
    setConfirming(true);
    try {
      const outcome = await onConfirm();
      if (outcome.kind === 'blocked') setDialog({ kind: 'blocked', blocked: outcome.blocked });
      else if (outcome.kind === 'rejected') setDialog(null);
    } finally {
      busy.current = false;
      setConfirming(false);
    }
  };

  return (
    <>
      <Screen
        topBar={<TopBar backLabel="Back" onBack={onLeave} onMore={onMore} />}
        footer={
          <FooterActions>
            <Button
              label={correction ? 'Review correction' : 'Review result'}
              trailingIcon="forward"
              variant="primary"
              loading={reviewing}
              onPress={() => void review()}
            />
          </FooterActions>
        }
      >
        <ScreenHeader title={`${data.playerName} · Final chips`}>
          <BadgeRow>
            <Badge label={correction ? 'Correction draft' : 'Draft'} tone="warning" />
          </BadgeRow>
        </ScreenHeader>

        {data.problem ? <InlineNotice tone="error" title={data.problem.title}>{data.problem.message}</InlineNotice> : null}

        <ChipEntryPanel
          entries={data.entries}
          selectedIndex={index}
          onSelectIndex={setIndex}
          onChangeQuantity={onChangeQuantity}
          quantityRef={quantityRef}
        />

        <Button
          label="Rest is 0"
          variant="tertiary"
          fullWidth
          accessibilityLabel="Rest is 0: set remaining quantities to zero"
          unavailable={!hasBlank}
          onPress={onSetRemainingToZero}
        />

        <CountSummary totals={data.totals} />
      </Screen>

      <ResultConfirmationDialog
        visible={dialog?.kind === 'confirm'}
        confirmation={dialog?.kind === 'confirm' ? dialog.confirmation : null}
        busy={confirming}
        onConfirm={() => void confirm()}
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

/**
 * The live summary under the editor: chip units and their EUR value; once every quantity is
 * entered, the contributions and the win / loss. Announced politely as it changes.
 */
export function CountSummary({ totals }: { totals: CountTotals }) {
  return (
    <Card gap={space.xs} accessibilityRole="summary">
      <View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${totals.unitsText} chip units${totals.complete ? '' : ' so far'}, ${totals.chipValueText}`}
        style={styles.total}
      >
        <View style={styles.units}>
          <Text variant="amountLarge" tabular>
            {totals.unitsText}
          </Text>
          <Text variant="supporting" tone="supporting">{`chip units${totals.complete ? '' : ' so far'}`}</Text>
        </View>
        <Text variant="bodyStrong" tabular>
          {totals.chipValueText}
        </Text>
      </View>
      {totals.winLoss ? (
        <>
          <FactRow label="All contributions" value={totals.contributionsText} />
          <FactRow
            label="Win / loss"
            value={totals.winLoss.amountText}
            tone={totals.winLoss.direction === 'gain' ? 'confirmed' : totals.winLoss.direction === 'loss' ? 'error' : 'even'}
            divider={false}
          />
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  total: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: space.md,
  },
  units: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: space.sm },
});
