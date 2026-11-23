import { router } from 'expo-router';
import { useState } from 'react';

import {
  formatGameDateTime,
  formatShortDateTime,
  modeLabel,
  participantNamesLabel,
  phaseLabel,
  phaseModeLabel,
} from '@/features/shared/format';
import { gamesHref } from '@/features/shared/routes';
import type { GameCard } from '@/game-management';
import { useGameManagement } from '@/state';
import { Badge, BottomSheet, Card, Dialog, type SheetAction, space, Text, useToast } from '@/ui';

export interface GameActionsSheetProps {
  gameId: string;
  visible: boolean;
  onClose: () => void;
}

/** The confirmation each sheet action opens. Later phases add 'returnToPlanning' and 'reopen'. */
type Confirmation = 'delete';

/**
 * The phase's lifecycle actions, in sheet order. In progress will add “Return to Planning…” and
 * Completed “Reopen game…” before Delete, each opening its own confirmation.
 */
function actionsFor(game: GameCard, open: (confirmation: Confirmation) => void): SheetAction[] {
  const actions: SheetAction[] = [];
  actions.push({
    key: 'delete',
    label: 'Delete game…',
    description: 'Removes this game for good.',
    icon: 'trash',
    destructive: true,
    onPress: () => open('delete'),
  });
  return actions;
}

/**
 * Game actions behind ⋯: a sheet with the lifecycle actions the game's phase allows, and their
 * confirmations. Cancel anywhere changes nothing.
 */
export function GameActionsSheet({ gameId, visible, onClose }: GameActionsSheetProps) {
  const app = useGameManagement();
  const toast = useToast();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const game = app.games.get(gameId);
  if (!game) return null;

  const open = (next: Confirmation) => {
    onClose();
    setConfirmation(next);
  };

  const deleteGame = async () => {
    setConfirmation(null);
    // Leave first: the game's screens disappear with it.
    router.dismissTo(gamesHref);
    const result = await app.games.delete(gameId);
    if (result.status === 'accepted') toast.show('Game deleted', { tone: 'confirmed' });
  };

  return (
    <>
      <BottomSheet
        visible={visible && confirmation === null}
        title="Game actions"
        subtitle={`${phaseLabel(game.phase)} · ${modeLabel(game.mode)} · ${formatShortDateTime(game.createdAt)}`}
        actions={actionsFor(game, open)}
        onCancel={onClose}
      />
      <Dialog
        visible={confirmation === 'delete'}
        title="Delete this game?"
        confirmLabel="Delete game"
        destructive
        onConfirm={deleteGame}
        onCancel={() => setConfirmation(null)}
      >
        <Card variant="inset" gap={space.xs + 2} padding={space.lg}>
          <Badge label={phaseModeLabel(game.phase, game.mode)} size="small" />
          <Text variant="bodyStrong">{participantNamesLabel(game.participantNames)}</Text>
          <Text variant="caption">{formatGameDateTime(game.createdAt)}</Text>
        </Card>
        <Text>Everything recorded in this game is deleted. This can’t be undone.</Text>
        <Text variant="supporting">Saved players and chip set templates stay.</Text>
      </Dialog>
    </>
  );
}
