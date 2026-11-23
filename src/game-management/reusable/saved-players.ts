/**
 * Saved (reusable) players. A game captures a participant's name when the player is added; renaming
 * or deleting a saved player never changes any game.
 */
import type { AppState, SavedPlayer } from '../core/documents';
import { type Accepted, type Rejected, rejected } from '../core/results';
import type { Runtime } from '../core/runtime';
import { byName, checkName } from '../shared/names';

export interface SavedPlayerView {
  id: string;
  name: string;
}

export type SavedPlayerNameCode = 'nameRequired' | 'duplicateName';
export type CreateSavedPlayerResult = Accepted<{ savedPlayerId: string }> | Rejected<SavedPlayerNameCode>;
export type RenameSavedPlayerResult = Accepted | Rejected<SavedPlayerNameCode | 'savedPlayerNotFound'>;
export type DeleteSavedPlayerResult = Accepted | Rejected<'savedPlayerNotFound'>;

/** Validates a new saved player; does not change state. */
export function prepareSavedPlayer(
  state: AppState,
  rawName: string,
  id: string,
): { ok: true; player: SavedPlayer } | { ok: false; rejection: Rejected<SavedPlayerNameCode> } {
  const check = checkName(
    rawName,
    state.savedPlayers.map((p) => p.name),
    'player',
  );
  if (!check.ok) {
    return {
      ok: false,
      rejection: rejected(check.problem.code as SavedPlayerNameCode, check.problem.message, [check.problem]),
    };
  }
  return { ok: true, player: { id, name: check.name } };
}

export function createSavedPlayerOperations(rt: Runtime) {
  return {
    /** Saved players in alphabetical order. */
    list(): readonly SavedPlayerView[] {
      const players = rt.state().savedPlayers;
      return rt.memo('savedPlayers.list', [players], () => [...players].sort(byName));
    },

    /** Creates a saved player. Name required; trimmed; unique ignoring case and outer spaces. */
    async create(name: string): Promise<CreateSavedPlayerResult> {
      const state = rt.state();
      const prepared = prepareSavedPlayer(state, name, rt.newId());
      if (!prepared.ok) return prepared.rejection;
      await rt.apply({ ...state, savedPlayers: [...state.savedPlayers, prepared.player] });
      return { status: 'accepted', savedPlayerId: prepared.player.id };
    },

    /** Renames a saved player for future selections. No game changes. */
    async rename(savedPlayerId: string, name: string): Promise<RenameSavedPlayerResult> {
      const state = rt.state();
      const existing = state.savedPlayers.find((p) => p.id === savedPlayerId);
      if (!existing) return rejected('savedPlayerNotFound', 'This saved player no longer exists.');
      const check = checkName(
        name,
        state.savedPlayers.filter((p) => p.id !== savedPlayerId).map((p) => p.name),
        'player',
      );
      if (!check.ok) {
        return rejected(check.problem.code as SavedPlayerNameCode, check.problem.message, [check.problem]);
      }
      if (check.name === existing.name) return { status: 'accepted' };
      await rt.apply({
        ...state,
        savedPlayers: state.savedPlayers.map((p) => (p.id === savedPlayerId ? { ...p, name: check.name } : p)),
      });
      return { status: 'accepted' };
    },

    /** Deletes a saved player. Games keep their captured participants. */
    async delete(savedPlayerId: string): Promise<DeleteSavedPlayerResult> {
      const state = rt.state();
      if (!state.savedPlayers.some((p) => p.id === savedPlayerId)) {
        return rejected('savedPlayerNotFound', 'This saved player no longer exists.');
      }
      await rt.apply({ ...state, savedPlayers: state.savedPlayers.filter((p) => p.id !== savedPlayerId) });
      return { status: 'accepted' };
    },
  };
}
