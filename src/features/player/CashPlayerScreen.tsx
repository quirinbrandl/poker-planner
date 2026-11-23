import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { GameActionsSheet } from '@/features/game/GameActionsSheet';
import { workspaceContext } from '@/features/game/useWorkspace';
import { countHref, paymentsHref, playHref, resultsHref } from '@/features/shared/routes';
import { useCashPlayer, useGame } from '@/state';
import { Screen } from '@/ui';

import { PlayerPage } from './PlayerPage';

const NOT_YET = Promise.resolve({ kind: 'rejected' } as const);

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
  const game = useGame(gameId);
  const player = useCashPlayer(gameId, participantId);
  const [actionsOpen, setActionsOpen] = useState(false);
  const origin = BACK[from === 'results' || from === 'payments' ? from : 'play'];

  if (!game || !player) return <Screen />;

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace(origin.href(gameId));
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
          buyInsTotalText: player.buyInsTotalText,
          buyIns: player.buyIns,
          returnToPlay: player.returnToPlay,
        }}
        onBack={back}
        onMore={() => setActionsOpen(true)}
        onCountFinalChips={() => {
          if (player.actions.countFinalChips) router.push(countHref(gameId, participantId));
        }}
        // later task: the rebuy popup on the player page (#19).
        onRebuy={() => undefined}
        // later task: correcting a confirmed result (#22).
        onCorrectResult={() => undefined}
        // later task: Correct mix (#23).
        onCorrectMix={() => undefined}
        // later task: Add forgotten rebuy (#23).
        onAddForgottenRebuy={() => undefined}
        // later task: Undo rebuy (#22). Its popup never opens while `undo` is null.
        onUndoRebuy={() => NOT_YET}
        // later task: Return to play (#22). Hidden while `returnToPlay` is null.
        onReturnToPlay={() => NOT_YET}
      />
      <GameActionsSheet gameId={gameId} visible={actionsOpen} onClose={() => setActionsOpen(false)} />
    </>
  );
}
