import { router } from 'expo-router';

import { gamesHref } from '@/features/shared/routes';
import { EmptyState, Screen, TopBar } from '@/ui';

/** Stands in for a workspace screen until it is connected to game management. */
export function NotBuilt({ title }: { title: string }) {
  return (
    <Screen topBar={<TopBar backLabel="Games" onBack={() => router.dismissTo(gamesHref)} />}>
      <EmptyState icon="info" title={title} description="This screen is not built yet." />
    </Screen>
  );
}
