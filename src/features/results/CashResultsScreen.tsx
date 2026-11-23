import { type Href, router } from 'expo-router';

import { countHref, playerHref } from '@/features/shared/routes';
import { useWorkspace } from '@/features/game/useWorkspace';
import { useCashResults } from '@/state';
import { Screen } from '@/ui';

import { ResultsView } from './ResultsView';

/** Cash-game Results tab, connected to game management. */
export function CashResultsScreen({ gameId }: { gameId: string; participantId?: string }) {
  const workspace = useWorkspace(gameId);
  const results = useCashResults(gameId);
  if (!workspace || !results) return <Screen />;

  return (
    <>
      <ResultsView
        data={{
          phase: workspace.phase,
          context: workspace.context,
          backLabel: workspace.backLabel,
          reopened: false,
          status: results.status,
          players: results.players,
        }}
        onSelectTab={workspace.onSelectTab}
        onBack={workspace.onBack}
        onMore={workspace.onMore}
        onOpenPlayer={(participantId) => router.push(`${String(playerHref(gameId, participantId))}?from=results` as Href)}
        onCount={(participantId) => router.push(countHref(gameId, participantId))}
        // later task: Calculate Payments (#24). Only reachable when everything adds up.
        onCalculatePayments={() => undefined}
      />
      {workspace.actions}
    </>
  );
}
