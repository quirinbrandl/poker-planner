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
import { gamesHref, historyHref } from '@/features/shared/routes';
import type { GameCard } from '@/game-management';
import { useGameManagement } from '@/state';
import { useToast } from '@/ui';

import { GameActionsView } from './actions/GameActionsView';
import { GAME_TOASTS } from './actions/texts';
import type { GameAction, GameActionsGame } from './actions/types';

export interface GameActionsSheetProps {
  gameId: string;
  visible: boolean;
  onClose: () => void;
}

/** The sheet's and the Delete popup's view of a game card. */
export function gameActionsGame(game: GameCard): GameActionsGame {
  return {
    phase: game.phase,
    mode: game.mode,
    subtitle: `${phaseLabel(game.phase)} · ${modeLabel(game.mode)} · ${formatShortDateTime(game.createdAt)}`,
    identityLabel: phaseModeLabel(game.phase, game.mode),
    namesText: participantNamesLabel(game.participantNames),
    dateText: formatGameDateTime(game.createdAt),
  };
}

/**
 * Game actions behind ⋯, connected to game management. Delete works in every phase; Reopen and
 * Return to Planning appear once game management offers them (see `GameActionsView`).
 * Cancel anywhere changes nothing.
 */
export function GameActionsSheet({ gameId, visible, onClose }: GameActionsSheetProps) {
  const app = useGameManagement();
  const toast = useToast();
  const [confirmation, setConfirmation] = useState<GameAction | null>(null);
  const game = app.games.get(gameId);
  if (!game) return null;

  const deleteGame = async () => {
    setConfirmation(null);
    // Leave first: the game's screens disappear with it. Completed games lived in History.
    router.dismissTo(game.phase === 'completed' ? historyHref : gamesHref);
    const result = await app.games.delete(gameId);
    if (result.status === 'accepted') toast.show(GAME_TOASTS.deleted, { tone: 'confirmed' });
  };

  return (
    <GameActionsView
      game={gameActionsGame(game)}
      sheetVisible={visible}
      onCloseSheet={onClose}
      confirmation={confirmation}
      onChoose={(action) => {
        onClose();
        setConfirmation(action);
      }}
      onCancelConfirmation={() => setConfirmation(null)}
      onDelete={() => void deleteGame()}
    />
  );
}
