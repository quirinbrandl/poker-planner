import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import type { ConfirmOutcome } from '@/features/count/types';
import { GameActionsSheet } from '@/features/game/GameActionsSheet';
import { formatShortDateTime, modeLabel } from '@/features/shared/format';
import { playerHref } from '@/features/shared/routes';
import { useGame, useGameManagement, useRebuyMixEditor } from '@/state';
import { Screen, useToast } from '@/ui';

import { RebuyMixEditor } from './RebuyMixEditor';
import type { MixAcceptance, MixReviewOutcome } from './types';

/**
 * Route screen: Add forgotten rebuy (no `rebuyId`) or Correct mix of one recorded rebuy. The typed
 * quantities live here until they are recorded; Cancel or Back records nothing.
 */
export default function RebuyMixScreen() {
  const { gameId, participantId, rebuyId } = useLocalSearchParams<{ gameId: string; participantId: string; rebuyId?: string }>();
  const app = useGameManagement();
  const toast = useToast();
  const game = useGame(gameId);
  // `null` until the host types: the editor then shows its starting quantities.
  const [texts, setTexts] = useState<readonly string[] | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  // The mix the open confirmation shows: recording takes exactly these quantities.
  const [shown, setShown] = useState<readonly number[]>([]);
  const editor = useRebuyMixEditor(gameId, participantId, { rebuyId, texts, showErrors: reviewed });

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace(playerHref(gameId, participantId));
  };

  if (!game || !editor) return <Screen />;
  const current = editor.entries.map((entry) => entry.quantityText);
  const target = rebuyId ? { rebuyId } : {};

  const review = async (): Promise<MixReviewOutcome> => {
    const result = app.play.reviewRebuyMix(gameId, participantId, { ...target, texts: current });
    switch (result.status) {
      case 'needsConfirmation':
        setShown(result.confirmation.mix.map((chip) => chip.count));
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

  const confirm = async (acceptance: MixAcceptance): Promise<ConfirmOutcome> => {
    const result = await app.play.recordRebuyMix(gameId, participantId, { ...target, counts: shown, acceptedWarnings: acceptance.acceptedWarnings });
    switch (result.status) {
      case 'accepted':
        leave();
        toast.show(result.feedback.title, { tone: 'confirmed' });
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
      <RebuyMixEditor
        data={{ ...editor, context: `${modeLabel(game.mode)} · ${formatShortDateTime(game.createdAt)}` }}
        onChangeQuantity={(value, text) =>
          setTexts(editor.entries.map((entry) => (entry.value === value ? text : entry.quantityText)))
        }
        onSetRemainingToZero={() => setTexts(current.map((text) => (text === '' ? '0' : text)))}
        onLeave={leave}
        onMore={() => setActionsOpen(true)}
        onReview={review}
        onConfirm={confirm}
      />
      <GameActionsSheet gameId={gameId} visible={actionsOpen} onClose={() => setActionsOpen(false)} />
    </>
  );
}
