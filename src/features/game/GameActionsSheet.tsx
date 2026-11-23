import { router } from 'expo-router';
import { useState } from 'react';

import { formatGameDateTime, modeLabel, phaseLabel } from '@/features/shared/format';
import { gamesHref } from '@/features/shared/routes';
import { useGameManagement } from '@/state';
import { BottomSheet, Dialog, Text, useToast } from '@/ui';

export interface GameActionsSheetProps {
  gameId: string;
  visible: boolean;
  onClose: () => void;
}

/**
 * The secondary game-actions menu behind ⋯, with the lifecycle actions the game's phase allows.
 * Placeholder: only a plain permanent delete so far. The approved sheet, popups, destinations and
 * toasts are in the spec's "Payments, completion, history and lifecycle actions" sections 5–8.
 */
export function GameActionsSheet({ gameId, visible, onClose }: GameActionsSheetProps) {
  const app = useGameManagement();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const game = app.games.get(gameId);
  if (!game) return null;

  const deleteGame = async () => {
    setConfirmDelete(false);
    const result = await app.games.delete(gameId);
    if (result.status !== 'accepted') return;
    router.dismissTo(gamesHref);
    toast.show('Game deleted');
  };

  return (
    <>
      <BottomSheet
        visible={visible && !confirmDelete}
        title="Game actions"
        subtitle={`${phaseLabel(game.phase)} · ${modeLabel(game.mode)} · ${formatGameDateTime(game.createdAt)}`}
        actions={[
          {
            key: 'delete',
            label: 'Delete game…',
            description: 'Removes this game for good.',
            icon: 'trash',
            destructive: true,
            onPress: () => {
              onClose();
              setConfirmDelete(true);
            },
          },
        ]}
        onCancel={onClose}
      />
      <Dialog
        visible={confirmDelete}
        title="Delete this game?"
        confirmLabel="Delete game"
        destructive
        onConfirm={deleteGame}
        onCancel={() => setConfirmDelete(false)}
      >
        <Text>Everything recorded in this game is deleted. This can’t be undone.</Text>
        <Text tone="supporting">Saved players and chip set templates stay.</Text>
      </Dialog>
    </>
  );
}
