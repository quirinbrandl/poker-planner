import { router } from 'expo-router';
import { useState } from 'react';

import { planningStepHref } from '@/features/shared/routes';
import type { ChipSetScope, ChipSetScopeConfirmation, Problem } from '@/game-management';
import { useGameManagement } from '@/state';
import { Dialog, Text, TextField, useToast } from '@/ui';

export interface ScopeDialogsProps {
  gameId: string;
  /** What Continue returned. Mount this component only while the popup is open. */
  confirmation: ChipSetScopeConfirmation;
  /** Closed without advancing (Cancel, Leave without template from Cancel, or invalid rows). */
  onClose: (problems?: readonly Problem[]) => void;
}

type Stage = 'scope' | 'name' | { leave: 'close' | 'onlyThisGame' };

/**
 * "Where should changes apply?" after a valid Continue on Chip set, with the Save as new template
 * name prompt and the Keep editing / Leave without template question for a pending name.
 * The choice is one-shot: nothing is remembered once this closes.
 */
export function ScopeDialogs({ gameId, confirmation, onClose }: ScopeDialogsProps) {
  const app = useGameManagement();
  const toast = useToast();
  const [stage, setStage] = useState<Stage>('scope');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const source = confirmation.sourceTemplate;
  const offersUpdate = confirmation.options.includes('updateSourceTemplate') && source !== null;
  const namePending = name.trim() !== '';

  const finish = async (scope: ChipSetScope) => {
    if (busy) return;
    setBusy(true);
    const result = await app.planning.completeChipSetStep(gameId, scope);
    setBusy(false);
    if (result.status === 'accepted') {
      if (scope.kind === 'updateSourceTemplate' && source) {
        toast.show(`Updated “${source.name}” for future games.`, { tone: 'confirmed' });
      } else if (scope.kind === 'saveAsNewTemplate') {
        toast.show(`Saved “${scope.name.trim()}” as a new template.`, { tone: 'confirmed' });
      }
      router.replace(planningStepHref(gameId, result.nextStep));
    } else if (result.status === 'stepInvalid') {
      onClose(result.problems);
    } else if (scope.kind === 'saveAsNewTemplate' && result.reason.code === 'invalidTemplate') {
      setNameError(result.reason.problems?.find((p) => p.field === 'name')?.message ?? result.reason.message);
    } else {
      toast.show(result.reason.message, { tone: 'error' });
      onClose();
    }
  };

  const onlyThisGame = () => {
    if (namePending) setStage({ leave: 'onlyThisGame' });
    else void finish({ kind: 'onlyThisGame' });
  };
  const cancel = () => {
    if (namePending) setStage({ leave: 'close' });
    else onClose();
  };

  if (stage === 'scope') {
    return (
      <Dialog
        visible
        title="Where should changes apply?"
        actionOrder="confirmFirst"
        confirmLabel="Only this game"
        onConfirm={onlyThisGame}
        secondaryAction={
          offersUpdate
            ? { label: 'Also update template', onPress: () => void finish({ kind: 'updateSourceTemplate' }) }
            : { label: 'Save as new template', onPress: () => setStage('name') }
        }
        onCancel={cancel}
      >
        <Text variant="supporting">
          {offersUpdate
            ? `Your game draft is retained. You can also update “${source!.name}” for future games. Other games always keep their own chip set.`
            : 'Your game draft is retained. You can save a new template to reuse this chip set. Other games always keep their own chip set.'}
        </Text>
      </Dialog>
    );
  }

  if (stage === 'name') {
    return (
      <Dialog
        visible
        title="Save as new template"
        actionOrder="confirmFirst"
        confirmLabel={confirmation.returnsToPreview ? 'Save and return to preview' : 'Save template and continue'}
        onConfirm={() => void finish({ kind: 'saveAsNewTemplate', name })}
        confirmLoading={busy}
        secondaryAction={{ label: 'Back', onPress: () => setStage('scope') }}
        onCancel={cancel}
      >
        <Text variant="supporting">Reuse the current chip values, quantities and colors. Existing games stay unchanged.</Text>
        <TextField
          label="Template name"
          value={name}
          autoFocus
          autoCapitalize="sentences"
          returnKeyType="done"
          onChangeText={(text) => {
            setName(text);
            setNameError(undefined);
          }}
          onSubmitEditing={() => void finish({ kind: 'saveAsNewTemplate', name })}
          error={nameError}
          testID="new-template-name"
        />
      </Dialog>
    );
  }

  const then = stage.leave;
  return (
    <Dialog
      visible
      title="Leave without saving a template?"
      cancelLabel="Keep editing"
      onCancel={() => setStage('name')}
      confirmLabel="Leave without template"
      destructive
      onConfirm={() => {
        setName('');
        if (then === 'onlyThisGame') void finish({ kind: 'onlyThisGame' });
        else onClose();
      }}
    >
      <Text variant="supporting">
        The entered name will be discarded. This game’s chip set stays saved as a draft; no template is created.
      </Text>
    </Dialog>
  );
}
