import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { Button, Dialog, InlineNotice, Screen, ScreenHeader, Stack, Text, TextField, TopBar } from '@/ui';

/** Why a save did not happen: a problem with the typed name, or with the rest of the operation. */
export type EditorRejection = { on: 'name' | 'operation'; message: string };

/** Places a rejected operation's reason: next to the name field when it is about the name. */
export function editorRejection(reason: {
  message: string;
  problems?: readonly { field: string; message: string }[];
}): EditorRejection {
  const nameProblem = reason.problems?.find((problem) => problem.field === 'name');
  return nameProblem ? { on: 'name', message: nameProblem.message } : { on: 'operation', message: reason.message };
}

export interface SavedPlayerEditorProps {
  /** "New player" or "Edit saved player". */
  title: string;
  /** Top bar back text ("Back"). Back means the same as Cancel. */
  backLabel: string;
  /** Badges and context line when the editor belongs to a game. */
  badges?: ReactNode;
  context?: string;
  /** The accepted name being edited, or the starting text of a new name. Unchanged text is not dirty. */
  initialName: string;
  /** One quiet line under the field about the save boundary. */
  helper: string;
  /** "Also adding Chris, Robin." when the save also adds picker selections. */
  note?: string;
  /** "Save", "Save and add", "Save and add 3 players". */
  saveLabel: string;
  /** Runs the operation; resolves `null` when it was accepted (the caller then leaves the editor). */
  onSave: (name: string) => Promise<EditorRejection | null>;
  /** Leaves without saving. Called after the discard question when the text was changed. */
  onClose: () => void;
  /** Wording of the discard question's reassurance. */
  unchangedNote?: string;
}

/**
 * Full-screen name editor for a saved player. Nothing is stored until the explicit Save; leaving
 * with changed text asks Keep editing / Discard changes. A rejected save keeps the typed text and
 * shows the reason next to the field.
 */
export function SavedPlayerEditor({
  title,
  backLabel,
  badges,
  context,
  initialName,
  helper,
  note,
  saveLabel,
  onSave,
  onClose,
  unchangedNote = 'Your saved players haven’t changed.',
}: SavedPlayerEditorProps) {
  const [text, setText] = useState(initialName);
  const [rejection, setRejection] = useState<EditorRejection | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const busy = useRef(false);
  const dirty = text !== initialName;

  const cancel = useCallback(() => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    // Android back means Cancel here: the editor is part of the screen, not a route of its own.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      cancel();
      return true;
    });
    return () => subscription.remove();
  }, [cancel]);

  const save = async () => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const result = await onSave(text);
      if (result) setRejection(result);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <Screen topBar={<TopBar backLabel={backLabel} backIcon="chevronLeft" onBack={cancel} />}>
        <ScreenHeader badges={badges} context={context} title={title} />
        <TextField
          label="Player name"
          icon="user"
          keyboard="text"
          value={text}
          onChangeText={(next) => {
            setText(next);
            // The reason belonged to the text that was rejected; Save checks the new text again.
            if (rejection) setRejection(null);
          }}
          error={rejection?.on === 'name' ? rejection.message : undefined}
          helper={helper}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void save()}
        />
        {note ? <Text tone="supporting">{note}</Text> : null}
        {rejection?.on === 'operation' ? <InlineNotice tone="error">{rejection.message}</InlineNotice> : null}
        <Stack direction="row">
          <View style={styles.cancel}>
            <Button label="Cancel" fullWidth onPress={cancel} />
          </View>
          <View style={styles.primary}>
            <Button
              label={saveLabel}
              variant="primary"
              fullWidth
              loading={saving}
              loadingLabel="Saving…"
              onPress={() => void save()}
            />
          </View>
        </Stack>
      </Screen>

      <Dialog
        visible={confirmDiscard}
        title="Discard this name edit?"
        cancelLabel="Keep editing"
        confirmLabel="Discard changes"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
      >
        <Text tone="supporting">{unchangedNote}</Text>
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  // Side by side when they fit; on narrow screens and large text Cancel sits above the save action.
  cancel: { flexGrow: 1, flexBasis: 100 },
  primary: { flexGrow: 2, flexBasis: 200 },
});
