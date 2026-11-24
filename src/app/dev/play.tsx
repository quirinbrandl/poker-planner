/**
 * Development only: Play, the rebuy popup and Bank & reserve with fixture data (no game management).
 *   /dev/play?state=normal|exhausted|zero-target|joined|mixed|all-finished|bank|bank-weakened|bank-used|bank-none|
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
}

const STATES: Record<string, DevState> = {
  normal: { story: 'normal', view: 'play' },
  exhausted: { story: 'exhausted', view: 'play' },
  'zero-target': { story: 'zeroTarget', view: 'play' },
  joined: { story: 'joined', view: 'play' },
  mixed: { story: 'mixed', view: 'play' },
  'all-finished': { story: 'allFinished', view: 'play' },
  bank: { story: 'normal', view: 'bank' },
  'bank-weakened': { story: 'weakened', view: 'bank' },
  'bank-used': { story: 'exhausted', view: 'bank' },
  'bank-none': { story: 'zeroTarget', view: 'bank' },
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
      rebuy={rebuy}
      rebuyBusy={busy}
      onRebuy={(playerId) => setRebuy(proposalFor(initial, playerId))}
      onConfirmRebuy={() => {
        if (rebuy?.kind !== 'proposal') return;
        setBusy(true);
        setTimeout(() => {
          setBusy(false);
          setRebuy(null);
          toast.show(`Rebuy issued for ${rebuy.playerName}`, { tone: 'confirmed' });
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
