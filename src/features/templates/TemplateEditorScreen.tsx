import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useMemo, useRef, useState } from 'react';

import { ChipSetBlock } from '@/features/planning/chip-set/ChipSetBlock';
import { removeDenominationText } from '@/features/planning/chip-set/copy';
import { DenominationRow } from '@/features/planning/chip-set/DenominationRow';
import { useRefMap } from '@/features/planning/chip-set/useRefMap';
import { planningStepHref } from '@/features/shared/routes';
import type { ChipRowInput, Problem, TemplateEditorDraft } from '@/game-management';
import { useGameManagement } from '@/state';
import {
  Button,
  ChipColorPalette,
  Dialog,
  EmptyState,
  FooterActions,
  Screen,
  ScreenHeader,
  Text,
  TextField,
  type TextInputRef,
  TopBar,
  useToast,
  type ViewRef,
} from '@/ui';

import { templatesHref } from './routes';

const EMPTY: TemplateEditorDraft = { name: '', rows: [] };

/**
 * The chip set template editor: name, the open chip case and the paired rows. Nothing is stored
 * until Save. Opened from the template picker (`gameId` set), Save and use also copies the new
 * template into that game.
 */
export default function TemplateEditorScreen() {
  const { templateId, gameId } = useLocalSearchParams<{ templateId: string; gameId?: string }>();
  const app = useGameManagement();
  const isNew = templateId === 'new';
  const [initial] = useState<TemplateEditorDraft | null>(() =>
    isNew ? EMPTY : app.templates.getEditorDraft(templateId),
  );

  if (!initial) {
    return (
      <Screen topBar={<TopBar backLabel="Back" backIcon="chevronLeft" onBack={() => router.back()} />}>
        <EmptyState icon="templates" title="This template no longer exists." />
      </Screen>
    );
  }
  return <TemplateEditor templateId={isNew ? null : templateId} gameId={gameId ?? null} initial={initial} />;
}

