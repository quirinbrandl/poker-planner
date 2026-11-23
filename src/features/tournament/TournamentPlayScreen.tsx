import { router } from 'expo-router';

import { useWorkspace } from '@/features/game/useWorkspace';
import { playerHref } from '@/features/shared/routes';
import { useGameManagement, useTournamentPlay } from '@/state';
import { Screen, useToast } from '@/ui';

import { actionResult } from './actionResult';
import { TournamentPlay } from './TournamentPlay';

/** Tournament Play (layout B · Standings) of an In progress game. */
export function TournamentPlayScreen({ gameId }: { gameId: string }) {
  const app = useGameManagement();
  const workspace = useWorkspace(gameId);
  const view = useTournamentPlay(gameId);
  const toast = useToast();
  if (!workspace || !view) return <Screen />;

  const stillIn = view.stillIn?.players.map((p) => p.playerId) ?? [];
  return (
    <>
      <TournamentPlay
        data={{ ...view, frame: { context: workspace.context, backLabel: workspace.backLabel } }}
        onSelectTab={workspace.onSelectTab}
        onBack={workspace.onBack}
        onMore={workspace.onMore}
        onRecordElimination={async (playerId) => actionResult(await app.play.recordElimination(gameId, playerId))}
        onRecordSameHand={async (bestFirst) => actionResult(await app.play.recordSameHand(gameId, { bestFirst, stillIn }))}
        onRejected={(message) => toast.show(message, { tone: 'error' })}
        onOpenPlayer={(playerId) => router.push(playerHref(gameId, playerId))}
        // later task: tournament rebuys (ticket 27).
        onRebuy={() => undefined}
        // later task: tournament late entry (ticket 27).
        onAddPlayer={() => undefined}
        // later task: the bank and reserve view.
        onOpenBank={() => undefined}
      />
      {workspace.actions}
    </>
  );
}
