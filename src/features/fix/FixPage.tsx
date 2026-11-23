import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BlockedMixDialog, ChipWithDelta } from '@/features/count/BlockedMixDialog';
import { MixPills } from '@/features/count/MixPills';
import { ResultConfirmationDialog } from '@/features/count/ResultConfirmationDialog';
import type { BlockedMixData, ConfirmOutcome } from '@/features/count/types';
import { ReturnToPlayDialog, UndoRebuyDialog } from '@/features/player/PlayerDialogs';
import {
  Badge,
  BadgeRow,
  Button,
  Card,
  colors,
  Icon,
  ProgressBar,
  Screen,
  ScreenHeader,
  space,
  Text,
  toneColors,
  TopBar,
} from '@/ui';

import type { FixData } from './types';

/** A popup of the page, for development fixtures that open one on load. */
export type FixDialog = { kind: 'undo' } | { kind: 'save' } | { kind: 'blocked'; blocked: BlockedMixData };

export interface FixPageProps {
  data: FixData;
  /** Top-left Back to Play: leave mid-fix; accepted steps and the retained correction stay. */
  onBack: () => void;
  onMore?: () => void;
  /** Step 1, after its popup: undo the dependent rebuy. */
  onUndo: () => Promise<ConfirmOutcome>;
  /** Step 1 "Back to count": return to the correction draft; nothing changes. */
  onBackToCount: () => void;
  /** Step 2, after its popup: Replace result (count) or remove the result (Back in the game). */
  onSave: () => Promise<ConfirmOutcome>;
  /** Step 2 "Edit count first": open the correction draft. */
  onEditCount: () => void;
  /** Step 3 "Review <owner>’s new rebuy…": open the ordinary rebuy popup with a new mix. */
  onReviewNewRebuy: () => void;
  /** Done "Back to Play". */
  onFinish: () => void;
  /** Development fixtures: a popup open on load. */
  initialDialog?: FixDialog;
}

/**
 * Fix <name>’s count (or result), design 3 · one step at a time: a 3-segment progress bar and only
 * the current step, large. Every step keeps its own confirmation; nothing cascades.
 */