function TemplateEditor({
  templateId,
  gameId,
  initial,
}: {
  templateId: string | null;
  gameId: string | null;
  initial: TemplateEditorDraft;
}) {
  const app = useGameManagement();
  const toast = useToast();
  const [name, setName] = useState(initial.name);
  const [rows, setRows] = useState<ChipRowInput[]>(initial.rows);
  const nextId = useRef(0);
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set());
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [nameError, setNameError] = useState<string>();
  const [paletteRowId, setPaletteRowId] = useState<string | null>(null);
  const [removal, setRemoval] = useState<ChipRowInput | null>(null);
  const [replaceName, setReplaceName] = useState<string | null>(null);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const [released, setReleased] = useState(false);
  const nameRef = useRef<TextInputRef>(null);
  const inputs = useRefMap<TextInputRef>();
  const chipButtons = useRefMap<ViewRef>();
  const paletteReturn = useRef<ViewRef | null>(null);

  const validation = useMemo(() => app.templates.describeRows(rows), [app, rows]);
  const dirty = name !== initial.name || JSON.stringify(rows) !== JSON.stringify(initial.rows);

  // Leaving with unsaved changes (Cancel, Back, the system back gesture) asks first.
  const disablePrevention = usePreventRemove(dirty && !released, ({ repeat }) => setPendingLeave(() => repeat));

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace(gameId ? planningStepHref(gameId, 'chipSet') : templatesHref);
  };

  const updateRow = (id: string, change: Partial<ChipRowInput>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...change } : row)));

  const markEdited = (key: string) => {
    if (!edited.has(key)) setEdited(new Set(edited).add(key));
  };
  const markLeft = (key: string) => {
    if (edited.has(key) && !shown.has(key)) setShown(new Set(shown).add(key));
  };
  const errorFor = (key: string, problem: Problem | null) =>
    saveAttempted || shown.has(key) ? problem?.message : undefined;

  const addRow = () => {
    nextId.current += 1;
    const id = `new-${nextId.current}`;
    setRows((current) => [...current, { id, valueText: '', quantityText: '', color: null }]);
    setTimeout(() => inputs.get(`chipValue:${id}`)?.focus(), 50);
  };

  const removeRow = (row: ChipRowInput) => {
    if (row.valueText.trim() === '' && row.quantityText.trim() === '') {
      setRows((current) => current.filter((r) => r.id !== row.id));
    } else {
      setRemoval(row);
    }
  };

  const showProblems = (problems: readonly Problem[]) => {
    setSaveAttempted(true);
    const named = problems.find((p) => p.field === 'name');
    setNameError(named?.message);
    if (named) nameRef.current?.focus();
    else {
      const field = problems.find((p) => p.field.startsWith('chip'))?.field;
      if (field) inputs.get(field)?.focus();
    }
  };

  const finish = (message: string) => {
    toast.show(message, { tone: 'confirmed' });
    setReleased(true);
    disablePrevention();
    if (gameId) router.dismissTo(planningStepHref(gameId, 'chipSet'));
    else leave();
  };

  const save = async (confirmed = false) => {
    const input = { name, rows };
    const trimmed = name.trim();
    if (gameId) {
      const result = await app.planning.createTemplateAndApply(gameId, input, { confirmed });
      if (result.status === 'accepted') finish(`Saved “${trimmed}” and copied it into this game.`);
      else if (result.status === 'needsConfirmation') setReplaceName(result.confirmation.templateName);
      else if (result.reason.code === 'invalidTemplate') showProblems(result.reason.problems ?? []);
      else toast.show(result.reason.message, { tone: 'error' });
      return;
    }
    const result = templateId ? await app.templates.update(templateId, input) : await app.templates.create(input);
    if (result.status === 'accepted') finish(`Saved “${trimmed}”. Existing games are unchanged.`);
    else if (result.reason.code === 'invalidTemplate') showProblems(result.reason.problems ?? []);
    else toast.show(result.reason.message, { tone: 'error' });
  };

  const paletteRow = rows.find((row) => row.id === paletteRowId) ?? null;

  return (
    <>
      <Screen
        topBar={<TopBar backLabel="Back" backIcon="chevronLeft" onBack={leave} />}
        footer={
          <FooterActions note={dirty ? 'Unsaved changes' : 'Not changed'}>
            <Button label="Cancel" icon="chevronLeft" onPress={leave} />
            <Button
              label={gameId ? 'Save and use' : 'Save'}
              icon="check"
              variant="primary"
              onPress={() => void save()}
            />
          </FooterActions>
        }
      >
        <ScreenHeader title={templateId ? 'Edit template' : 'New template'}>
          <Text variant="supporting">Changes apply only after Save. Existing games stay unchanged.</Text>
        </ScreenHeader>
        <TextField
          label="Template name"
          value={name}
          autoCapitalize="sentences"
          inputRef={nameRef}
          onChangeText={(text) => {
            setName(text);
            setNameError(undefined);
          }}
          error={nameError}
          testID="template-name"
        />
        <ChipSetBlock
          rows={rows.map((row) => ({ id: row.id, color: row.color, chipCount: validation.rows[row.id]?.chipCount ?? null }))}
          summary={validation.summary.label}
          setError={saveAttempted ? validation.setProblem?.message : undefined}
          onAdd={addRow}
        >
          {rows.map((row, i) => {
            const problems = validation.rows[row.id];
            const valueKey = `chipValue:${row.id}`;
            const quantityKey = `chipQuantity:${row.id}`;
            return (
              <DenominationRow
                key={row.id}
                index={i + 1}
                color={row.color}
                colorRef={chipButtons.register(row.id)}
                onColorPress={() => {
                  paletteReturn.current = chipButtons.get(row.id) ?? null;
                  setPaletteRowId(row.id);
                }}
                onRemove={() => removeRow(row)}
                value={{
                  text: row.valueText,
                  error: errorFor(valueKey, problems?.value ?? null),
                  inputRef: inputs.register(valueKey),
                  onBlur: () => markLeft(valueKey),
                  onChangeText: (text) => {
                    markEdited(valueKey);
                    updateRow(row.id, { valueText: text });
                  },
                }}
                quantity={{
                  text: row.quantityText,
                  error: errorFor(quantityKey, problems?.quantity ?? null),
                  inputRef: inputs.register(quantityKey),
                  onBlur: () => markLeft(quantityKey),
                  onChangeText: (text) => {
                    markEdited(quantityKey);
                    updateRow(row.id, { quantityText: text });
                  },
                }}
              />
            );
          })}
        </ChipSetBlock>
      </Screen>

      <ChipColorPalette
        visible={paletteRow !== null}
        color={paletteRow?.color ?? null}
        returnFocusRef={paletteReturn}
        onCancel={() => setPaletteRowId(null)}
        onApply={(color) => {
          if (paletteRow) updateRow(paletteRow.id, { color });
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
          if (removal) setRows((current) => current.filter((r) => r.id !== removal.id));
          setRemoval(null);
        }}
      >
        {removal ? <Text variant="supporting">{removeDenominationText(removal, 'template')}</Text> : null}
      </Dialog>

      <Dialog
        visible={replaceName !== null}
        title="Replace this game’s chip set?"
        confirmLabel="Save and replace"
        onCancel={() => setReplaceName(null)}
        onConfirm={() => {
          setReplaceName(null);
          void save(true);
        }}
      >
        <Text variant="supporting">
          Replace this game’s entered chip data with “{replaceName}”? Other settings, templates and game copies stay
          unchanged. The new template is saved only if you accept.
        </Text>
      </Dialog>

      <Dialog
        visible={pendingLeave !== null}
        title="Discard template changes?"
        cancelLabel="Keep editing"
        onCancel={() => setPendingLeave(null)}
        confirmLabel="Discard changes"
        destructive
        onConfirm={() => {
          const repeat = pendingLeave;
          setPendingLeave(null);
          setReleased(true);
          repeat?.();
        }}
      >
        <Text variant="supporting">
          The template has not been saved. Discarding leaves the saved template and every game unchanged.
        </Text>
      </Dialog>
    </>
  );
}
