import { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import type { PlayerPickerEntry } from '@/game-management';
import {
  Button,
  CheckboxRow,
  colors,
  FooterActions,
  Icon,
  IconButton,
  InlineNotice,
  Screen,
  ScreenHeader,
  Text,
  TextField,
  TopBar,
  space,
  touchTarget,
} from '@/ui';

export interface PlayerPickerProps {
  entries: readonly PlayerPickerEntry[];
  /** Staged saved-player ids, in the order they were ticked. */
  selection: readonly string[];
  onToggle: (savedPlayerId: string) => void;
  search: string;
  onSearch: (text: string) => void;
  /** The reason the last Add was refused. */
  error: string | null;
  onAdd: () => void;
  onCancel: () => void;
  onNewPlayer: () => void;
  onEdit: (entry: PlayerPickerEntry) => void;
  onManage: () => void;
}

function matches(name: string, search: string): boolean {
  const query = search.trim().toLocaleLowerCase();
  return query === '' || name.toLocaleLowerCase().includes(query);
}

function addLabel(count: number): string {
  if (count === 0) return 'Add players';
  return `Add ${count} ${count === 1 ? 'player' : 'players'}`;
}

/** Spoken name of a saved player who is already on the roster. */
function inGameLabel(entry: PlayerPickerEntry): string {
  return entry.capturedName && entry.capturedName !== entry.name
    ? `${entry.name}, already in this game as ${entry.capturedName}`
    : `${entry.name}, already in this game`;
}

/**
 * Add players: search and tick saved names, or create a new one. Nothing changes until Add. Saved
 * players already on the roster follow the selectable ones as dimmed rows with a tick.
 */
export function PlayerPicker({
  entries,
  selection,
  onToggle,
  search,
  onSearch,
  error,
  onAdd,
  onCancel,
  onNewPlayer,
  onEdit,
  onManage,
}: PlayerPickerProps) {
  const shown = entries.filter((entry) => matches(entry.name, search));
  const ordered = [...shown.filter((entry) => !entry.inGame), ...shown.filter((entry) => entry.inGame)];

  useEffect(() => {
    // Android back means Cancel: the picker is part of the Players step, not a route of its own.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => subscription.remove();
  }, [onCancel]);

  return (
    <Screen
      topBar={<TopBar backLabel="Players" onBack={onCancel} />}
      footer={
        <FooterActions>
          <Button label="Cancel" onPress={onCancel} />
          <Button
            label={addLabel(selection.length)}
            variant="primary"
            icon="check"
            unavailable={selection.length === 0}
            onUnavailablePress={onAdd}
            onPress={onAdd}
          />
        </FooterActions>
      }
    >
      <ScreenHeader title="Add players" />
      <TextField
        label="Search saved names"
        labelHidden
        inputIcon="search"
        placeholder="Search"
        keyboard="text"
        autoCapitalize="none"
        returnKeyType="search"
        value={search}
        onChangeText={onSearch}
      />
      {shown.length > 0 ? (
        <View accessibilityRole="list" accessibilityLabel="Saved players" style={styles.list}>
          {ordered.map((entry) => {
            return (
              <View key={entry.savedPlayerId} style={styles.row}>
                <View style={styles.choice}>
                  {entry.inGame ? (
                    <View accessible accessibilityLabel={inGameLabel(entry)} style={styles.inGame}>
                      <Icon name="check" size={18} color={colors.textSupporting} />
                      <Text tone="supporting" style={styles.inGameName}>
                        {entry.capturedName && entry.capturedName !== entry.name
                          ? `${entry.name} (${entry.capturedName})`
                          : entry.name}
                      </Text>
                    </View>
                  ) : (
                    <CheckboxRow
                      label={entry.name}
                      checked={selection.includes(entry.savedPlayerId)}
                      onPress={() => onToggle(entry.savedPlayerId)}
                    />
                  )}
                </View>
                <IconButton
                  icon="edit"
                  variant="plain"
                  accessibilityLabel={`Edit saved player ${entry.name}`}
                  onPress={() => onEdit(entry)}
                />
              </View>
            );
          })}
        </View>
      ) : (
        <Text tone="supporting" align="center" style={styles.empty}>
          {entries.length === 0 ? 'No saved players yet. Add someone new below.' : 'No matching saved players.'}
        </Text>
      )}
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      <Button label="New player" icon="userPlus" fullWidth onPress={onNewPlayer} />
      <Button label="Manage saved players" variant="tertiary" icon="players" onPress={onManage} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm + 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  choice: { flex: 1, minWidth: 0 },
  inGame: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: touchTarget,
    paddingHorizontal: space.lg + 2,
    opacity: 0.75,
  },
  inGameName: { flexShrink: 1 },
  empty: { paddingVertical: space.xl },
});
