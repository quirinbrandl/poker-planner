import { type Ref, useRef, useState } from 'react';
import { View } from 'react-native';

import type { PlanningView } from '@/game-management';
import { Avatar, Button, Dialog, EmptyState, focusView, IconButton, InlineNotice, ListRow, Text, type ViewRef } from '@/ui';

export interface PlayerRosterProps {
  players: PlanningView['players'];
  onAdd: () => void;
  /** Removes after the host confirmed. */
  onRemove: (participantId: string) => Promise<void>;
  addRef?: Ref<ViewRef>;
}

/** The game's participants in joining order, with remove (confirmed) and Add players. */
export function PlayerRoster({ players, onAdd, onRemove, addRef }: PlayerRosterProps) {
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const removeButtons = useRef(new Map<string, ViewRef | null>());
  const { participants } = players;
  const problem = players.continueAttempted ? players.problems[0] : undefined;

  const cancelRemove = () => {
    const id = removing?.id;
    setRemoving(null);
    // Nothing changed: back to the control that asked.
    if (id) setTimeout(() => focusView(removeButtons.current.get(id) ?? null), 100);
  };

  return (
    <>
      {participants.length > 0 ? (
        <View accessibilityRole="list" accessibilityLabel="Players in this game">
          {participants.map((participant) => (
            <ListRow
              key={participant.id}
              title={participant.name}
              leading={<Avatar name={participant.name} />}
              actions={
                <IconButton
                  ref={(view) => {
                    removeButtons.current.set(participant.id, view);
                  }}
                  icon="removeCircle"
                  variant="plain"
                  accessibilityLabel={`Remove ${participant.name} from this game`}
                  onPress={() => setRemoving({ id: participant.id, name: participant.name })}
                />
              }
            />
          ))}
        </View>
      ) : (
        <EmptyState icon="players" title="No players yet" description={problem ? undefined : 'Add at least two to continue.'} />
      )}
      {problem ? <InlineNotice tone="error">{problem.message}</InlineNotice> : null}
      <Button ref={addRef} label="Add players" icon="userPlus" fullWidth onPress={onAdd} />

      <Dialog
        visible={removing !== null}
        title={`Remove ${removing?.name ?? ''}?`}
        confirmLabel="Remove from this game"
        destructive
        onCancel={cancelRemove}
        onConfirm={() => {
          const id = removing?.id;
          setRemoving(null);
          if (id) void onRemove(id);
        }}
      >
        <Text tone="supporting">Remove from this game. The saved player stays available.</Text>
      </Dialog>
    </>
  );
}
