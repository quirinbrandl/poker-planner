import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { formatShortDateTime, modeLabel } from '@/features/shared/format';
import { resultsHref } from '@/features/shared/routes';
import { useGame, useGameManagement, useOrderEditor } from '@/state';
import { Screen, useToast } from '@/ui';

import { actionResult } from './actionResult';
import { OrderEditor } from './OrderEditor';

function leave(gameId: string) {
  if (router.canGoBack()) router.back();
  else router.replace(resultsHref(gameId));
}

/**
 * Route screen: the finishing-order editor, pushed from Results. The draft lives here only: leaving
 * discards it; Save order stores it in one step.
 */
export default function OrderScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const app = useGameManagement();
  const game = useGame(gameId);
  const toast = useToast();
  const [draft, setDraft] = useState(() => app.play.startOrderDraft(gameId));
  const view = useOrderEditor(draft);
  if (!game || !draft || !view) return <Screen />;

  return (
    <OrderEditor
      data={{ ...view, context: `${modeLabel(game.mode)} · ${formatShortDateTime(game.createdAt)}` }}
      onMoveUp={(id) => setDraft((d) => d && app.play.moveUpInOrderDraft(d, id))}
      onMoveDown={(id) => setDraft((d) => d && app.play.moveDownInOrderDraft(d, id))}
      onUndoElimination={(id) => setDraft((d) => d && app.play.undoInOrderDraft(d, id))}
      onAddMissed={(choice) => setDraft((d) => d && app.play.addMissedToOrderDraft(d, choice))}
      onSave={async () => {
        const result = actionResult(await app.play.saveOrder(draft));
        if (result.status === 'accepted') {
          toast.show('Order saved', { tone: 'confirmed' });
          leave(gameId);
        }
        return result;
      }}
      onDiscard={() => leave(gameId)}
      onRejected={(message) => toast.show(message, { tone: 'error' })}
    />
  );
}
