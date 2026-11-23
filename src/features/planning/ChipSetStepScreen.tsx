import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';

import { ChipSetBlock } from '@/features/planning/chip-set/ChipSetBlock';
import { paletteDescription, removeDenominationText } from '@/features/planning/chip-set/copy';
import { DenominationRow } from '@/features/planning/chip-set/DenominationRow';
import { type RefMap, useRefMap } from '@/features/planning/chip-set/useRefMap';
import { ScopeDialogs } from '@/features/planning/chip-set/ScopeDialogs';
import { templatePickerHref } from '@/features/templates/routes';
import { planningStepHref } from '@/features/shared/routes';
import type {
  ChipRowView,
  ChipSetScopeConfirmation,
  PlanningView,
  Problem,
  RemoveChipRowConfirmation,
} from '@/game-management';
import { useGameManagement, usePlanningView } from '@/state';
import {
  Button,
  ChipColorPalette,
  Dialog,
  Stack,
  Text,
  type TextInputRef,
  useToast,
  type ViewRef,
} from '@/ui';

import { PlanningStepFrame } from './PlanningStepFrame';
import { useFieldError } from './useFieldError';

/**
 * Wizard step 3: this game's own chip set. The open chip case follows the rows live; each
 * denomination is one paired row. Continue on a valid set asks where the changes apply.
 */
export default function ChipSetStepScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const app = useGameManagement();
  const toast = useToast();
  const plan = usePlanningView(gameId);
  const inputs = useRefMap<TextInputRef>();
  const [scope, setScope] = useState<ChipSetScopeConfirmation | null>(null);

  const focusFirst = (problems: readonly Problem[]) => {
    const field = problems.find((p) => p.field.startsWith('chipValue:') || p.field.startsWith('chipQuantity:'))?.field;
    if (field) inputs.get(field)?.focus();
  };

  const onContinue = async () => {
    const result = await app.planning.continueFromStep(gameId, 'chipSet');
    if (result.status === 'needsConfirmation') setScope(result.confirmation);
    else if (result.status === 'accepted') router.replace(planningStepHref(gameId, result.nextStep));
    else if (result.status === 'stepInvalid') focusFirst(result.problems);
    else toast.show(result.reason.message, { tone: 'error' });
  };

  return (
    <PlanningStepFrame gameId={gameId} step="chipSet" onContinue={onContinue}>
      {plan ? <ChipSetStep gameId={gameId} plan={plan} inputs={inputs} /> : null}
      {scope ? (
        <ScopeDialogs
          gameId={gameId}
          confirmation={scope}
          onClose={(problems) => {
            setScope(null);
            if (problems) focusFirst(problems);
          }}
        />
      ) : null}
    </PlanningStepFrame>
  );
}

