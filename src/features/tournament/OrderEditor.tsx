import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Badge,
  BadgeRow,
  Button,
  colors,
  Dialog,
  FooterActions,
  IconButton,
  PlaceBadge,
  radii,
  Screen,
  ScreenHeader,
  space,
  Text,
  TopBar,
} from '@/ui';

import { ChangeRows } from './ChangeRows';
import { MissedDialog } from './MissedDialog';
import type { OrderDraftRow, OrderEditorData, TournamentActionResult } from './types';
import { useOperation } from './useOperation';

/** Which popup the editor shows on load (development fixtures and captures). */
export type OrderEditorPopup = 'missed' | 'save' | 'discard';

export interface OrderEditorProps {
  /** The draft as game management shows it. Every change below comes back as new `data`. */
  data: OrderEditorData;
  /** Host is running an operation for this screen: Save shows busy and cannot run. */
  busy?: boolean;
  /** Move one place better in the draft. */
  onMoveUp: (playerId: string) => void;
  /** Move one place worse in the draft. */
  onMoveDown: (playerId: string) => void;
  /** Remove this elimination from the draft (the player is back in once saved). */
  onUndoElimination: (playerId: string) => void;
  /** Insert a missed elimination into the draft at the chosen slot. */
  onAddMissed: (choice: { playerId: string; slotId: string }) => void;
  /** Save the draft as the elimination order. Accepted: the host leaves for Results. */
  onSave: () => Promise<TournamentActionResult>;
  /** Leave without saving: Cancel with no changes, or Discard after confirming. Drops the draft. */
  onDiscard: () => void;
  /** Saving was rejected; the draft is kept. Show the reason. */
  onRejected: (message: string) => void;
  /** Game actions (⋯). */
  onMore?: () => void;
  /** Development fixtures: a popup open on load. */
  initialPopup?: OrderEditorPopup;
}

/**
 * Finishing order editor: the order as a draft ("Unsaved"), ↑ / ↓ and undo per
 * elimination, Add a missed elimination…, and Save order… with a summary of only what changes.
 */
export function OrderEditor({
  data,
  busy = false,
  onMoveUp,
  onMoveDown,
  onUndoElimination,
  onAddMissed,
  onSave,
  onDiscard,
  onRejected,
  onMore,
  initialPopup,
}: OrderEditorProps) {
  const [popup, setPopup] = useState<OrderEditorPopup | null>(initialPopup ?? null);
  const operation = useOperation(onRejected);
  const working = busy || operation.pending;
  const close = () => {
    if (!operation.isRunning()) setPopup(null);
  };
  const cancel = () => {
    if (data.hasChanges) setPopup('discard');
    else onDiscard();
  };

  return (
    <Screen
      topBar={<TopBar backLabel="Results" onBack={cancel} onMore={onMore} />}
      footer={
        <FooterActions note={data.hasChanges ? undefined : 'Nothing changed yet.'}>
          <Button label="Cancel" onPress={cancel} />
          <Button
            label="Save order…"
            icon="check"
            variant="primary"
            unavailable={!data.hasChanges}
            onPress={() => setPopup('save')}
          />
        </FooterActions>
      }
    >
      <ScreenHeader title="Finishing order">
        {data.hasChanges ? (
          <BadgeRow>
            <Badge label="Unsaved" tone="warning" />
          </BadgeRow>
        ) : null}
      </ScreenHeader>

      <View
        accessible
        accessibilityLabel={
          data.top.kind === 'stillPlaying'
            ? `${data.top.rangeLabel} place: still playing, ${data.top.names}`
            : `${data.top.placeLabel} place: ${data.top.name} wins, last player left`
        }
        style={styles.top}
      >
        <PlaceBadge
          label={data.top.kind === 'stillPlaying' ? data.top.rangeLabel : data.top.placeLabel}
          highlight={data.top.kind === 'winner'}
        />
        <Text tone="supporting" style={styles.grow}>
          {data.top.kind === 'stillPlaying'
            ? `Still playing: ${data.top.names}`
            : `${data.top.name} wins`}
        </Text>
      </View>

      <View style={styles.rows}>
        {data.rows.length === 0 ? <Text variant="supporting">No eliminations.</Text> : null}
        {data.rows.map((row) => (
          <DraftRow
            key={row.playerId}
            row={row}
            onMoveUp={() => onMoveUp(row.playerId)}
            onMoveDown={() => onMoveDown(row.playerId)}
            onUndo={() => onUndoElimination(row.playerId)}
          />
        ))}
      </View>
      {data.missed ? (
        <Button label="Add a missed elimination…" icon="plus" fullWidth onPress={() => setPopup('missed')} />
      ) : null}

      {data.missed && popup === 'missed' ? (
        <MissedDialog
          visible
          missed={data.missed}
          onCancel={close}
          onAdd={(choice) => {
            setPopup(null);
            onAddMissed(choice);
          }}
        />
      ) : null}
      <Dialog
        visible={popup === 'save' && data.hasChanges}
        title="Save the new order?"
        confirmLabel="Save order"
        confirmIcon="check"
        confirmLoading={working}
        confirmLoadingLabel="Saving…"
        onCancel={close}
        onConfirm={() => {
          if (busy) return;
          void operation.run(onSave, () => setPopup(null));
        }}
      >
        <ChangeRows rows={data.changes} />
        <Text variant="supporting">Payouts follow the new places.</Text>
      </Dialog>
      <Dialog
        visible={popup === 'discard'}
        title="Discard order changes?"
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        destructive
        onCancel={close}
        onConfirm={() => {
          setPopup(null);
          onDiscard();
        }}
      >
        <Text>The saved order stays as it was.</Text>
      </Dialog>
    </Screen>
  );
}

