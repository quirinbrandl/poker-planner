import { View } from 'react-native';

import { MixPills } from '@/features/count/MixPills';
import { Dialog, FactRow, Text } from '@/ui';

import type { ReturnToPlayData, UndoRebuyData } from './types';

export interface UndoRebuyDialogProps {
  visible: boolean;
  undo: UndoRebuyData | null;
  /** The undo is running: the action reads "Undoing…" and cannot be pressed again. */
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** "Undo <name>’s rebuy k?": the mix, contributions before → after and one physical-chip line. */
export function UndoRebuyDialog({ visible, undo, busy, onConfirm, onCancel }: UndoRebuyDialogProps) {
  return (
    <Dialog
      visible={visible && undo !== null}
      title={undo ? `Undo ${undo.playerName}’s rebuy ${undo.rebuyNumber}?` : ''}
      confirmLabel="Undo rebuy"
      destructive
      confirmLoading={busy}
      confirmLoadingLabel="Undoing…"
      onConfirm={onConfirm}
      onCancel={() => {
        if (!busy) onCancel();
      }}
    >
      {undo ? (
        <>
          <MixPills mix={undo.mix} hideZero accessibilityLabel={`Rebuy ${undo.rebuyNumber} chips`} />
          <FactRow
            label={`${undo.playerName}’s contributions`}
            value={`${undo.contributionsBeforeText} → ${undo.contributionsAfterText}`}
            stacked
          />
          <Text variant="supporting" tone="supporting">
            {undo.context === 'fix'
              ? `Only the record is removed. ${undo.playerName} keeps the chips until the new rebuy.`
              : `Only the record is removed. Take the chips back if ${undo.playerName} already has them.`}
          </Text>
        </>
      ) : null}
    </Dialog>
  );
}

export interface ReturnToPlayDialogProps {
  visible: boolean;
  data: ReturnToPlayData | null;
  /** Running: the action reads "Saving…" and cannot be pressed again. */
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** "<name> back in the game?": chips to hand back, Final result · Removed, Buy-ins · unchanged. */
export function ReturnToPlayDialog({ visible, data, busy, onConfirm, onCancel }: ReturnToPlayDialogProps) {
  return (
    <Dialog
      visible={visible && data !== null}
      title={data ? `${data.playerName} back in the game?` : ''}
      confirmLabel="Back in the game"
      confirmLoading={busy}
      confirmLoadingLabel="Saving…"
      onConfirm={onConfirm}
      onCancel={() => {
        if (!busy) onCancel();
      }}
    >
      {data ? (
        <>
          {data.handBack.some((chip) => chip.count > 0) ? (
            <>
              <Text variant="supporting" tone="supporting">{`Hand ${data.playerName} back these chips:`}</Text>
              <MixPills mix={data.handBack} hideZero accessibilityLabel="Chips to hand back" />
            </>
          ) : (
            <Text variant="supporting" tone="supporting">
              {`${data.playerName} cashed out with no chips, so there’s nothing to hand back.`}
            </Text>
          )}
          <View>
            <FactRow label="Final result" value="Removed" />
            <FactRow label="Buy-ins" value={`${data.buyInsText} · unchanged`} divider={false} />
          </View>
        </>
      ) : null}
    </Dialog>
  );
}
