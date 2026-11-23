import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';

import { GameActionsSheet } from '@/features/game/GameActionsSheet';
import { formatShortDateTime, modeLabel } from '@/features/shared/format';
import { resultsHref } from '@/features/shared/routes';
import { useCountEditor, useGame, useGameManagement } from '@/state';
import { Screen, useToast } from '@/ui';

import { CountEditor } from './CountEditor';
import type { ConfirmOutcome, CountReviewOutcome } from './types';

/** Route screen: the final chip count editor of one cash-game player, connected to game management. */
export default function CountScreen() {
  const { gameId, participantId } = useLocalSearchParams<{ gameId: string; participantId: string }>();
  const app = useGameManagement();
  const toast = useToast();
  const game = useGame(gameId);
  // After a failed review the missing and invalid quantities stay marked while the host fixes them.
  const [reviewed, setReviewed] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  // The quantities the open confirmation shows: Confirm records exactly these or nothing.
  const shown = useRef<readonly number[]>([]);
  const editor = useCountEditor(gameId, participantId, reviewed);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace(resultsHref(gameId));
  };

  if (!game || !editor) return <Screen />;

  const review = async (): Promise<CountReviewOutcome> => {
    const result = app.play.reviewCount(gameId, participantId);
    switch (result.status) {
      case 'needsConfirmation':
        shown.current = result.confirmation.mix.map((chip) => chip.count);
        return { kind: 'confirm', confirmation: result.confirmation };
      case 'needsCorrection':
        setReviewed(true);
        return { kind: 'needsCorrection', firstDenominationValue: result.firstDenominationValue };
      case 'blocked':
        return { kind: 'blocked', blocked: result.blocked };
      case 'rejected':
        toast.show(result.reason.message, { tone: 'error' });
        return { kind: 'handled' };
    }
  };

  const confirm = async (): Promise<ConfirmOutcome> => {
    const result = await app.play.confirmResult(gameId, participantId, { counts: shown.current });
    switch (result.status) {
      case 'accepted':
        leave();
        toast.show('Result confirmed', { tone: 'confirmed' });
        return { kind: 'accepted' };
      case 'blocked':
        return { kind: 'blocked', blocked: result.blocked };
      case 'rejected':
        toast.show(result.reason.message, { tone: 'error' });
        return { kind: 'rejected' };
    }
  };

  return (
    <>
      <CountEditor
        data={{
          playerName: editor.playerName,
          context: `${modeLabel(game.mode)} · ${formatShortDateTime(game.createdAt)}`,
          kind: editor.kind,
          entries: editor.entries,
          totals: editor.totals,
          problem: editor.problem,
        }}
        onChangeQuantity={(value, text) => void app.play.setCountText(gameId, participantId, value, text)}
        onSetRemainingToZero={() => void app.play.setRemainingCountToZero(gameId, participantId)}
        onLeave={leave}
        onMore={() => setActionsOpen(true)}
        onReview={review}
        onConfirm={confirm}
      />
      <GameActionsSheet gameId={gameId} visible={actionsOpen} onClose={() => setActionsOpen(false)} />
    </>
  );
}
