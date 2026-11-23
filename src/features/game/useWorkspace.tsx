import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import { formatShortDateTime, formatTime, modeLabel } from '@/features/shared/format';
import {
  detailsHref,
  gamesHref,
  historyHref,
  paymentsHref,
  playHref,
  resultsHref,
  type WorkspaceFrom,
} from '@/features/shared/routes';
import type { GameCard } from '@/game-management';
import { useGame, useGameManagement } from '@/state';

import { GameActionsSheet } from './GameActionsSheet';
import type { WorkspaceTab } from './WorkspaceFrame';

/** What every workspace screen of a started game shares, ready to hand to its view. */
export interface Workspace {
  game: GameCard;
  phase: 'inProgress' | 'completed';
  /** "Cash game · 13 Nov, 19:30"; Completed adds " · finished 23:41". */
  context: string;
  /** "History" for a Completed game opened from History, otherwise "Games". */
  backLabel: 'Games' | 'History';
  /** Where the game was opened from (`history`), kept across tab switches and on the location. */
  from: WorkspaceFrom | undefined;
  /** Switch workspace tab: records the working location and replaces this screen. */
  onSelectTab: (tab: WorkspaceTab) => void;
  /** Leave to Games or History (also Android back). */
  onBack: () => void;
  /** Open the game actions (⋯). */
  onMore: () => void;
  /** Render once per screen, beside the view: the game actions sheet and its confirmations. */
  actions: ReactNode;
}

const TAB_HREF = {
  play: (gameId: string) => playHref(gameId),
  results: resultsHref,
  details: detailsHref,
  payments: paymentsHref,
} as const;

/** "23 Nov, 19:30 · finished 23:41" (the finishing date is added when it is another day). */
function finishedText(game: GameCard): string {
  if (!game.finishedAt) return '';
  const created = new Date(game.createdAt);
  const finished = new Date(game.finishedAt);
  const sameDay = created.toDateString() === finished.toDateString();
  return ` · finished ${sameDay ? formatTime(game.finishedAt) : formatShortDateTime(game.finishedAt)}`;
}

/** The workspace context line: "Cash game · 23 Nov, 19:30", Completed with its finishing time. */
export function workspaceContext(game: GameCard): string {
  return `${modeLabel(game.mode)} · ${formatShortDateTime(game.createdAt)}${game.phase === 'completed' ? finishedText(game) : ''}`;
}

/**
 * Connects a started game's workspace screen to navigation and the game actions. Returns `null`
 * while the game is not a started game (deleted, or back in Planning): the screen then renders
 * nothing and this hook leaves to Games (History when opened from there), unless something else
 * already navigated away.
 *
 * A Completed game opened from History carries `?from=history`: its back control (and Android
 * back) leads to History; otherwise to Games. Screens stacked on top of a tab (player page, count
 * editor, …) do not use this hook; they go back with the router.
 */
export function useWorkspace(gameId: string): Workspace | null {
  const app = useGameManagement();
  const game = useGame(gameId);
  const params = useLocalSearchParams<{ from?: string }>();
  const [actionsOpen, setActionsOpen] = useState(false);
  // Only a Completed game lives in History; a reopened one is back on Games.
  const from: WorkspaceFrom | undefined = params.from === 'history' && game?.phase === 'completed' ? 'history' : undefined;

  const goBack = useCallback(() => {
    if (from === 'history') {
      void app.location.set({ kind: 'history' });
      router.dismissTo(historyHref);
    } else {
      void app.location.set({ kind: 'games' });
      router.dismissTo(gamesHref);
    }
  }, [app, from]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => subscription.remove();
    }, [goBack]),
  );

  const started = game !== null && game.phase !== 'planning';
  const gone = game === null;
  const leaveTo = params.from === 'history' ? historyHref : gamesHref;
  useEffect(() => {
    // Deleted games leave through the action that deleted them; this covers every other way.
    if (gone) router.dismissTo(leaveTo);
  }, [gone, leaveTo]);
  if (!started) return null;

  const onSelectTab = (tab: WorkspaceTab) => {
    void app.location.set({ kind: tab, gameId, ...(from ? { from } : {}) });
    router.replace(TAB_HREF[tab](gameId, from));
  };

  return {
    game,
    phase: game.phase === 'completed' ? 'completed' : 'inProgress',
    context: workspaceContext(game),
    backLabel: from === 'history' ? 'History' : 'Games',
    from,
    onSelectTab,
    onBack: goBack,
    onMore: () => setActionsOpen(true),
    actions: <GameActionsSheet gameId={gameId} visible={actionsOpen} onClose={() => setActionsOpen(false)} />,
  };
}
