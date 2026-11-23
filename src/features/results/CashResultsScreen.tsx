import { type Href, router } from 'expo-router';
import { useState } from 'react';

import { GAME_TOASTS } from '@/features/game/actions/texts';
import { useWorkspace } from '@/features/game/useWorkspace';
import { CalculatePaymentsDialog } from '@/features/payments/CalculatePaymentsDialog';
import { countHref, paymentsHref, playerHref } from '@/features/shared/routes';
import type { CalculatePaymentsConfirmation } from '@/game-management';
import { useCashResults, useGameManagement } from '@/state';
import { Screen, useToast } from '@/ui';

import { ResultsView } from './ResultsView';

/** Cash-game Results tab, connected to game management. Completed: read-only. */
export function CashResultsScreen({ gameId }: { gameId: string; participantId?: string }) {
  const app = useGameManagement();
  const toast = useToast();
  const workspace = useWorkspace(gameId);
  const results = useCashResults(gameId);
  const [calculate, setCalculate] = useState<CalculatePaymentsConfirmation | null>(null);
  const [busy, setBusy] = useState(false);
  if (!workspace || !results) return <Screen />;

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
      <ResultsView
        data={{
          phase: results.phase,
          context: workspace.context,
          backLabel: workspace.backLabel,
          reopened: results.reopened,
          status: results.status,
          players: results.players,
        }}
        onSelectTab={workspace.onSelectTab}
        onBack={workspace.onBack}
        onMore={workspace.onMore}
        onOpenPlayer={(participantId) => router.push(`${String(playerHref(gameId, participantId))}?from=results` as Href)}
        onCount={(participantId) => router.push(countHref(gameId, participantId))}
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
