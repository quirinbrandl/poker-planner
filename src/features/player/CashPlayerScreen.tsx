import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { GameActionsSheet } from '@/features/game/GameActionsSheet';
import { formatShortDateTime, modeLabel } from '@/features/shared/format';
import { countHref, playHref, resultsHref } from '@/features/shared/routes';
import { useCashPlayer, useGame } from '@/state';
import { Screen } from '@/ui';

import { PlayerPage } from './PlayerPage';

const NOT_YET = Promise.resolve({ kind: 'rejected' } as const);

/** The cash player page, connected to game management. Opened from Results with `?from=results`. */
export function CashPlayerScreen({ gameId, participantId = '' }: { gameId: string; participantId?: string }) {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const game = useGame(gameId);
  const player = useCashPlayer(gameId, participantId);
  const [actionsOpen, setActionsOpen] = useState(false);
  const fromResults = from === 'results';

  if (!game || !player) return <Screen />;

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace(fromResults ? resultsHref(gameId) : playHref(gameId));
  };

  return (
    <>
      <PlayerPage
        data={{
          phase: 'inProgress',
          context: `${modeLabel(game.mode)} · ${formatShortDateTime(game.createdAt)}`,
          playerId: player.playerId,
          name: player.name,
          backLabel: fromResults ? 'Back to Results' : 'Back to Play',
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