function ChipSetStep({
  gameId,
  plan,
  inputs,
}: {
  gameId: string;
  plan: PlanningView;
  inputs: RefMap<TextInputRef>;
}) {
  const app = useGameManagement();
  const toast = useToast();
  const chipSet = plan.chipSet;
  const chipButtons = useRefMap<ViewRef>();
  const paletteReturn = useRef<ViewRef | null>(null);
  const [paletteRowId, setPaletteRowId] = useState<string | null>(null);
  const [removal, setRemoval] = useState<RemoveChipRowConfirmation | null>(null);

  const addRow = async () => {
    const result = await app.planning.addChipRow(gameId);
    if (result.status === 'accepted') setTimeout(() => inputs.get(`chipValue:${result.rowId}`)?.focus(), 50);
  };

  const removeRow = async (rowId: string, confirmed = false) => {
    const result = await app.planning.removeChipRow(gameId, rowId, { confirmed });
    if (result.status === 'needsConfirmation') setRemoval(result.confirmation);
    else if (result.status === 'rejected') toast.show(result.reason.message, { tone: 'error' });
  };

  const paletteRow = chipSet.rows.find((row) => row.id === paletteRowId) ?? null;
  const removalRow = removal ? chipSet.rows.find((row) => row.id === removal.rowId) : undefined;
  const source = chipSet.source;

  return (
    <>
      <ChipSetBlock
        rows={chipSet.rows}
        summary={chipSet.summary.label}
        setError={chipSet.continueAttempted ? chipSet.setProblem?.message : undefined}
        onAdd={() => void addRow()}
        top={
          <Stack gap="xs">
            <Button
              label="Choose template"
              icon="templates"
              fullWidth
              onPress={() => router.push(templatePickerHref(gameId))}
            />
            {source.kind === 'template' ? (
              <Text variant="supporting">Copied from “{source.templateName}” · this game’s copy</Text>
            ) : source.kind === 'deletedTemplate' ? (
              <Text variant="supporting">Source template deleted · this game’s copy is kept</Text>
            ) : null}
          </Stack>
        }
      >
        {chipSet.rows.map((row, i) => (
          <GameDenominationRow
            key={row.id}
            gameId={gameId}
            row={row}
            index={i + 1}
            continueAttempted={chipSet.continueAttempted}
            inputs={inputs}
            chipButtons={chipButtons}
            onColorPress={() => {
              paletteReturn.current = chipButtons.get(row.id) ?? null;
              setPaletteRowId(row.id);
            }}
            onRemove={() => void removeRow(row.id)}
          />
        ))}
      </ChipSetBlock>

      <ChipColorPalette
        visible={paletteRow !== null}
        color={paletteRow?.color ?? null}
        description={paletteRow ? paletteDescription(paletteRow.value.text) : undefined}
        returnFocusRef={paletteReturn}
        onCancel={() => setPaletteRowId(null)}
        onApply={(color) => {
          if (paletteRow) void app.planning.setChipColor(gameId, paletteRow.id, color);
          setPaletteRowId(null);
        }}
      />

      <Dialog
        visible={removal !== null}
        title="Remove denomination?"
        confirmLabel="Remove denomination"
        destructive
        onCancel={() => setRemoval(null)}
        onConfirm={() => {
          if (removal) void removeRow(removal.rowId, true);
          setRemoval(null);
        }}
      >
        {removal ? (
          <Text variant="supporting">
            {removeDenominationText(
              { valueText: removal.valueText, quantityText: removal.quantityText, color: removalRow?.color ?? null },
              'game',
            )}
          </Text>
        ) : null}
      </Dialog>

    </>
  );
}

function GameDenominationRow({
  gameId,
  row,
  index,
  continueAttempted,
  inputs,
  chipButtons,
  onColorPress,
  onRemove,
}: {
  gameId: string;
  row: ChipRowView;
  index: number;
  continueAttempted: boolean;
  inputs: RefMap<TextInputRef>;
  chipButtons: RefMap<ViewRef>;
  onColorPress: () => void;
  onRemove: () => void;
}) {
  const app = useGameManagement();
  const value = useFieldError(row.value, continueAttempted);
  const quantity = useFieldError(row.quantity, continueAttempted);
  return (
    <DenominationRow
      index={index}
      color={row.color}
      onColorPress={onColorPress}
      colorRef={chipButtons.register(row.id)}
      onRemove={onRemove}
      value={{
        text: row.value.text,
        error: value.error,
        onBlur: value.onBlur,
        inputRef: inputs.register(`chipValue:${row.id}`),
        onChangeText: (text) => {
          value.onEdit();
          void app.planning.setChipValueText(gameId, row.id, text);
        },
      }}
      quantity={{
        text: row.quantity.text,
        error: quantity.error,
        onBlur: quantity.onBlur,
        inputRef: inputs.register(`chipQuantity:${row.id}`),
        onChangeText: (text) => {
          quantity.onEdit();
          void app.planning.setChipQuantityText(gameId, row.id, text);
        },
      }}
    />
  );
}
