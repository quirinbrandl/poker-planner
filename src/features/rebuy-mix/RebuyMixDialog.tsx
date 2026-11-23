import { View } from 'react-native';

import { MixPills } from '@/features/count/MixPills';
import { Dialog, FactRow, InlineNotice, Text } from '@/ui';

import type { MixAcceptance, RebuyMixConfirmationData } from './types';

export interface RebuyMixDialogProps {
  visible: boolean;
  confirmation: RebuyMixConfirmationData | null;
  /** Saving: the action reads "Saving…" and cannot be pressed again. */
  busy: boolean;
  /** Add rebuy / Save correction, or Accept & add / Accept & save with every warning accepted. */
  onConfirm: (acceptance: MixAcceptance) => void;
  /** Cancel or Decline: nothing changes. */
  onCancel: () => void;
}

/**
 * "Add <name>’s forgotten rebuy?" / "Correct <name>’s rebuy k?": the mix, buy-ins before → after
 * for an addition, optional extra facts, one ⚠ line per problem and the result-stays note.
 * With warnings the choice is Decline / Accept & add (Accept & save).
 */
export function RebuyMixDialog({ visible, confirmation, busy, onConfirm, onCancel }: RebuyMixDialogProps) {
  const correct = confirmation?.kind === 'correct';
  const warned = (confirmation?.warnings.length ?? 0) > 0;
  const title = confirmation
    ? correct
      ? `Correct ${confirmation.playerName}’s rebuy ${confirmation.rebuyNumber ?? ''}?`
      : `Add ${confirmation.playerName}’s forgotten rebuy?`
    : '';
  const confirmLabel = warned ? (correct ? 'Accept & save' : 'Accept & add') : correct ? 'Save correction' : 'Add rebuy';
  return (
    <Dialog
      visible={visible && confirmation !== null}
      title={title}
      confirmLabel={confirmLabel}
      cancelLabel={warned ? 'Decline' : 'Cancel'}
      confirmLoading={busy}
      confirmLoadingLabel="Saving…"
      onConfirm={() => {
        if (confirmation) onConfirm({ acceptedWarnings: confirmation.warnings.map((warning) => warning.code) });
      }}
      onCancel={() => {
        if (!busy) onCancel();
      }}
    >
      {confirmation ? (
        <>
          <MixPills mix={confirmation.mix} accessibilityLabel="Rebuy chips" />
          {confirmation.buyInsChange || confirmation.extraFacts.length > 0 ? (
            <View>
              {confirmation.buyInsChange ? (
                <FactRow
                  label={`${confirmation.playerName}’s buy-ins`}
                  value={`${confirmation.buyInsChange.beforeText} → ${confirmation.buyInsChange.afterText}`}
                />
              ) : null}
              {confirmation.extraFacts.map((fact) => (
                <FactRow key={fact.label} label={fact.label} value={fact.value} />
              ))}
            </View>
          ) : null}
          {confirmation.warnings.map((warning) => (
            <InlineNotice key={warning.code} tone="warning">
              {warning.text}
            </InlineNotice>
          ))}
          {confirmation.notes.map((note) => (
            <Text key={note} variant="supporting" tone="supporting">
              {note}
            </Text>
          ))}
        </>
      ) : null}
    </Dialog>
  );
}
