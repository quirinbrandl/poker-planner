import { useState } from 'react';

import { Dialog, RadioGroup, RadioRow, Text } from '@/ui';

import type { OrderEditorData } from './types';

export interface MissedDialogProps {
  visible: boolean;
  missed: NonNullable<OrderEditorData['missed']>;
  onAdd: (choice: { playerId: string; slotId: string }) => void;
  onCancel: () => void;
}

/** "Add a missed elimination": who was out and when. Adds to the draft only; nothing is saved yet. */
export function MissedDialog({ visible, missed, onAdd, onCancel }: MissedDialogProps) {
  const [playerId, setPlayerId] = useState(missed.candidates[0]?.playerId ?? '');
  const [slotId, setSlotId] = useState(missed.defaultSlotId);
  const chosenPlayer = missed.candidates.some((c) => c.playerId === playerId) ? playerId : missed.candidates[0]?.playerId;
  const chosenSlot = missed.slots.some((s) => s.slotId === slotId) ? slotId : missed.defaultSlotId;

  return (
    <Dialog
      visible={visible}
      title="Add a missed elimination"
      confirmLabel="Add to order"
      confirmIcon="plus"
      onConfirm={() => {
        if (chosenPlayer) onAdd({ playerId: chosenPlayer, slotId: chosenSlot });
      }}
      onCancel={onCancel}
    >
      <RadioGroup label="Who was out?">
        {missed.candidates.map((candidate) => (
          <RadioRow
            key={candidate.playerId}
            label={candidate.name}
            selected={candidate.playerId === chosenPlayer}
            onPress={() => setPlayerId(candidate.playerId)}
          />
        ))}
      </RadioGroup>
      <RadioGroup label="When?">
        {missed.slots.map((slot) => (
          <RadioRow
            key={slot.slotId}
            label={`${slot.placeLabel} · ${slot.description}`}
            selected={slot.slotId === chosenSlot}
            onPress={() => setSlotId(slot.slotId)}
          />
        ))}
      </RadioGroup>
      <Text variant="supporting">Everyone out after them moves up one place.</Text>
    </Dialog>
  );
}
