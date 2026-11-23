import { router } from 'expo-router';
import { useState } from 'react';

import type { ConfirmOutcome } from '@/features/count/types';
import { RebuyDialog } from '@/features/play/RebuyDialog';
import { useRebuyPopup } from '@/features/play/useRebuyPopup';
import { PlayerPage } from '@/features/player/PlayerPage';
import { formatShortDateTime, modeLabel } from '@/features/shared/format';
import { playHref, rebuyMixHref } from '@/features/shared/routes';
import { useGame, useGameManagement, usePlayerBuyIns, useTournamentPlayer } from '@/state';
import { Screen, useToast } from '@/ui';

import { BackInButton, BackInDialog, TournamentResultCard } from './PlayerSections';
import { useOperation } from './useOperation';

const rejectedOutcome = async () => ({ kind: 'rejected' as const });

/**
 * The player page of a tournament player: the shared page with the place card, Back in the game,
 * the rebuy popup for a player still in, and the rebuy records (Undo, Correct mix, forgotten
 * rebuys, also for an eliminated player without touching the elimination). No chip counts.
 */
export function TournamentPlayerScreen({ gameId, participantId = '' }: { gameId: string; participantId?: string }) {
  const app = useGameManagement();
  const game = useGame(gameId);
  const view = useTournamentPlayer(gameId, participantId);
  const buyIns = usePlayerBuyIns(gameId, participantId);
  const rebuy = useRebuyPopup(gameId);
  const toast = useToast();
  const [backInOpen, setBackInOpen] = useState(false);
  const operation = useOperation((message) => toast.show(message, { tone: 'error' }));
  if (!game || !view || !buyIns) return <Screen />;

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

  const { backIn } = view;
  return (
    <>
      <PlayerPage
        data={{
          phase: view.phase,
          context: `${modeLabel(game.mode)} · ${formatShortDateTime(game.createdAt)}`,
          playerId: view.playerId,
          name: view.name,
          backLabel: 'Back',
          result: null,
          countDraft: false,
          buyInsTotalText: buyIns.buyInsTotalText,
          buyIns: buyIns.buyIns,
          returnToPlay: null,
        }}
        onBack={() => router.back()}
        summaryExtra={view.result ? <TournamentResultCard result={view.result} /> : null}
        sectionsExtra={backIn ? <BackInButton name={view.name} onPress={() => setBackInOpen(true)} /> : null}
        // Tournaments have no chip counts; + Rebuy only for a player still in.
        playing={{ statusText: null, count: false, rebuy: buyIns.actions.rebuy && view.status === 'stillIn' }}
        // Cash games only: an eliminated player returns through Back in the game.
        onCountFinalChips={() => undefined}
        onCorrectResult={() => undefined}
        onReturnToPlay={rejectedOutcome}
        onRebuy={() => rebuy.request(participantId)}
        onCorrectMix={(rebuyId) => router.push(rebuyMixHref(gameId, participantId, rebuyId))}
        onAddForgottenRebuy={() => {
          if (buyIns.actions.addForgottenRebuy) router.push(rebuyMixHref(gameId, participantId));
        }}
        onUndoRebuy={undoRebuy}
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
      {backIn ? (
        <BackInDialog
          visible={backInOpen}
          data={backIn}
          busy={operation.pending}
          onCancel={() => {
            if (!operation.isRunning()) setBackInOpen(false);
          }}
          onConfirm={() =>
            void operation.run(async () => {
              const result = await app.play.backInTheGame(gameId, participantId, { confirmed: true });
              if (result.status === 'accepted') {
                toast.show(`${backIn.name} is back in the game`, { tone: 'confirmed' });
                return { status: 'accepted' };
              }
              return { status: 'rejected', message: result.status === 'rejected' ? result.reason.message : '' };
            }, () => setBackInOpen(false))
          }
        />
      ) : null}
    </>
  );
}
