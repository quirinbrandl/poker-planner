import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import type { ConfirmOutcome } from '@/features/count/types';
import { GameActionsSheet } from '@/features/game/GameActionsSheet';
import { workspaceContext } from '@/features/game/useWorkspace';
import { RebuyDialog } from '@/features/play/RebuyDialog';
import { useRebuyPopup } from '@/features/play/useRebuyPopup';
import { countHref, fixHref, paymentsHref, playHref, rebuyMixHref, resultsHref } from '@/features/shared/routes';
import { useCashPlayer, useGame, useGameManagement, usePlayerBuyIns } from '@/state';
import { Screen, useToast } from '@/ui';

import { PlayerPage } from './PlayerPage';

const BACK = {
  play: { label: 'Back to Play', href: playHref },
  results: { label: 'Back to Results', href: resultsHref },
  payments: { label: 'Back to Payments', href: paymentsHref },
} as const;

/**
 * The cash player page, connected to game management. Opened from Results with `?from=results`,
 * from Payments with `?from=payments` (otherwise from Play). Completed: read-only.
 */
export function CashPlayerScreen({ gameId, participantId = '' }: { gameId: string; participantId?: string }) {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const app = useGameManagement();
  const toast = useToast();
  const game = useGame(gameId);
  const player = useCashPlayer(gameId, participantId);
  const buyIns = usePlayerBuyIns(gameId, participantId);
  const rebuy = useRebuyPopup(gameId);
  const [actionsOpen, setActionsOpen] = useState(false);
  const origin = BACK[from === 'results' || from === 'payments' ? from : 'play'];

  if (!game || !player || !buyIns) return <Screen />;

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace(origin.href(gameId));
  };

  const undoRebuy = async (rebuyId: string): Promise<ConfirmOutcome> => {
    const result = await app.play.undoRebuy(gameId, rebuyId);
    if (result.status === 'accepted') {
      toast.show(result.feedback.title, { tone: 'confirmed' });
      return { kind: 'accepted' };
    }
    if (result.status === 'blocked') return { kind: 'blocked', blocked: result.blocked };
    toast.show(result.reason.message, { tone: 'error' });
    return { kind: 'rejected' };
  };

  const returnToPlay = async (): Promise<ConfirmOutcome> => {
    const result = await app.play.returnToPlay(gameId, participantId);
    switch (result.status) {
      case 'accepted':
        toast.show('Back in the game', { tone: 'confirmed' });
        return { kind: 'accepted' };
      case 'blocked':
        return { kind: 'blocked', blocked: result.blocked };
      case 'dependent':
        router.push(fixHref(gameId, result.fix));
        return { kind: 'rejected' };
      case 'rejected':
        toast.show(result.reason.message, { tone: 'error' });
        return { kind: 'rejected' };
    }
  };

  return (
    <>
      <PlayerPage
        data={{
          phase: player.phase,
          context: workspaceContext(game),
          playerId: player.playerId,
          name: player.name,
          backLabel: origin.label,
          result: player.result,
          countDraft: player.countDraft,
          buyInsTotalText: buyIns.buyInsTotalText,
          buyIns: buyIns.buyIns,
          returnToPlay: player.returnToPlay,
        }}
        onBack={back}
        onMore={() => setActionsOpen(true)}
        onCountFinalChips={() => {
          if (player.actions.countFinalChips) router.push(countHref(gameId, participantId));
        }}
        onRebuy={() => {
          if (buyIns.actions.rebuy) rebuy.request(participantId);
        }}
        onCorrectResult={() => router.push(countHref(gameId, participantId))}
        onCorrectMix={(rebuyId) => router.push(rebuyMixHref(gameId, participantId, rebuyId))}
        onAddForgottenRebuy={() => {
          if (buyIns.actions.addForgottenRebuy) router.push(rebuyMixHref(gameId, participantId));
        }}
        onUndoRebuy={undoRebuy}
        onReturnToPlay={returnToPlay}
      />
      <RebuyDialog
        rebuy={rebuy.popup}
        busy={rebuy.busy}
        onConfirm={rebuy.confirm}
        onCancel={rebuy.cancel}
        onViewBank={() => {
          rebuy.close();
          router.push(playHref(gameId));
        }}
      />
      <GameActionsSheet gameId={gameId} visible={actionsOpen} onClose={() => setActionsOpen(false)} />
    </>
  );
}
