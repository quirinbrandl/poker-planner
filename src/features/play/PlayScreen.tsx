import { router, useLocalSearchParams } from 'expo-router';

import { gamesHref } from '@/features/shared/routes';
import { EmptyState, Screen, TopBar } from '@/ui';

/** Placeholder until Play is built. */
export default function PlayScreen() {
  useLocalSearchParams<{ gameId: string }>();
  return (
    <Screen topBar={<TopBar backLabel="Games" backIcon="chevronLeft" onBack={() => router.dismissTo(gamesHref)} />}>
      <EmptyState icon="info" title="Play" description="This screen is not built yet." />
    </Screen>
  );
}
