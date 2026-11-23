import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BlockedMixDialog } from '@/features/count/BlockedMixDialog';
import { ChipEntryPanel } from '@/features/count/ChipEntryPanel';
import type { BlockedMixData, ConfirmOutcome } from '@/features/count/types';
import {
  Button,
  Card,
  FooterActions,
  InlineNotice,
  ProgressBar,
  Screen,
  ScreenHeader,
  space,
  Text,
  type TextInputRef,
  TopBar,
} from '@/ui';

import { RebuyMixDialog } from './RebuyMixDialog';
import type { MixAcceptance, MixGoal, MixReviewOutcome, RebuyMixConfirmationData, RebuyMixEditorData } from './types';

/** A popup of the editor, for development fixtures that open one on load. */
export type RebuyMixDialogState =
  | { kind: 'confirm'; confirmation: RebuyMixConfirmationData }
  | { kind: 'blocked'; blocked: BlockedMixData };

export interface RebuyMixEditorProps {
  data: RebuyMixEditorData;
  /** Raw text of one denomination changed. */
  onChangeQuantity: (denominationValue: number, text: string) => void;
  /** "Set remaining quantities to zero": fill blanks only. */
  onSetRemainingToZero: () => void;
  /** Back: leave without saving a rebuy. */
  onLeave: () => void;
  onMore?: () => void;
  /** "Review rebuy →". Changes nothing. */
  onReview: () => Promise<MixReviewOutcome>;
  /** Add rebuy / Save correction / Accept & …; on `accepted` the caller returns to the player page. */
  onConfirm: (acceptance: MixAcceptance) => Promise<ConfirmOutcome>;
  initialIndex?: number;
  /** Development fixtures: a popup open on load. */
  initialDialog?: RebuyMixDialogState;
}

const GOAL_TONE = { toGo: 'primary', exactSoFar: 'primary', over: 'error', exact: 'confirmed' } as const;
const GOAL_TEXT_TONE = { toGo: 'supporting', exactSoFar: 'supporting', over: 'error', exact: 'confirmed' } as const;

/**
 * Forgotten rebuy / Correct mix editor: the chips the player actually got, with the count editor's
 * B picker and a bar toward the exact stack value. Presentational: validation comes from `data`.
 */
export function RebuyMixEditor({
  data,
  onChangeQuantity,
  onSetRemainingToZero,
  onLeave,
  onMore,
  onReview,
  onConfirm,
  initialIndex = 0,
  initialDialog,
}: RebuyMixEditorProps) {
  const [index, setIndex] = useState(initialIndex);
  const [dialog, setDialog] = useState<RebuyMixDialogState | null>(initialDialog ?? null);
  const [reviewing, setReviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const busy = useRef(false);
  const quantityRef = useRef<TextInputRef>(null);
  const hasBlank = data.entries.some((entry) => entry.state === 'notEntered');

  const review = async () => {
    if (busy.current) return;
    busy.current = true;
    setReviewing(true);
    try {
      const outcome = await onReview();
      if (outcome.kind === 'confirm') setDialog({ kind: 'confirm', confirmation: outcome.confirmation });
      else if (outcome.kind === 'blocked') setDialog({ kind: 'blocked', blocked: outcome.blocked });
      else if (outcome.kind === 'needsCorrection' && outcome.firstDenominationValue !== null) {
        const target = data.entries.findIndex((entry) => entry.value === outcome.firstDenominationValue);
        if (target >= 0) setIndex(target);
        setTimeout(() => quantityRef.current?.focus(), 50);
      }
    } finally {
      busy.current = false;
      setReviewing(false);
    }
  };

  const confirm = async (acceptance: MixAcceptance) => {
    if (busy.current) return;
    busy.current = true;
    setConfirming(true);
    try {
      const outcome = await onConfirm(acceptance);
      if (outcome.kind === 'blocked') setDialog({ kind: 'blocked', blocked: outcome.blocked });
      else if (outcome.kind === 'rejected') setDialog(null);
    } finally {
      busy.current = false;
      setConfirming(false);
    }
  };

  const title = `${data.playerName} · ${data.kind === 'correct' ? `Rebuy ${data.rebuyNumber ?? ''}` : 'Forgotten rebuy'}`;

  return (
    <>
      <Screen
        topBar={<TopBar backLabel="Back" onBack={onLeave} onMore={onMore} />}
        footer={
          <FooterActions>
            <Button label="Review rebuy" trailingIcon="forward" variant="primary" loading={reviewing} onPress={() => void review()} />
          </FooterActions>
        }
      >
        <ScreenHeader title={title} />

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

        <GoalCard goal={data.goal} />
      </Screen>

      <RebuyMixDialog
        visible={dialog?.kind === 'confirm'}
        confirmation={dialog?.kind === 'confirm' ? dialog.confirmation : null}
        busy={confirming}
        onConfirm={(acceptance) => void confirm(acceptance)}
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

/** The bar toward the exact stack value with "N to go" / "N over" / "Exactly 200 ✓". */
export function GoalCard({ goal }: { goal: MixGoal }) {
  return (
    <Card gap={space.sm}>
      <View style={styles.total} accessible accessibilityLabel={`${goal.unitsText} of ${goal.targetText} chip units. ${goal.statusText}`} accessibilityLiveRegion="polite">
        <Text variant="amountLarge" tabular>
          {goal.unitsText}
        </Text>
        <Text variant="supporting" tone="supporting">{`of ${goal.targetText} chip units`}</Text>
      </View>
      <ProgressBar
        value={Math.min(goal.units, goal.target)}
        max={goal.target}
        tone={GOAL_TONE[goal.status]}
        accessibilityLabel={`${goal.unitsText} of ${goal.targetText} chip units`}
      />
      <Text variant="supporting" tone={GOAL_TEXT_TONE[goal.status]} strong={goal.status !== 'toGo'}>
        {goal.statusText}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  total: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: space.sm },
});
