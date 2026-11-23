/**
 * Development only: late entry with fixture data (no game management).
 *   /dev/entry?state=select|selected|cancelled|new-player|bank|review|review-exhausted|
 *     review-tournament|blocked-reduced|blocked-zero|blocked-impossible|blocked-shortage
 * Review entry opens that state's popup for the selected name; accepting resolves after a delay.
 */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { AddPlayerView } from '@/features/entry/AddPlayerView';
import { ADD_PLAYER_DATA, entryFixture, type EntryStoryName } from '@/features/entry/fixtures';
import { NewEntryNameEditor } from '@/features/entry/NewEntryNameEditor';
import type { EntryCandidate, EntryNotice, EntryPopupData } from '@/features/entry/types';
import { BankReserveView } from '@/features/play/BankReserveView';
import { bankFixture, type PlayStoryName } from '@/features/play/fixtures';
import { useToast } from '@/ui';

interface DevState {
  story: EntryStoryName;
  selected?: string;
  open?: boolean;
  view?: 'select' | 'newPlayer' | 'bank';
  notice?: EntryNotice;
  missing?: boolean;
}

const STATES: Record<string, DevState> = {
  select: { story: 'normal' },
  selected: { story: 'normal', selected: 'sp-nora' },
  cancelled: { story: 'normal', selected: 'sp-nora', notice: { tone: 'info', message: 'Nora has not joined.' } },
  'new-player': { story: 'normal', view: 'newPlayer' },
  bank: { story: 'normal', view: 'bank' },
  review: { story: 'normal', selected: 'sp-nora', open: true },
  'review-exhausted': { story: 'exhausted', selected: 'sp-nora', open: true },
  'review-tournament': { story: 'tournament', selected: 'sp-nora', open: true },
  'blocked-reduced': { story: 'reduced', selected: 'sp-nora', open: true },
  'blocked-zero': { story: 'zero', selected: 'sp-nora', open: true },
  'blocked-impossible': { story: 'impossible', selected: 'sp-nora', open: true },
  'blocked-shortage': { story: 'shortage', selected: 'sp-nora', open: true },
};

const BANK_STORY: Record<EntryStoryName, PlayStoryName> = {
  normal: 'normal',
  exhausted: 'exhausted',
  reduced: 'reduced',
  zero: 'zero',
  impossible: 'impossible',
  shortage: 'shortage',
  tournament: 'normal',
};

function Fixture({ initial }: { initial: DevState }) {
  const toast = useToast();
  const [candidates, setCandidates] = useState<readonly EntryCandidate[]>(ADD_PLAYER_DATA.candidates);
  const [view, setView] = useState(initial.view ?? 'select');
  const [selectedId, setSelectedId] = useState<string | null>(initial.selected ?? null);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<EntryNotice | null>(initial.notice ?? null);
  const [busy, setBusy] = useState(false);
  const nameOf = (id: string | null) => candidates.find((candidate) => candidate.savedPlayerId === id)?.name ?? '';
  const [review, setReview] = useState<EntryPopupData | null>(
    initial.open && initial.selected ? entryFixture(initial.story, nameOf(initial.selected)) : null,
  );

  if (view === 'newPlayer') {
    return (
      <NewEntryNameEditor
        context={ADD_PLAYER_DATA.context}
        initialName={search.trim()}
        onClose={() => setView('select')}
        onSave={async (name) => {
          const trimmed = name.trim();
          if (trimmed === '') return { on: 'name', message: 'Enter a name.' };
          if (candidates.some((candidate) => candidate.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
            return { on: 'name', message: `${trimmed} is already a saved player.` };
          }
          const id = `sp-${trimmed.toLocaleLowerCase()}`;
          setCandidates([...candidates, { savedPlayerId: id, name: trimmed, inGame: false }]);
          setSelectedId(id);
          setSearch('');
          setNotice(null);
          setView('select');
          return null;
        }}
      />
    );
  }

  if (view === 'bank') {
    return (
      <BankReserveView
        data={bankFixture(BANK_STORY[initial.story])}
        backLabel="Back to player selection"
        onBack={() => setView('select')}
        onMore={() => toast.show('Game actions (fixture)')}
      />
    );
  }

  return (
    <AddPlayerView
      data={{ ...ADD_PLAYER_DATA, candidates }}
      selectedId={selectedId}
      onSelect={(id) => {
        setSelectedId(id);
        setNotice(null);
      }}
      search={search}
      onSearch={setSearch}
      notice={notice}
      onReview={() => setReview(entryFixture(initial.story, nameOf(selectedId)))}
      review={review}
      busy={busy}
      onConfirmEntry={() => {
        setBusy(true);
        setTimeout(() => {
          setBusy(false);
          setReview(null);
          toast.show(`${nameOf(selectedId)} joined (fixture: returns to Play)`, { tone: 'confirmed' });
        }, 800);
      }}
      onCancelReview={() => {
        setReview(null);
        setNotice({ tone: 'info', message: `${nameOf(selectedId)} has not joined.` });
      }}
      onViewBank={() => {
        setReview(null);
        setView('bank');
      }}
      onNewPlayer={() => setView('newPlayer')}
      onBack={() => toast.show('Back to Play (fixture)')}
      onMore={() => toast.show('Game actions (fixture)')}
    />
  );
}

export default function EntryDevRoute() {
  const { state = 'select' } = useLocalSearchParams<{ state?: string }>();
  return <Fixture key={state} initial={STATES[state] ?? STATES.select} />;
}
