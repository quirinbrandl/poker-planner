import { StyleSheet, View } from 'react-native';

import { CheckboxRow, colors, Dialog, IconButton, PlaceBadge, radii, space, Text } from '@/ui';

export interface SameHandDialogProps {
  visible: boolean;
  /** Players still in, joining order. */
  players: readonly { playerId: string; name: string }[];
  /** Ticked players in the host's order, best place first. */
  selectedIds: readonly string[];
  /** Places the next eliminations take, best first; k ticked players take the last k. */
  nextPlaceLabels: readonly string[];
  busy: boolean;
  onToggle: (playerId: string) => void;
  onMoveUp: (playerId: string) => void;
  onMoveDown: (playerId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * "Out in the same hand": tick everyone who is out, then put them in a distinct order with ↑ / ↓.
 * Places can't be shared; at least one player stays in.
 */
export function SameHandDialog({
  visible,
  players,
  selectedIds,
  nextPlaceLabels,
  busy,
  onToggle,
  onMoveUp,
  onMoveDown,
  onConfirm,
  onCancel,
}: SameHandDialogProps) {
  const count = selectedIds.length;
  const full = count >= players.length - 1;
  const places = nextPlaceLabels.slice(nextPlaceLabels.length - count);
  const nameOf = (id: string) => players.find((player) => player.playerId === id)?.name ?? '';

  return (
    <Dialog
      visible={visible}
      title="Out in the same hand"
      confirmLabel={count >= 2 ? `Record ${count} eliminations` : 'Record eliminations'}
      confirmIcon="exit"
      confirmUnavailable={count < 2}
      confirmLoading={busy}
      confirmLoadingLabel="Recording…"
      onConfirm={() => {
        if (count >= 2) onConfirm();
      }}
      onCancel={onCancel}
    >
      <Text variant="title" accessibilityRole="header">
        Who’s out?
      </Text>
      <View style={styles.list}>
        {players.map((player) => {
          const checked = selectedIds.includes(player.playerId);
          return (
            <CheckboxRow
              key={player.playerId}
              label={player.name}
              checked={checked}
              unavailable={!checked && full}
              description={!checked && full ? 'One player has to stay in.' : undefined}
              onPress={() => onToggle(player.playerId)}
            />
          );
        })}
      </View>
      {count >= 2 ? (
        <>
          <Text variant="title" accessibilityRole="header">
            Finishing places
          </Text>
          <View style={styles.list}>
            {selectedIds.map((id, index) => {
              const name = nameOf(id);
              return (
                <View key={id} style={styles.orderRow}>
                  <View accessible accessibilityLabel={`${places[index]} place, ${name}`} style={styles.who}>
                    <PlaceBadge label={places[index] ?? ''} />
                    <Text variant="title" style={styles.name}>
                      {name}
                    </Text>
                  </View>
                  <View style={styles.arrows}>
                    <IconButton
                      icon="chevronUp"
                      variant="plain"
                      accessibilityLabel={`Move ${name} up`}
                      unavailable={index === 0}
                      onPress={index === 0 ? undefined : () => onMoveUp(id)}
                    />
                    <IconButton
                      icon="chevronDown"
                      variant="plain"
                      accessibilityLabel={`Move ${name} down`}
                      unavailable={index === count - 1}
                      onPress={index === count - 1 ? undefined : () => onMoveDown(id)}
                    />
                  </View>
                </View>
              );
            })}
          </View>
          <Text variant="supporting">Usually whoever started the hand with more chips finishes higher.</Text>
        </>
      ) : (
        <Text variant="supporting">Tick at least two players.</Text>
      )}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  orderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radii.tile,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexGrow: 1, flexShrink: 1, flexBasis: 120, minWidth: 0 },
  name: { flexShrink: 1 },
  arrows: { flexDirection: 'row', marginLeft: 'auto' },
});
