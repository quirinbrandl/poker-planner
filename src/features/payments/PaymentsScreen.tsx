import { type Href, router, useLocalSearchParams } from 'expo-router';

import { useWorkspace } from '@/features/game/useWorkspace';
import { playerHref } from '@/features/shared/routes';
import { usePayments } from '@/state';
import { Screen } from '@/ui';

import { PaymentsView } from './PaymentsView';

/** Route screen: a Completed game's Payments, connected to game management. Read-only. */
export default function PaymentsScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const workspace = useWorkspace(gameId);
  const payments = usePayments(gameId);
  if (!workspace || !payments) return <Screen />;

  return (
    <>
      <PaymentsView
        data={{ mode: payments.mode, context: workspace.context, summary: payments.summary, balances: payments.balances }}
        backLabel={workspace.backLabel}
        onBack={workspace.onBack}
        onMore={workspace.onMore}
        onSelectTab={workspace.onSelectTab}
        onOpenPlayer={(participantId) => router.push(`${String(playerHref(gameId, participantId))}?from=payments` as Href)}
      />
      {workspace.actions}
    </>
  );
}
