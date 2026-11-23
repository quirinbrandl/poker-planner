import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { gamesHref } from '@/features/shared/routes';
import { useGameManagement } from '@/state';
import { EmptyState, Screen, ScreenHeader, TopBar } from '@/ui';

/**
 * History: Completed games. Games can't be completed yet, so this is the approved empty state
 * until the History ticket fills it.
 */
export default function HistoryScreen() {
  const app = useGameManagement();
  useFocusEffect(
    useCallback(() => {
      void app.location.set({ kind: 'history' });
    }, [app]),
  );
  const goToGames = () => router.dismissTo(gamesHref);

  return (
    <Screen topBar={<TopBar backLabel="Games" onBack={goToGames} />}>
      <ScreenHeader title="History" />
      <EmptyState
        icon="clock"
        title="No finished games yet"
        description="A game shows up here once you calculate its Payments."
        action={{ label: 'Back to Games', onPress: goToGames }}
      />
    </Screen>
  );
}
