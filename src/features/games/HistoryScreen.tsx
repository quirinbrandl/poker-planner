import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { historyCardData } from '@/features/history/cardData';
import { HistoryView } from '@/features/history/HistoryView';
import { gamesHref, locationHref } from '@/features/shared/routes';
import { useGameManagement, useHistory } from '@/state';
import { useToast } from '@/ui';

/** History route: records the working location and shows the finished games; a card opens its Payments. */
export default function HistoryScreen() {
  const app = useGameManagement();
  const history = useHistory();
  const toast = useToast();
  useFocusEffect(
    useCallback(() => {
      void app.location.set({ kind: 'history' });
    }, [app]),
  );
  const goToGames = () => router.dismissTo(gamesHref);

  const open = async (gameId: string) => {
    const result = await app.games.open(gameId);
    if (result.status === 'accepted') router.push(locationHref(result.location));
    else toast.show(result.reason.message, { tone: 'error' });
  };

  return (
    <HistoryView
      data={{ games: history.map(historyCardData) }}
      onBack={goToGames}
      onOpenGame={(gameId) => void open(gameId)}
    />
  );
}
