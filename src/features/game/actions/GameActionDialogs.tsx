import { View } from 'react-native';

import { Badge, Card, Dialog, FactRow, space, Text } from '@/ui';

import { useSingleConfirm } from '../useSingleConfirm';
import type { GameActionsGame, ReturnToPlanningData } from './types';

interface ConfirmationProps {
  visible: boolean;
  /** True while the action runs: the confirm shows its progress and nothing runs twice. */
  busy: boolean;
  onConfirm: () => void;
  /** Cancel, back or backdrop: nothing changes. */
  onCancel: () => void;
}

export interface ReopenDialogProps extends ConfirmationProps {
  mode: 'cash' | 'tournament';
}

/** Reopen this game?: records stay, the Payments stop being final. */
export function ReopenDialog({ visible, busy, mode, onConfirm, onCancel }: ReopenDialogProps) {
  const { confirm, cancel } = useSingleConfirm(visible, busy, onConfirm, onCancel);
  return (
    <Dialog
      visible={visible}
      title="Reopen this game?"
      confirmLabel="Reopen game"
      confirmLoading={busy}
      confirmLoadingLabel="Reopening…"
      onConfirm={confirm}
      onCancel={cancel}
    >
      <Text>
        {mode === 'tournament'
          ? 'Places and buy-ins stay. Payments stop being final until you calculate them again.'
          : 'Results and buy-ins stay. Payments stop being final until you calculate them again.'}
      </Text>
    </Dialog>
  );
}

export interface ReturnToPlanningDialogProps extends ConfirmationProps {
  data: ReturnToPlanningData;
}

/** Return to Planning?: what it clears and keeps, and the physical-chip warning. Destructive; Cancel focused. */
export function ReturnToPlanningDialog({ visible, busy, data, onConfirm, onCancel }: ReturnToPlanningDialogProps) {
  const { confirm, cancel } = useSingleConfirm(visible, busy, onConfirm, onCancel);
  return (
    <Dialog
      visible={visible}
      title="Return to Planning?"
      confirmLabel="Return to Planning"
      confirmLoading={busy}
      confirmLoadingLabel="Returning…"
      destructive
      onConfirm={confirm}
      onCancel={cancel}
    >
      <View>
        <FactRow label="Clears" value={data.clears.join(' · ')} stacked />
        <FactRow label="Keeps" value={data.keeps.join(' · ')} stacked divider={false} />
      </View>
      <Text>Collect all chips. You’ll hand out new stacks after Start.</Text>
    </Dialog>
  );
}

export interface DeleteGameDialogProps extends ConfirmationProps {
  game: Pick<GameActionsGame, 'identityLabel' | 'namesText' | 'dateText'>;
}

/** Delete this game?: which game, the permanent consequence and what stays. Destructive; Cancel focused. */
export function DeleteGameDialog({ visible, busy, game, onConfirm, onCancel }: DeleteGameDialogProps) {
  const { confirm, cancel } = useSingleConfirm(visible, busy, onConfirm, onCancel);
  return (
    <Dialog
      visible={visible}
      title="Delete this game?"
      confirmLabel="Delete game"
      confirmLoading={busy}
      confirmLoadingLabel="Deleting…"
      destructive
      onConfirm={confirm}
      onCancel={cancel}
    >
      <Card variant="inset" gap={space.xs + 2} padding={space.lg}>
        <Badge label={game.identityLabel} size="small" />
        <Text variant="bodyStrong">{game.namesText}</Text>
        <Text variant="caption">{game.dateText}</Text>
      </Card>
      <Text>Everything recorded in this game is deleted. This can’t be undone.</Text>
      <Text variant="supporting">Saved players and chip set templates stay.</Text>
    </Dialog>
  );
}
