import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';

import { gamesHref } from '@/features/shared/routes';
import { useGameManagement, useSavedPlayers } from '@/state';
import {
  Avatar,
  Button,
  Dialog,
  EmptyState,
  focusView,
  IconButton,
  ListRow,
  Screen,
  ScreenHeader,
  Text,
  TopBar,
  useToast,
  type ViewRef,
} from '@/ui';

import { editorRejection, SavedPlayerEditor } from './SavedPlayerEditor';

type Mode = { kind: 'list' } | { kind: 'editor'; savedPlayerId: string | null; initialName: string };

/**
 * Saved players: the reusable names offered when adding players to a game. Changes apply to future
 * selections only; no game's captured participants ever change from here.
 *
 * Reached from Games (records the Saved players working location) or from a game's Players step
 * (`?from=planning`, a detour: Back returns to the step and the working location stays there).
 */
export default function SavedPlayersScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromPlanning = from === 'planning';
  const app = useGameManagement();
  const players = useSavedPlayers();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [returnFocus, setReturnFocus] = useState<string | null>(null);
  const rowButtons = useRef(new Map<string, ViewRef | null>());
  const newButton = useRef<ViewRef>(null);

  useEffect(() => {
    if (!fromPlanning) void app.location.set({ kind: 'savedPlayers' });
  }, [app, fromPlanning]);

  useEffect(() => {
    if (mode.kind !== 'list' || !returnFocus) return;
    const timer = setTimeout(() => {
      focusView((returnFocus === 'new' ? newButton.current : rowButtons.current.get(returnFocus)) ?? newButton.current);
      setReturnFocus(null);
    }, 100);
    return () => clearTimeout(timer);
  }, [mode.kind, returnFocus]);

  const leave = () => {
    if (fromPlanning) {
      router.back();
      return;
    }
    void app.location.set({ kind: 'games' });
    if (router.canGoBack()) router.back();
    else router.replace(gamesHref);
  };

  const closeEditor = useCallback(() => {
    setReturnFocus(mode.kind === 'editor' && mode.savedPlayerId ? `edit:${mode.savedPlayerId}` : 'new');
    setMode({ kind: 'list' });
  }, [mode]);

  if (mode.kind === 'editor') {
    const editing = mode.savedPlayerId;
    return (
      <SavedPlayerEditor
        title={editing ? 'Edit saved player' : 'New player'}
        backLabel="Saved players"
        initialName={mode.initialName}
        saveLabel="Save"
        onClose={closeEditor}
        onSave={async (name) => {
          const result = editing ? await app.savedPlayers.rename(editing, name) : await app.savedPlayers.create(name);
          if (result.status !== 'accepted') return editorRejection(result.reason);
          AccessibilityInfo.announceForAccessibility(`Saved ${name.trim()}`);
          closeEditor();
          return null;
        }}
      />
    );
  }

  const cancelDelete = () => {
    const id = deleting?.id;
    setDeleting(null);
    if (id) setTimeout(() => focusView(rowButtons.current.get(`delete:${id}`) ?? null), 100);
  };

  const confirmDelete = async () => {
    const target = deleting;
    setDeleting(null);
    if (!target) return;
    const result = await app.savedPlayers.delete(target.id);
    if (result.status === 'rejected') toast.show(result.reason.message, { tone: 'error' });
    else {
      AccessibilityInfo.announceForAccessibility(`Deleted ${target.name}`);
      setReturnFocus('new');
    }
  };

  return (
    <>
      <Screen
        topBar={
          <TopBar
            backLabel={fromPlanning ? 'Add players' : 'Games'}
            onBack={leave}
          />
        }
      >
        <ScreenHeader title="Saved players" />
        <Button
          ref={newButton}
          label="New player"
          variant="primary"
          icon="userPlus"
          fullWidth
          onPress={() => setMode({ kind: 'editor', savedPlayerId: null, initialName: '' })}
        />
        {players.length > 0 ? (
          <View accessibilityRole="list" accessibilityLabel="Saved players">
            {players.map((player) => (
              <ListRow
                key={player.id}
                title={player.name}
                leading={<Avatar name={player.name} />}
                actions={
                  <>
                    <IconButton
                      ref={(view) => {
                        rowButtons.current.set(`edit:${player.id}`, view);
                      }}
                      icon="edit"
                      variant="plain"
                      accessibilityLabel={`Edit saved player ${player.name}`}
                      onPress={() => setMode({ kind: 'editor', savedPlayerId: player.id, initialName: player.name })}
                    />
                    <IconButton
                      ref={(view) => {
                        rowButtons.current.set(`delete:${player.id}`, view);
                      }}
                      icon="trash"
                      variant="plain"
                      accessibilityLabel={`Delete saved player ${player.name}`}
                      onPress={() => setDeleting({ id: player.id, name: player.name })}
                    />
                  </>
                }
              />
            ))}
          </View>
        ) : (
          <EmptyState icon="players" title="No saved players yet" />
        )}
      </Screen>

      <Dialog
        visible={deleting !== null}
        title={`Delete ${deleting?.name ?? ''}?`}
        confirmLabel="Delete saved player"
        destructive
        onCancel={cancelDelete}
        onConfirm={() => void confirmDelete()}
      >
        <Text tone="supporting">
          Existing games keep their captured player and name.
        </Text>
      </Dialog>
    </>
  );
}
