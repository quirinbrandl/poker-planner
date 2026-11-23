import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { useWorkspace } from '@/features/game/useWorkspace';
import { addPlayerHref, countHref, playerHref } from '@/features/shared/routes';
import type { IssueFeedback, RebuyAcceptance, RebuyPopupData } from '@/game-management';
import { useBankReserve, useGameManagement, usePlayScreen } from '@/state';
import { Screen, useToast } from '@/ui';

import { BankReserveView } from './BankReserveView';
import { useIssueFeedback } from './issueFeedback';
import { PlayView } from './PlayView';
import { useSubViewBack } from './useSubViewBack';

/** The open rebuy popup and what confirming it issues (`null` for a blocked request). */
interface OpenRebuy {
  popup: RebuyPopupData;
  acceptance: RebuyAcceptance | null;
}

/** Play of an In progress cash game: the roster, rebuys with their popup, and Bank & reserve. */
export function CashPlayScreen({ gameId }: { gameId: string }) {
  const app = useGameManagement();
  const workspace = useWorkspace(gameId);
  const screen = usePlayScreen(gameId);
  const bank = useBankReserve(gameId);
  const toast = useToast();
  const [view, setView] = useState<'play' | 'bank'>('play');
  const [rebuy, setRebuy] = useState<OpenRebuy | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<IssueFeedback | null>(null);

  const backToPlay = useCallback(() => setView('play'), []);
  useSubViewBack(view === 'bank', backToPlay);
  useIssueFeedback(gameId, setFeedback);

  if (!workspace || !screen || !bank) return <Screen>{workspace?.actions}</Screen>;

  const openRebuy = (participantId: string) => {
    setFeedback(null);
    const result = app.play.proposeRebuy(gameId, participantId);
    if (result.status === 'needsConfirmation') {
      setRebuy({ popup: result.confirmation.popup, acceptance: result.confirmation.acceptance });
    } else if ('blocked' in result) {
      setRebuy({ popup: result.blocked, acceptance: null });
    } else {
      toast.show(result.reason.message, { tone: 'error' });
    }
  };

  const confirmRebuy = async () => {
    if (!rebuy?.acceptance) return;
    setBusy(true);
    const result = await app.play.issueRebuy(gameId, rebuy.acceptance);
    setBusy(false);
    setRebuy(null);
    if (result.status === 'accepted') {
      setFeedback(result.feedback);
      return;
    }
    toast.show(result.reason.message, { tone: 'error' });
    // A changed bank needs a fresh review, never a silent substitute.
    if (result.reason.code === 'proposalChanged') openRebuy(rebuy.acceptance.participantId);
  };

  if (view === 'bank') {
    return (
      <>
        <BankReserveView
          data={{ ...bank, context: workspace.context }}
          backLabel="Back to Play"
          onBack={backToPlay}
          onMore={workspace.onMore}
        />
        {workspace.actions}
      </>
    );
  }

  return (
    <>
      <PlayView
        data={{ ...screen, context: workspace.context, backLabel: workspace.backLabel }}
        feedback={feedback}
        rebuy={rebuy?.popup ?? null}
        rebuyBusy={busy}
        onRebuy={openRebuy}
        onConfirmRebuy={() => void confirmRebuy()}
        onCancelRebuy={() => {
          setRebuy(null);
          toast.show('No rebuy issued');
        }}
        onResult={(participantId) => router.push(countHref(gameId, participantId))}
        onOpenPlayer={(participantId) => router.push(playerHref(gameId, participantId))}
        onAddPlayer={() => {
          setFeedback(null);
          router.push(addPlayerHref(gameId));
        }}
        onViewBank={() => {
          setRebuy(null);
          setView('bank');
        }}
        onSelectTab={workspace.onSelectTab}
        onBack={workspace.onBack}
        onMore={workspace.onMore}
      />
      {workspace.actions}
    </>
  );
}
