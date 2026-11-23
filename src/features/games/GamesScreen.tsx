import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useLaunchRestore } from '@/features/shared/launch';
import {
  historyHref,
  locationHref,
  newGameHref,
  savedPlayersHref,
  templatesHref,
} from '@/features/shared/routes';
import { useGameManagement, useGames } from '@/state';
import { useToast } from '@/ui';

import { gameCardData } from './cardData';
import { GamesView } from './GamesView';

/**
 * Games route: lists the unfinished games (the interface orders each section newest first) and
 * opens them. On the first focus after launch it moves on to where the host left off instead.
 */
export default function GamesScreen() {
  const app = useGameManagement();
  const games = useGames();
  const launch = useLaunchRestore();
  const toast = useToast();

  useFocusEffect(
    useCallback(() => {
      const restore = launch.take();
      if (restore) {
        router.push(locationHref(restore));
        return;
      }
      void app.location.set({ kind: 'games' });
    }, [app, launch]),
  );

  const open = async (gameId: string) => {
    const result = await app.games.open(gameId);
    if (result.status === 'accepted') router.push(locationHref(result.location));
    else toast.show(result.reason.message, { tone: 'error' });
  };

  return (
    <GamesView
      data={{
        inProgress: games.filter((game) => game.phase === 'inProgress').map((game) => gameCardData(game)),
        planning: games.filter((game) => game.phase === 'planning').map((game) => gameCardData(game)),
      }}
      onNewGame={() => router.push(newGameHref)}
      onOpenGame={(gameId) => void open(gameId)}
      onOpenHistory={() => router.push(historyHref)}
      onOpenSavedPlayers={() => router.push(savedPlayersHref)}
      onOpenTemplates={() => router.push(templatesHref)}
    />
  );
}
