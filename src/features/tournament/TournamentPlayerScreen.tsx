import { router } from 'expo-router';
import { useState } from 'react';

import { PlayerPage } from '@/features/player/PlayerPage';
import { formatShortDateTime, modeLabel } from '@/features/shared/format';
import { useGame, useGameManagement, useTournamentPlayer } from '@/state';
import { Screen, useToast } from '@/ui';

import { BackInButton, BackInDialog, TournamentResultCard } from './PlayerSections';
import { useOperation } from './useOperation';

const rejectedOutcome = async () => ({ kind: 'rejected' as const });

/** The player page of a tournament player: the shared page with the place card and Back in the game. */
export function TournamentPlayerScreen({ gameId, participantId = '' }: { gameId: string; participantId?: string }) {
  const app = useGameManagement();
  const game = useGame(gameId);
  const view = useTournamentPlayer(gameId, participantId);
  const toast = useToast();
  const [backInOpen, setBackInOpen] = useState(false);
  const operation = useOperation((message) => toast.show(message, { tone: 'error' }));
  if (!game || !view) return <Screen />;

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
          buyInsTotalText: view.buyInsTotalText,
          buyIns: view.buyIns,
          returnToPlay: null,
        }}
        onBack={() => router.back()}
        summaryExtra={view.result ? <TournamentResultCard result={view.result} /> : null}
        sectionsExtra={backIn ? <BackInButton name={view.name} onPress={() => setBackInOpen(true)} /> : null}
        // Tournaments have no chip counts; the rebuy button comes with tournament rebuys (ticket 27).
        playing={{ statusText: null, count: false, rebuy: false }}
        // Cash games only.
        onCountFinalChips={() => undefined}
        onCorrectResult={() => undefined}
        onReturnToPlay={rejectedOutcome}
        // later task: tournament rebuys, forgotten rebuys and rebuy corrections (ticket 27).
        onRebuy={() => undefined}
        onCorrectMix={() => undefined}
        onAddForgottenRebuy={() => undefined}
        onUndoRebuy={rejectedOutcome}
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
