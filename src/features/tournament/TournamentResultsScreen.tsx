import { router } from 'expo-router';

import { useWorkspace } from '@/features/game/useWorkspace';
import { orderHref, playerHref } from '@/features/shared/routes';
import { useTournamentResults } from '@/state';
import { Screen } from '@/ui';

import { TournamentResults } from './TournamentResults';

/** Tournament Results of an In progress game: status, finishing order, Edit order. */
export function TournamentResultsScreen({ gameId }: { gameId: string }) {
  const workspace = useWorkspace(gameId);
  const view = useTournamentResults(gameId);
  if (!workspace || !view) return <Screen />;

  return (
    <>
      <TournamentResults
        data={{ ...view, frame: { context: workspace.context, backLabel: workspace.backLabel } }}
        onSelectTab={workspace.onSelectTab}
        onBack={workspace.onBack}
        onMore={workspace.onMore}
        onEditOrder={() => router.push(orderHref(gameId))}
        onOpenPlayer={(playerId) => router.push(playerHref(gameId, playerId))}
        // later task: Calculate Payments (ticket 28).
        onCalculatePayments={() => undefined}
      />
      {workspace.actions}
    </>
  );
}
