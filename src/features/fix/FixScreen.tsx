import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import type { BlockedMixData, ConfirmOutcome } from '@/features/count/types';
import { GameActionsSheet } from '@/features/game/GameActionsSheet';
import { RebuyDialog } from '@/features/play/RebuyDialog';
import { useRebuyPopup } from '@/features/play/useRebuyPopup';
import { formatShortDateTime, modeLabel } from '@/features/shared/format';
import { countHref, playerHref, playHref } from '@/features/shared/routes';
import { useFix, useGame, useGameManagement } from '@/state';
import { Screen, useToast } from '@/ui';

import { FixPage } from './FixPage';
import type { FixStart } from './types';

type StepResult = { status: 'accepted' } | { status: 'blocked'; blocked: BlockedMixData } | { status: 'rejected'; reason: { message: string } };

/**
 * Route screen: "Fix <name>’s count / result", one step at a time. Opened with `participantId` and
 * `target` from a `dependent` answer (step 1, nothing recorded yet), or without them to continue
 * the recorded fix. Every step is its own confirmed operation in game management.
 */
export default function FixScreen() {
  const params = useLocalSearchParams<{ gameId: string; participantId?: string; target?: string }>();
  const { gameId } = params;
  const start = useMemo<FixStart | null>(
    () =>
      params.participantId && (params.target === 'count' || params.target === 'result')
        ? { participantId: params.participantId, target: params.target }
        : null,
    [params.participantId, params.target],
  );
  const app = useGameManagement();
  const toast = useToast();
  const game = useGame(gameId);
  const fix = useFix(gameId, start);
  const rebuy = useRebuyPopup(gameId);
  const [actionsOpen, setActionsOpen] = useState(false);

  if (!game || !fix) return <Screen />;

  const toPlay = () => router.replace(playHref(gameId));
  const leave = () => {
    // A finished fix is forgotten when the host leaves it; an unfinished one stays for Play.
    if (fix.step === 'done') void app.play.finishFix(gameId);
    toPlay();
  };

  const outcome = (result: StepResult, accepted: string): ConfirmOutcome => {
    if (result.status === 'accepted') {
      toast.show(accepted, { tone: 'confirmed' });
      return { kind: 'accepted' };
    }
    if (result.status === 'blocked') return { kind: 'blocked', blocked: result.blocked };
    toast.show(result.reason.message, { tone: 'error' });
    return { kind: 'rejected' };
  };

  return (
    <>
      <FixPage
        data={{ ...fix, context: `${modeLabel(game.mode)} · ${formatShortDateTime(game.createdAt)}` }}
        onBack={leave}
        onMore={() => setActionsOpen(true)}
        onUndo={async () => {
          if (!fix.start) return { kind: 'rejected' };
          return outcome(await app.play.undoFixBlocker(gameId, fix.start, fix.undo.rebuyId), 'Rebuy undone');
        }}
        onBackToCount={() => {
          if (router.canGoBack()) router.back();
          else router.replace(fix.target === 'count' ? countHref(gameId, fix.participantId) : playerHref(gameId, fix.participantId));
        }}
        onSave={async () => {
          const counts = fix.correction?.mix.map((chip) => chip.count);
          return outcome(
            await app.play.saveFixStep(gameId, counts ? { counts } : {}),
            fix.target === 'count' ? 'Result replaced' : 'Back in the game',
          );
        }}
        onEditCount={() => router.push(countHref(gameId, fix.participantId))}
        onReviewNewRebuy={() => rebuy.request(fix.newRebuy.participantId)}
        onFinish={leave}
      />
      <RebuyDialog
        rebuy={rebuy.popup}
        busy={rebuy.busy}
        note={fix.newRebuy.note}
        onConfirm={rebuy.confirm}
        onCancel={rebuy.cancel}
        onViewBank={() => {
          rebuy.close();
          router.push(playHref(gameId));
        }}
      />
      <GameActionsSheet gameId={gameId} visible={actionsOpen} onClose={() => setActionsOpen(false)} />
    </>
  );
}