export function FixPage({
  data,
  onBack,
  onMore,
  onUndo,
  onBackToCount,
  onSave,
  onEditCount,
  onReviewNewRebuy,
  onFinish,
  initialDialog,
}: FixPageProps) {
  const [dialog, setDialog] = useState<FixDialog | null>(initialDialog ?? null);
  const [running, setRunning] = useState(false);
  const busy = useRef(false);
  const { playerName: name, blocker } = data;
  const owner = blocker.ownerName;
  const what = data.target === 'count' ? 'count' : 'result';
  const stepNumber = data.step === 'done' ? 3 : data.step;

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

  let body: React.ReactNode;
  let next: string | null = null;
  switch (data.step) {
    case 1:
      next = `Next: save ${name}’s ${what}, then give ${owner} a new rebuy.`;
      body = (
        <>
          <Eyebrow tone="error">{`Can’t ${data.target === 'count' ? `save ${name}’s count` : `remove ${name}’s result`} yet`}</Eyebrow>
          <ChipWithDelta chip={blocker.chip} size={96} />
          <Text variant="sectionTitle" align="center" accessibilityRole="header">
            {blocker.usageText}
          </Text>
          <Text variant="supporting" tone="supporting" align="center">
            {`Undo that rebuy first. Only the record is removed; ${owner} keeps the chips for now.`}
          </Text>
          <Card gap={space.sm}>
            <View style={styles.between}>
              <Text variant="bodyStrong">{`${owner} · Rebuy ${blocker.rebuyNumber}`}</Text>
              <Text variant="supporting" tone="supporting" tabular>
                {blocker.amountText}
              </Text>
            </View>
            <MixPills mix={blocker.mix} hideZero accessibilityLabel={`${owner}’s rebuy ${blocker.rebuyNumber} chips`} />
          </Card>
          <Button label={`Undo ${owner}’s rebuy ${blocker.rebuyNumber}…`} variant="primary" fullWidth onPress={() => setDialog({ kind: 'undo' })} />
          <Button label={data.target === 'count' ? 'Back to count' : `Back to ${name}`} variant="tertiary" fullWidth onPress={onBackToCount} />
        </>
      );
      break;
    case 2:
      next = `Then: give ${owner} a new rebuy.`;
      body = (
        <>
          <Eyebrow tone="confirmed">{`✓ ${owner}’s rebuy undone`}</Eyebrow>
          <Text variant="sectionTitle" align="center" accessibilityRole="header">
            {data.target === 'count' ? `Now save ${name}’s corrected count` : `Now remove ${name}’s result`}
          </Text>
          {data.correction ? (
            <Card variant="inset">
              <MixPills mix={data.correction.mix} accessibilityLabel={`${name}’s corrected count`} />
            </Card>
          ) : null}
          <Button
            label={data.target === 'count' ? `Save ${name}’s count…` : `Remove ${name}’s result…`}
            variant="primary"
            fullWidth
            onPress={() => setDialog({ kind: 'save' })}
          />
          {data.target === 'count' ? <Button label="Edit count first" variant="tertiary" fullWidth onPress={onEditCount} /> : null}
        </>
      );
      break;
    case 3:
      body = (
        <>
          <Eyebrow tone="confirmed">{`✓ ${name}’s ${data.target === 'count' ? 'count saved' : 'result removed'}`}</Eyebrow>
          <Text variant="sectionTitle" align="center" accessibilityRole="header">
            {`Give ${owner} a new rebuy`}
          </Text>
          <Text variant="supporting" tone="supporting" align="center">
            {`The new stack comes from the corrected bank. Swap ${owner}’s chips so they match it.`}
          </Text>
          <Button label={`Review ${owner}’s new rebuy…`} variant="primary" fullWidth onPress={onReviewNewRebuy} />
        </>
      );
      break;
    case 'done':
      body = (
        <>
          <View style={styles.bigCheck}>
            <Icon name="check" size={40} color={colors.confirmed} />
          </View>
          <Text variant="cardTitle" align="center" accessibilityRole="header">
            All fixed
          </Text>
          <View accessibilityRole="list">
            {[
              `${owner}’s old rebuy ${blocker.rebuyNumber} undone`,
              `${name}’s ${data.target === 'count' ? 'count saved' : 'result removed'}`,
              `${owner} got a new rebuy`,
            ].map((line) => (
              <View key={line} style={styles.doneLine} accessible accessibilityLabel={`Done: ${line}`}>
                <Icon name="check" size={18} color={colors.confirmed} />
                <Text style={styles.doneText}>{line}</Text>
              </View>
            ))}
          </View>
          <Button label="Back to Play" variant="primary" fullWidth onPress={onFinish} />
        </>
      );
      break;
  }

  return (
    <>
      <Screen topBar={<TopBar backLabel="Back to Play" onBack={onBack} onMore={onMore} />}>
        <ScreenHeader
          context={data.context}
          badges={
            <BadgeRow>
              <Badge label="In progress" tone="primary" />
            </BadgeRow>
          }
          title={`Fix ${name}’s ${what}`}
        >
          <ProgressBar
            value={stepNumber}
            max={3}
            segments={3}
            tone={data.step === 'done' ? 'confirmed' : 'primary'}
            accessibilityLabel={data.step === 'done' ? 'All 3 steps done' : `Step ${data.step} of 3`}
          />
        </ScreenHeader>
        <View style={styles.step}>{body}</View>
        {next ? (
          <Text variant="supporting" tone="supporting" align="center">
            {next}
          </Text>
        ) : null}
      </Screen>

      <UndoRebuyDialog
        visible={dialog?.kind === 'undo'}
        undo={data.undo}
        busy={running}
        onConfirm={() => void run(onUndo)}
        onCancel={() => setDialog(null)}
      />
      <ResultConfirmationDialog
        visible={dialog?.kind === 'save' && data.correction !== null}
        confirmation={data.correction?.confirmation ?? null}
        busy={running}
        onConfirm={() => void run(onSave)}
        onCancel={() => setDialog(null)}
      />
      <ReturnToPlayDialog
        visible={dialog?.kind === 'save' && data.removal !== null}
        data={data.removal}
        busy={running}
        onConfirm={() => void run(onSave)}
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

function Eyebrow({ tone, children }: { tone: 'error' | 'confirmed'; children: string }) {
  return (
    <Text variant="overline" align="center" strong accessibilityLabel={children} style={{ color: toneColors[tone].text }}>
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  step: { gap: space.lg, alignItems: 'stretch' },
  between: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: space.sm },
  bigCheck: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: toneColors.confirmed.border,
    backgroundColor: toneColors.confirmed.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  doneText: { flex: 1 },
});
