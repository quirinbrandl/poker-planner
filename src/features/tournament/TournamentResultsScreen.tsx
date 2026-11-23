import { router } from 'expo-router';
import { useState } from 'react';

import { GAME_TOASTS } from '@/features/game/actions/texts';
import { useWorkspace } from '@/features/game/useWorkspace';
import { CalculatePaymentsDialog } from '@/features/payments/CalculatePaymentsDialog';
import { orderHref, paymentsHref, playerHref } from '@/features/shared/routes';
import type { CalculatePaymentsConfirmation } from '@/game-management';
import { useGameManagement, useTournamentResults } from '@/state';
import { Screen, useToast } from '@/ui';

import { TournamentResults } from './TournamentResults';

/**
 * Tournament Results: status, finishing order, Edit order and Calculate Payments… (In progress);
 * the read-only finishing order of a Completed tournament.
 */
export function TournamentResultsScreen({ gameId }: { gameId: string }) {
  const app = useGameManagement();
  const toast = useToast();
  const workspace = useWorkspace(gameId);
  const view = useTournamentResults(gameId);
  const [calculate, setCalculate] = useState<CalculatePaymentsConfirmation | null>(null);
  const [busy, setBusy] = useState(false);
  if (!workspace || !view) return <Screen>{workspace?.actions}</Screen>;

  const openCalculate = async () => {
    const result = await app.play.calculatePayments(gameId);
    if (result.status === 'needsConfirmation') setCalculate(result.confirmation);
    else if (result.status === 'rejected') toast.show(result.reason.message, { tone: 'error' });
  };

  const confirmCalculate = async () => {
    setBusy(true);
    const result = await app.play.calculatePayments(gameId, { confirmed: true });
    setBusy(false);
    setCalculate(null);
    if (result.status === 'accepted') {
      router.replace(paymentsHref(gameId, workspace.from));
      toast.show(GAME_TOASTS.finished, { tone: 'confirmed' });
    } else if (result.status === 'rejected') toast.show(result.reason.message, { tone: 'error' });
  };

  return (
    <>
      <TournamentResults
        data={{ ...view, frame: { context: workspace.context, backLabel: workspace.backLabel } }}
        onSelectTab={workspace.onSelectTab}
        onBack={workspace.onBack}
        onMore={workspace.onMore}
        onEditOrder={() => router.push(orderHref(gameId))}
        onOpenPlayer={(playerId) => router.push(playerHref(gameId, playerId))}
        onCalculatePayments={() => void openCalculate()}
      />
      {calculate ? (
        <CalculatePaymentsDialog
          visible
          data={calculate}
          busy={busy}
          onConfirm={() => void confirmCalculate()}
          onCancel={() => setCalculate(null)}
        />
      ) : null}
      {workspace.actions}
    </>
  );
}
