import { View } from 'react-native';

import { Dialog, FactRow, InlineNotice } from '@/ui';

import { MixPills } from './MixPills';
import type { ResultConfirmationData } from './types';

export interface ResultConfirmationDialogProps {
  visible: boolean;
  confirmation: ResultConfirmationData | null;
  /** A confirmation is running: the action reads "Saving…" and cannot be pressed again. */
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * "Confirm <name>’s result?" (or "Replace <name>’s result?"): the counted mix with ×0, final chip
 * units, chip value, all contributions and win / loss. No provisional label, no consequence note;
 * a replacement keeps its one line about replacing the previous return.
 */
export function ResultConfirmationDialog({ visible, confirmation, busy, onConfirm, onCancel }: ResultConfirmationDialogProps) {
  const replace = confirmation?.kind === 'replace';
  return (
    <Dialog
      visible={visible && confirmation !== null}
      title={confirmation ? `${replace ? 'Replace' : 'Confirm'} ${confirmation.playerName}’s result?` : ''}
      confirmLabel={replace ? 'Replace result' : 'Confirm result'}
      confirmLoading={busy}
      confirmLoadingLabel="Saving…"
      onConfirm={onConfirm}
      onCancel={() => {
        if (!busy) onCancel();
      }}
    >
      {confirmation ? (
        <>
          <MixPills mix={confirmation.mix} accessibilityLabel="Counted chips" />
          <View>
            <FactRow label="Final chip units" value={confirmation.unitsText} />
            <FactRow label="Chip value" value={confirmation.chipValueText} />
            <FactRow label="All contributions" value={confirmation.contributionsText} />
            <FactRow label="Win / loss" value={confirmation.winLossText} divider={false} />
          </View>
          {confirmation.zeroChips ? (
            <InlineNotice tone="warning" title="Zero chips.">
              This records a result with no chips, not an uncounted player.
            </InlineNotice>
          ) : null}
          {replace ? (
            <InlineNotice tone="info" announce={false}>
              Replaces the previous return once. This corrects records, not chips.
            </InlineNotice>
          ) : null}
        </>
      ) : null}
    </Dialog>
  );
}
