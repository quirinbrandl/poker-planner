import { router, useFocusEffect } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import { formatShortDateTime, modeLabel } from '@/features/shared/format';
import { detailsHref, gamesHref, paymentsHref, playHref, resultsHref } from '@/features/shared/routes';
import type { GameCard } from '@/game-management';
import { useGame, useGameManagement } from '@/state';

import { GameActionsSheet } from './GameActionsSheet';
import type { WorkspaceTab } from './WorkspaceFrame';

/** What every workspace screen of a started game shares, ready to hand to its view. */
export interface Workspace {
  game: GameCard;
  phase: 'inProgress' | 'completed';
  /** "Cash game · 13 Nov, 19:30". */
  context: string;
  backLabel: 'Games' | 'History';
  /** Switch workspace tab: records the working location and replaces this screen. */
  onSelectTab: (tab: WorkspaceTab) => void;
  /** Leave to Games (also Android back). */
  onBack: () => void;
  /** Open the game actions (⋯). */
  onMore: () => void;
  /** Render once per screen, beside the view: the game actions sheet and its confirmations. */
  actions: ReactNode;
}

const TAB_HREF = { play: playHref, results: resultsHref, details: detailsHref, payments: paymentsHref } as const;

/**
 * Connects a started game's workspace screen to navigation and the game actions. Returns `null`
 * while the game is not a started game (deleted, or back in Planning): the screen then renders
 * nothing and this hook leaves to Games, unless something else already navigated away.
 *
 * Android back from a workspace tab goes to Games. Screens stacked on top of a tab (player page,
 * count editor, …) do not use this hook; they go back with the router.
 */
export function useWorkspace(gameId: string): Workspace | null {
  const app = useGameManagement();
  const game = useGame(gameId);
  const [actionsOpen, setActionsOpen] = useState(false);

  const goToGames = useCallback(() => {
    void app.location.set({ kind: 'games' });
    router.dismissTo(gamesHref);
  }, [app]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goToGames();
        return true;
      });
      return () => subscription.remove();
    }, [goToGames]),
  );

  const started = game !== null && game.phase !== 'planning';
  const gone = game === null;
  useEffect(() => {
    // Deleted games leave through the action that deleted them; this covers every other way.
    if (gone) router.dismissTo(gamesHref);
  }, [gone]);
  if (!started) return null;

  const onSelectTab = (tab: WorkspaceTab) => {
    if (tab !== 'payments') void app.location.set({ kind: tab, gameId });
    router.replace(TAB_HREF[tab](gameId));
  };

  return {
    game,
    phase: game.phase === 'completed' ? 'completed' : 'inProgress',
    context: `${modeLabel(game.mode)} · ${formatShortDateTime(game.createdAt)}`,
    backLabel: 'Games',
    onSelectTab,
    onBack: goToGames,
    onMore: () => setActionsOpen(true),
    actions: <GameActionsSheet gameId={gameId} visible={actionsOpen} onClose={() => setActionsOpen(false)} />,
  };
}
