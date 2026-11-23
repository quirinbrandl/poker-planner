import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  formatGameDateTime,
  formatShortDateTime,
  modeLabel,
  participantNamesLabel,
  phaseLabel,
  phaseModeLabel,
} from '@/features/shared/format';
import { gamesHref, historyHref, planningStepHref } from '@/features/shared/routes';
import type { GameCard, ReturnToPlanningConfirmation } from '@/game-management';
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
 * Game actions behind ⋯, connected to game management. Delete works in every phase; Return to
 * Planning is offered In progress; Reopen appears once game management offers it (see
 * `GameActionsView`). Cancel anywhere changes nothing.
 */
export function GameActionsSheet({ gameId, visible, onClose }: GameActionsSheetProps) {
  const app = useGameManagement();
  const toast = useToast();
  const [confirmation, setConfirmation] = useState<GameAction | null>(null);
  const [busy, setBusy] = useState<GameAction | null>(null);
  const [reset, setReset] = useState<ReturnToPlanningConfirmation | null>(null);
  const game = app.games.get(gameId);
  const inProgress = game?.phase === 'inProgress';

  useEffect(() => {
    // What Return to Planning would clear and keep, read fresh each time the sheet opens.
    if (!visible || !inProgress) return;
    let current = true;
    void app.play.returnToPlanning(gameId).then((result) => {
      if (current) setReset(result.status === 'needsConfirmation' ? result.confirmation : null);
    });
    return () => {
      current = false;
    };
  }, [app, gameId, visible, inProgress]);

  if (!game) return null;

  const returnToPlanning = async () => {
    setBusy('returnToPlanning');
    const result = await app.play.returnToPlanning(gameId, { confirmed: true });
    setBusy(null);
    setConfirmation(null);
    if (result.status === 'accepted') {
      router.dismissTo(gamesHref);
      router.push(planningStepHref(gameId, 'preview'));
      toast.show(GAME_TOASTS.backInPlanning, { tone: 'confirmed' });
    } else if (result.status === 'rejected') toast.show(result.reason.message, { tone: 'error' });
  };

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
      busy={busy}
      onDelete={() => void deleteGame()}
      onReturnToPlanning={inProgress && reset ? () => void returnToPlanning() : undefined}
      returnToPlanning={inProgress && reset ? { clears: reset.clears.parts, keeps: reset.keeps.parts } : undefined}
    />
  );
}
