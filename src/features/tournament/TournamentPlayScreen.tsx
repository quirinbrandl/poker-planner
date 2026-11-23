import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { useWorkspace } from '@/features/game/useWorkspace';
import { BankReserveView } from '@/features/play/BankReserveView';
import { useIssueFeedback } from '@/features/play/issueFeedback';
import { RebuyDialog } from '@/features/play/RebuyDialog';
import { useSubViewBack } from '@/features/play/useSubViewBack';
import { addPlayerHref, playerHref } from '@/features/shared/routes';
import type { IssueFeedback, RebuyAcceptance, RebuyPopupData } from '@/game-management';
import { useBankReserve, useGameManagement, useTournamentPlay } from '@/state';
import { Screen, useToast } from '@/ui';

import { actionResult } from './actionResult';
import { TournamentPlay } from './TournamentPlay';

/** The open rebuy popup and what confirming it issues (`null` for a blocked request). */
interface OpenRebuy {
  popup: RebuyPopupData;
  acceptance: RebuyAcceptance | null;
}

/**
 * Tournament Play (layout B · Standings) of an In progress game: eliminations, rebuys with the
 * shared rebuy popup, late entry (Add player) and Bank & reserve in place.
 */
export function TournamentPlayScreen({ gameId }: { gameId: string }) {
  const app = useGameManagement();
  const workspace = useWorkspace(gameId);
  const view = useTournamentPlay(gameId);
  const bank = useBankReserve(gameId);
  const toast = useToast();
  const [showBank, setShowBank] = useState(false);
  const [rebuy, setRebuy] = useState<OpenRebuy | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<IssueFeedback | null>(null);

  const backToPlay = useCallback(() => setShowBank(false), []);
  useSubViewBack(showBank, backToPlay);
  useIssueFeedback(gameId, setFeedback);

  if (!workspace || !view) return <Screen>{workspace?.actions}</Screen>;

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
    if (!rebuy?.acceptance || busy) return;
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

  if (showBank && bank) {
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

  const stillIn = view.stillIn?.players.map((p) => p.playerId) ?? [];
  return (
    <>
      <TournamentPlay
        data={{ ...view, frame: { context: workspace.context, backLabel: workspace.backLabel } }}
        feedback={feedback}
        onSelectTab={workspace.onSelectTab}
        onBack={workspace.onBack}
        onMore={workspace.onMore}
        onRecordElimination={async (playerId) => {
          setFeedback(null);
          return actionResult(await app.play.recordElimination(gameId, playerId));
        }}
        onRecordSameHand={async (bestFirst) => {
          setFeedback(null);
          return actionResult(await app.play.recordSameHand(gameId, { bestFirst, stillIn }));
        }}
        onRejected={(message) => toast.show(message, { tone: 'error' })}
        onOpenPlayer={(playerId) => router.push(playerHref(gameId, playerId))}
        onRebuy={openRebuy}
        onAddPlayer={() => {
          setFeedback(null);
          router.push(addPlayerHref(gameId));
        }}
        onOpenBank={() => {
          setRebuy(null);
          setShowBank(true);
        }}
      />
      <RebuyDialog
        rebuy={rebuy?.popup ?? null}
        busy={busy}
        onConfirm={() => void confirmRebuy()}
        onCancel={() => {
          setRebuy(null);
          toast.show('No rebuy issued');
        }}
        onViewBank={() => {
          setRebuy(null);
          setShowBank(true);
        }}
      />
      {workspace.actions}
    </>
  );
}
