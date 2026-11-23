import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { HistoryView } from '@/features/history/HistoryView';
import type { HistoryData } from '@/features/history/types';
import { gamesHref } from '@/features/shared/routes';
import { useGameManagement } from '@/state';

/** Games can't be completed yet: History stays empty until game management lists finished games. */
const NO_FINISHED_GAMES: HistoryData = { games: [] };

/** History route: records the working location and shows the finished games. */
export default function HistoryScreen() {
  const app = useGameManagement();
  useFocusEffect(
    useCallback(() => {
      void app.location.set({ kind: 'history' });
    }, [app]),
  );
  const goToGames = () => router.dismissTo(gamesHref);

  return <HistoryView data={NO_FINISHED_GAMES} onBack={goToGames} onOpenGame={() => undefined} />;
}
