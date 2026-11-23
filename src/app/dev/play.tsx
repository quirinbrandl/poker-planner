/**
 * Development only: Play, the rebuy popup and Bank & reserve with fixture data (no game management).
 *   /dev/play?state=normal|exhausted|zero-target|joined|mixed|all-finished|feedback|bank|
 *     rebuy|rebuy-exhausted|rebuy-zero-target|rebuy-reduced|rebuy-zero|rebuy-impossible|
 *     rebuy-shortage|rebuy-tournament
 * Rebuy on any row opens that story's proposal; issuing resolves after a short delay.
 */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { BankReserveView } from '@/features/play/BankReserveView';
import {
  bankFixture,
  playFixture,
  type PlayStoryName,
  rebuyFixture,
  tournamentRebuyFixture,
} from '@/features/play/fixtures';
import { PlayView } from '@/features/play/PlayView';
import type { RebuyPopupData } from '@/features/play/types';
import { useToast } from '@/ui';

interface DevState {
  story: PlayStoryName;
  view: 'play' | 'bank';
  popupFor?: string;
  tournament?: boolean;
  feedback?: boolean;
}

const STATES: Record<string, DevState> = {
  normal: { story: 'normal', view: 'play' },
  exhausted: { story: 'exhausted', view: 'play' },
  'zero-target': { story: 'zeroTarget', view: 'play' },
  joined: { story: 'joined', view: 'play', feedback: true },
  mixed: { story: 'mixed', view: 'play' },
  'all-finished': { story: 'allFinished', view: 'play' },
  feedback: { story: 'normal', view: 'play', feedback: true },
  bank: { story: 'normal', view: 'bank' },
  rebuy: { story: 'normal', view: 'play', popupFor: 'ben' },
  'rebuy-exhausted': { story: 'exhausted', view: 'play', popupFor: 'felix' },
  'rebuy-zero-target': { story: 'zeroTarget', view: 'play', popupFor: 'ben' },
  'rebuy-reduced': { story: 'reduced', view: 'play', popupFor: 'ben' },
  'rebuy-zero': { story: 'zero', view: 'play', popupFor: 'ben' },
  'rebuy-impossible': { story: 'impossible', view: 'play', popupFor: 'ben' },
  'rebuy-shortage': { story: 'shortage', view: 'play', popupFor: 'ben' },
  'rebuy-tournament': { story: 'normal', view: 'play', popupFor: 'ben', tournament: true },
};

function proposalFor(state: DevState, playerId: string): RebuyPopupData {
  return state.tournament ? tournamentRebuyFixture() : rebuyFixture(state.story, playerId);
}

function Fixture({ initial }: { initial: DevState }) {
  const toast = useToast();
  const [view, setView] = useState(initial.view);
  const [rebuy, setRebuy] = useState<RebuyPopupData | null>(
    initial.popupFor ? proposalFor(initial, initial.popupFor) : null,
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(
    initial.feedback
      ? initial.story === 'joined'
        ? { title: 'Nora joined', message: '+EUR 20.00 contribution · 200 chip units issued.' }
        : { title: 'Rebuy issued for Ben', message: '+EUR 20.00 contribution · 200 chip units issued.' }
      : null,
  );

  if (view === 'bank') {
    return (
      <BankReserveView
        data={bankFixture(initial.story)}
        backLabel="Back to Play"
        onBack={() => setView('play')}
        onMore={() => toast.show('Game actions (fixture)')}
      />
    );
  }

  return (
    <PlayView
      data={playFixture(initial.story)}
      feedback={feedback}
      rebuy={rebuy}
      rebuyBusy={busy}
      onRebuy={(playerId) => {
        setFeedback(null);
        setRebuy(proposalFor(initial, playerId));
      }}
      onConfirmRebuy={() => {
        if (rebuy?.kind !== 'proposal') return;
        setBusy(true);
        setTimeout(() => {
          setBusy(false);
          setRebuy(null);
          setFeedback({
            title: `Rebuy issued for ${rebuy.playerName}`,
            message: `+${rebuy.priceText} contribution · ${rebuy.stack.unitsText} chip units issued${
              rebuy.reducedCoverage
                ? ` · covers ${rebuy.reducedCoverage.achieved} of ${rebuy.reducedCoverage.required} blind payments`
                : ''
            }.`,
          });
        }, 800);
      }}
      onCancelRebuy={() => {
        setRebuy(null);
        toast.show('No rebuy issued');
      }}
      onResult={(playerId) => toast.show(`Opens the count for ${playerId} (fixture)`)}
      onOpenPlayer={(playerId) => toast.show(`Opens ${playerId} (fixture)`)}
      onAddPlayer={() => toast.show('Opens Add player (fixture)')}
      onViewBank={() => {
        setRebuy(null);
        setView('bank');
      }}
      onSelectTab={(tab) => toast.show(`Opens ${tab} (fixture)`)}
      onBack={() => toast.show('Back to Games (fixture)')}
      onMore={() => toast.show('Game actions (fixture)')}
    />
  );
}

export default function PlayDevRoute() {
  const { state = 'normal' } = useLocalSearchParams<{ state?: string }>();
  return <Fixture key={state} initial={STATES[state] ?? STATES.normal} />;
}
