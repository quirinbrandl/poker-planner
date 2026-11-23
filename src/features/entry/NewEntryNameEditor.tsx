import { type EditorRejection, SavedPlayerEditor } from '@/features/players/SavedPlayerEditor';

export interface NewEntryNameEditorProps {
  /** "Cash game · 13 Nov, 19:30". Kept for callers; a sub-page inside a game shows no context line. */
  context?: string;
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
export function NewEntryNameEditor({ initialName, onSave, onClose }: NewEntryNameEditorProps) {
  return (
    <SavedPlayerEditor
      title="New player"
      backLabel="Back"
      initialName={initialName}
      helper=""
      saveLabel="Save and select"
      unchangedNote="Your saved players and this game haven’t changed."
      onSave={onSave}
      onClose={onClose}
    />
  );
}
