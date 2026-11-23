import { type EditorRejection, SavedPlayerEditor } from '@/features/players/SavedPlayerEditor';
import { Badge, BadgeRow } from '@/ui';

export interface NewEntryNameEditorProps {
  /** "Cash game · 13 Nov, 19:30". */
  context: string;
  /** Starting text, e.g. the search text when nothing matched. */
  initialName: string;
  /**
   * Save the name as a reusable player and stage it as the choice. Resolves `null` when saved
   * (the host then returns to the selection with it selected), or the rejection to show.
   * Saving never adds the player to the game.
   */
  onSave: (name: string) => Promise<EditorRejection | null>;
  /** Back to the selection without saving. */
  onClose: () => void;
}

/** New player during late entry: an explicit Save and select, separate from joining the game. */
export function NewEntryNameEditor({ context, initialName, onSave, onClose }: NewEntryNameEditorProps) {
  return (
    <SavedPlayerEditor
      title="New player"
      backLabel="Back"
      badges={
        <BadgeRow>
          <Badge label="In progress" tone="primary" />
        </BadgeRow>
      }
      context={context}
      initialName={initialName}
      helper="Saved for future games. Selecting does not add them to this game yet."
      saveLabel="Save and select"
      unchangedNote="Your saved players and this game haven’t changed."
      onSave={onSave}
      onClose={onClose}
    />
  );
}
