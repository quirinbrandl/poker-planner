import type { GameMode } from '@/domain/types';
import { RadioGroup, RadioRow } from '@/ui';

const MODES: readonly { mode: GameMode; label: string; description: string }[] = [
  { mode: 'cash', label: 'Cash game', description: 'Final chips determine results.' },
  { mode: 'tournament', label: 'Tournament', description: 'Finishing places determine payouts.' },
];

export interface ModeChoiceProps {
  selected: GameMode | null;
  onSelect: (mode: GameMode) => void;
}

/** Cash game or tournament as labelled rows: the New game choice and the wizard's first step. */
export function ModeChoice({ selected, onSelect }: ModeChoiceProps) {
  return (
    <RadioGroup label="Game mode" hideLabel>
      {MODES.map((item) => (
        <RadioRow
          key={item.mode}
          label={item.label}
          description={item.description}
          selected={selected === item.mode}
          onPress={() => onSelect(item.mode)}
        />
      ))}
    </RadioGroup>
  );
}
