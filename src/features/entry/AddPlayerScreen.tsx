import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';

import { GameActionsSheet } from '@/features/game/GameActionsSheet';
import { BankReserveView } from '@/features/play/BankReserveView';
import { postIssueFeedback } from '@/features/play/issueFeedback';
import { useSubViewBack } from '@/features/play/useSubViewBack';
import { editorRejection } from '@/features/players/SavedPlayerEditor';
import { formatShortDateTime, modeLabel } from '@/features/shared/format';
import { playHref } from '@/features/shared/routes';
import type { EntryAcceptance, EntryPopupData } from '@/game-management';
import { useAddPlayer, useBankReserve, useGame, useGameManagement } from '@/state';
import { Screen } from '@/ui';

import { AddPlayerView } from './AddPlayerView';
import { NewEntryNameEditor } from './NewEntryNameEditor';
import type { EntryNotice } from './types';

/** The open Add <name> popup, what confirming it admits (`null` when blocked) and the line after Cancel. */
interface OpenReview {
  popup: EntryPopupData;
  acceptance: EntryAcceptance | null;
  declinedNotice: string;
}

/**
 * Late entry: stage a saved player (or save a new name), Review entry, and only the popup's
 * **Add player & issue stack** admits them. Back on Play the joining is confirmed once.
 */
export default function AddPlayerScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const app = useGameManagement();
  const game = useGame(gameId);
  const data = useAddPlayer(gameId);
  const bank = useBankReserve(gameId);
  const [view, setView] = useState<'select' | 'newPlayer' | 'bank'>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<EntryNotice | null>(null);
  const [review, setReview] = useState<OpenReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const backToSelection = useCallback(() => setView('select'), []);
  useSubViewBack(view === 'bank', backToSelection);

  const actions = <GameActionsSheet gameId={gameId} visible={actionsOpen} onClose={() => setActionsOpen(false)} />;
  if (!game || !data || !bank) return <Screen>{actions}</Screen>;

  const context = `${modeLabel(game.mode)} · ${formatShortDateTime(game.createdAt)}`;
  const leave = () => (router.canGoBack() ? router.back() : router.replace(playHref(gameId)));

  const openReview = (savedPlayerId: string) => {
    const result = app.play.proposeEntry(gameId, savedPlayerId);
    if (result.status === 'needsConfirmation') {
      const { popup, acceptance, declinedNotice } = result.confirmation;
      setReview({ popup, acceptance, declinedNotice });
    } else if ('blocked' in result) {
      setReview({ popup: result.blocked, acceptance: null, declinedNotice: result.declinedNotice });
    } else {
      setNotice({ tone: 'error', message: result.reason.message });
    }
  };

  const confirmEntry = async () => {
    if (!review?.acceptance) return;
    setBusy(true);
    const result = await app.play.addLatePlayer(gameId, review.acceptance);
    setBusy(false);
    if (result.status === 'accepted') {
      setReview(null);
      postIssueFeedback(gameId, result.feedback);
      leave();
      return;
    }
    setReview(null);
    setNotice({ tone: 'error', message: result.reason.message });
    // A changed bank needs a fresh review, never a silent substitute.
    if (result.reason.code === 'proposalChanged') openReview(review.acceptance.savedPlayerId);
  };

  if (view === 'newPlayer') {
    return (
      <NewEntryNameEditor
        context={context}
        initialName={search.trim()}
        onClose={backToSelection}
        onSave={async (name) => {
          const result = await app.savedPlayers.create(name);
          if (result.status === 'rejected') return editorRejection(result.reason);
          setSelectedId(result.savedPlayerId);
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
      <>
        <BankReserveView
          data={{ ...bank, context }}
          backLabel="Back to player selection"
          onBack={backToSelection}
          onMore={() => setActionsOpen(true)}
        />
        {actions}
      </>
    );
  }

  return (
    <>
      <AddPlayerView
        data={{ ...data, context }}
        selectedId={selectedId}
        onSelect={(savedPlayerId) => {
          setSelectedId(savedPlayerId);
          setNotice(null);
        }}
        search={search}
        onSearch={setSearch}
        notice={notice}
        onReview={() => {
          if (selectedId) openReview(selectedId);
        }}
        review={review?.popup ?? null}
        busy={busy}
        onConfirmEntry={() => void confirmEntry()}
        onCancelReview={() => {
          if (review) setNotice({ tone: 'info', message: review.declinedNotice });
          setReview(null);
        }}
        onViewBank={() => {
          setReview(null);
          setView('bank');
        }}
        onNewPlayer={() => setView('newPlayer')}
        onBack={leave}
        onMore={() => setActionsOpen(true)}
      />
      {actions}
    </>
  );
}
