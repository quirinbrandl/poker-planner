/**
 * Development only: the game actions (⋯) sheet and its confirmations with fixture data.
 *   /dev/actions?state=menu-planning|menu-inprogress|menu-completed|menu-tournament|menu-large
 *     |return|return-fresh|return-tournament|reopen|reopen-tournament|delete|delete-completed|delete-large
 * Confirming resolves after a short delay with the approved toast; nothing is stored.
 */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ACTION_GAMES, type ActionGameName, RETURN_TO_PLANNING_FIXTURES } from '@/features/game/actions/fixtures';
import { GameActionsView } from '@/features/game/actions/GameActionsView';
import { GAME_TOASTS } from '@/features/game/actions/texts';
import type { GameAction, ReturnToPlanningData } from '@/features/game/actions/types';
import { Button, Screen, ScreenHeader, TopBar, useToast } from '@/ui';

interface State {
  game: ActionGameName;
  open: 'menu' | GameAction;
  returnToPlanning?: ReturnToPlanningData;
}

const STATES: Record<string, State> = {
  'menu-planning': { game: 'planning', open: 'menu' },
  'menu-inprogress': { game: 'inProgress', open: 'menu' },
  'menu-completed': { game: 'completed', open: 'menu' },
  'menu-tournament': { game: 'tournamentInProgress', open: 'menu', returnToPlanning: RETURN_TO_PLANNING_FIXTURES.tournament },
  'menu-large': { game: 'large', open: 'menu' },
  return: { game: 'inProgress', open: 'returnToPlanning' },
  'return-fresh': { game: 'inProgress', open: 'returnToPlanning', returnToPlanning: RETURN_TO_PLANNING_FIXTURES.fresh },
  'return-tournament': { game: 'tournamentInProgress', open: 'returnToPlanning', returnToPlanning: RETURN_TO_PLANNING_FIXTURES.tournament },
  reopen: { game: 'completed', open: 'reopen' },
  'reopen-tournament': { game: 'tournamentCompleted', open: 'reopen' },
  delete: { game: 'planning', open: 'delete' },
  'delete-completed': { game: 'completed', open: 'delete' },
  'delete-large': { game: 'large', open: 'delete' },
};

const TOASTS: Record<GameAction, string> = {
  returnToPlanning: GAME_TOASTS.backInPlanning,
  reopen: GAME_TOASTS.reopened,
  delete: GAME_TOASTS.deleted,
};

function Fixture({ state }: { state: State }) {
  const toast = useToast();
  const game = ACTION_GAMES[state.game];
  const [sheet, setSheet] = useState(state.open === 'menu');
  const [confirmation, setConfirmation] = useState<GameAction | null>(state.open === 'menu' ? null : state.open);
  const [busy, setBusy] = useState<GameAction | null>(null);
  const run = (action: GameAction) => () => {
    setBusy(action);
    setTimeout(() => {
      setBusy(null);
      setConfirmation(null);
      toast.show(TOASTS[action], { tone: 'confirmed' });
    }, 800);
  };
  return (
    <Screen topBar={<TopBar backLabel="Games" onBack={() => undefined} onMore={() => setSheet(true)} />}>
      <ScreenHeader context={game.subtitle} title="Game actions" />
      <Button label="Open Game actions" icon="more" onPress={() => setSheet(true)} fullWidth />
      <GameActionsView
        game={game}
        sheetVisible={sheet}
        onCloseSheet={() => setSheet(false)}
        confirmation={confirmation}
        onChoose={(action) => {
          setSheet(false);
          setConfirmation(action);
        }}
        onCancelConfirmation={() => setConfirmation(null)}
        busy={busy}
        onDelete={run('delete')}
        onReopen={run('reopen')}
        onReturnToPlanning={run('returnToPlanning')}
        returnToPlanning={state.returnToPlanning ?? RETURN_TO_PLANNING_FIXTURES.cash}
      />
    </Screen>
  );
}

export default function ActionsDevRoute() {
  const { state = 'menu-inprogress' } = useLocalSearchParams<{ state?: string }>();
  return <Fixture key={state} state={STATES[state] ?? STATES['menu-inprogress']} />;
}
