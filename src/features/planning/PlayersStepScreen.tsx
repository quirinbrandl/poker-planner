import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { savedPlayersHref } from '@/features/players/routes';
import { editorRejection, SavedPlayerEditor } from '@/features/players/SavedPlayerEditor';
import type { PlayerPickerEntry } from '@/game-management';
import { useGameManagement, usePlanningView, usePlayerPicker } from '@/state';
import { focusView, type ScrollViewRef, useToast, type ViewRef } from '@/ui';

import { PlanningStepFrame } from './PlanningStepFrame';
import { planningContext } from './players/gameContext';
import { PlayerPicker } from './players/PlayerPicker';
import { PlayerRoster } from './players/PlayerRoster';

/** What the Players step shows: the roster, the Add players picker, or a saved-name editor from it. */
type Mode =
  | { kind: 'roster' }
  | { kind: 'picker' }
  | { kind: 'newPlayer'; initialName: string }
  | { kind: 'editSaved'; savedPlayerId: string; initialName: string };

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Planning step 2: the game's roster. Adding goes through the saved-player picker (tick saved names
 * and/or create a new one with Save and add). The picker and its editors are part of this screen, so
 * their staged selection survives the editor and a visit to Saved players.
 */
export default function PlayersStepScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const app = useGameManagement();
  const plan = usePlanningView(gameId);
  const entries = usePlayerPicker(gameId);
  const toast = useToast();

  const [mode, setMode] = useState<Mode>({ kind: 'roster' });
  const [selection, setSelection] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [pickerError, setPickerError] = useState<string | null>(null);
  /** Set when returning to the roster: show the newcomers, or put focus back on Add players. */
  const [arrival, setArrival] = useState<{ added: string[] } | null>(null);
  const scrollRef = useRef<ScrollViewRef>(null);
  const addRef = useRef<ViewRef>(null);

  // A saved player deleted (or added to the game) elsewhere can no longer stay selected.
  const selectable = new Set((entries ?? []).filter((entry) => !entry.inGame).map((entry) => entry.savedPlayerId));
  const staged = selection.filter((id) => selectable.has(id));

  useEffect(() => {
    if (mode.kind !== 'roster' || !arrival) return;
    const timer = setTimeout(() => {
      if (arrival.added.length > 0) {
        scrollRef.current?.scrollToEnd({ animated: false });
        AccessibilityInfo.announceForAccessibility(`Added ${joinNames(arrival.added)}`);
      } else {
        focusView(addRef.current);
      }
      setArrival(null);
    }, 100);
    return () => clearTimeout(timer);
  }, [mode.kind, arrival]);

  const openPicker = () => {
    setSelection([]);
    setSearch('');
    setPickerError(null);
    setMode({ kind: 'picker' });
  };

  const backToRoster = useCallback((added: string[]) => {
    setSelection([]);
    setSearch('');
    setPickerError(null);
    setArrival({ added });
    setMode({ kind: 'roster' });
  }, []);
  const cancelPicker = useCallback(() => backToRoster([]), [backToRoster]);
  const backToPicker = useCallback(() => setMode({ kind: 'picker' }), []);

  if (!plan || !entries) return <PlanningStepFrame gameId={gameId} step="players" />;

  const namesOf = (ids: readonly string[]) =>
    ids.map((id) => entries.find((entry) => entry.savedPlayerId === id)?.name ?? '').filter(Boolean);

  const addSelected = async () => {
    const result = await app.planning.addSavedPlayers(gameId, staged);
    if (result.status === 'accepted') backToRoster(namesOf(staged));
    else setPickerError(result.reason.message);
  };

  if (mode.kind === 'picker') {
    return (
      <PlayerPicker
        plan={plan}
        entries={entries}
        selection={staged}
        onToggle={(id) => {
          setPickerError(null);
          setSelection(staged.includes(id) ? staged.filter((other) => other !== id) : [...staged, id]);
        }}
        search={search}
        onSearch={setSearch}
        error={pickerError}
        onAdd={() => void addSelected()}
        onCancel={cancelPicker}
        onNewPlayer={() => {
          // With nothing matching, the search text is most likely the new name.
          const matching = entries.some((entry) => entry.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
          setMode({ kind: 'newPlayer', initialName: matching ? '' : search.trim() });
        }}
        onEdit={(entry: PlayerPickerEntry) =>
          setMode({ kind: 'editSaved', savedPlayerId: entry.savedPlayerId, initialName: entry.name })
        }
        onManage={() => router.push(savedPlayersHref('planning'))}
      />
    );
  }

  if (mode.kind === 'newPlayer') {
    const { badges, context } = planningContext(plan);
    const alsoAdding = namesOf(staged);
    return (
      <SavedPlayerEditor
        title="New player"
        backLabel="Back"
        badges={badges}
        context={context}
        initialName={mode.initialName}
        helper="Saved for future games."
        note={alsoAdding.length > 0 ? `Also adding ${joinNames(alsoAdding)}.` : undefined}
        saveLabel={staged.length > 0 ? `Save and add ${staged.length + 1} players` : 'Save and add'}
        unchangedNote="Your saved players and game roster haven’t changed."
        onClose={backToPicker}
        onSave={async (name) => {
          const result = await app.planning.createSavedPlayerAndAdd(gameId, name, staged);
          if (result.status === 'accepted') {
            backToRoster([...alsoAdding, name.trim()]);
            return null;
          }
          return editorRejection(result.reason);
        }}
      />
    );
  }

  if (mode.kind === 'editSaved') {
    return (
      <SavedPlayerEditor
        title="Edit saved player"
        backLabel="Back"
        initialName={mode.initialName}
        helper="Existing games keep their captured names."
        saveLabel="Save"
        unchangedNote="Your saved players and game roster haven’t changed."
        onClose={backToPicker}
        onSave={async (name) => {
          const result = await app.savedPlayers.rename(mode.savedPlayerId, name);
          if (result.status === 'accepted') {
            backToPicker();
            return null;
          }
          return editorRejection(result.reason);
        }}
      />
    );
  }

  return (
    <PlanningStepFrame gameId={gameId} step="players" scrollRef={scrollRef}>
      <PlayerRoster
        players={plan.players}
        addRef={addRef}
        onAdd={openPicker}
        onRemove={async (participantId) => {
          const result = await app.planning.removeParticipant(gameId, participantId);
          if (result.status === 'rejected') toast.show(result.reason.message, { tone: 'error' });
          else setArrival({ added: [] });
        }}
      />
    </PlanningStepFrame>
  );
}