function DraftRow({
  row,
  onMoveUp,
  onMoveDown,
  onUndo,
}: {
  row: OrderDraftRow;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUndo: () => void;
}) {
  const marker = row.marker;
  const detail = [marker?.kind === 'was' ? marker.text : null, row.paid ? row.payoutText : null]
    .filter(Boolean)
    .join(' · ');
  const spokenMarker = marker?.kind === 'missed' ? ', missed, added now' : marker ? `, ${marker.text}` : '';
  return (
    <View style={[styles.row, marker ? styles.changed : null]}>
      <View
        accessible
        accessibilityLabel={`${row.name}, ${row.placeLabel} place${spokenMarker}, ${row.payoutText.toLowerCase()}`}
        style={styles.who}
      >
        <PlaceBadge label={row.placeLabel} />
        <View style={styles.grow}>
          <View style={styles.nameLine}>
            <Text variant="title">{row.name}</Text>
            {marker?.kind === 'missed' ? <Badge label="missed" tone="primary" size="small" /> : null}
          </View>
          {detail ? <Text variant="supporting">{detail}</Text> : null}
        </View>
      </View>
      <View style={styles.actions}>
        <IconButton icon="chevronUp" accessibilityLabel={row.moveUpLabel} unavailable={!row.canMoveUp} onPress={row.canMoveUp ? onMoveUp : undefined} />
        <IconButton
          icon="chevronDown"
          accessibilityLabel={row.moveDownLabel}
          unavailable={!row.canMoveDown}
          onPress={row.canMoveDown ? onMoveDown : undefined}
        />
        <IconButton icon="undo" accessibilityLabel={`Undo ${row.name}’s elimination`} onPress={onUndo} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radii.tile,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.controlBorder,
  },
  grow: { flex: 1, minWidth: 0 },
  rows: { gap: space.sm },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radii.tile,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  changed: { borderColor: colors.highlightBorder, backgroundColor: colors.selectedTint },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexGrow: 1, flexShrink: 1, flexBasis: 130, minWidth: 0 },
  nameLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.sm },
  actions: { flexDirection: 'row', gap: space.xs, marginLeft: 'auto' },
});
