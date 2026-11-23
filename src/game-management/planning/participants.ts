/**
 * The game's roster: capturing saved players as participants and removing participants.
 */
import type { GameDocument, Participant, SavedPlayer } from '../core/documents';
import { problem } from '../core/problems';
import { type Accepted, type GameAccessCode, type Rejected, rejected } from '../core/results';
import type { Runtime } from '../core/runtime';
import { prepareSavedPlayer, type SavedPlayerNameCode } from '../reusable/saved-players';
import { byName, nameKey } from '../shared/names';
import { findGame, planningGame, withDraft, withGame } from './draft';

export interface PlayerPickerEntry {
  savedPlayerId: string;
  /** The saved player's current name. */
  name: string;
  /** Already a participant of this game (matched by identity, not by name): not selectable. */
  inGame: boolean;
  /** The name captured in this game, when `inGame` (may differ after a rename). */
  capturedName: string | null;
}

export type AddPlayersCode = 'noPlayersSelected' | 'savedPlayerNotFound' | 'alreadyInGame' | 'nameTakenInGame';
export type AddSavedPlayersResult = Accepted<{ participantIds: string[] }> | Rejected<GameAccessCode | AddPlayersCode>;
export type CreateSavedPlayerAndAddResult =
  | Accepted<{ savedPlayerId: string; participantIds: string[] }>
  | Rejected<GameAccessCode | AddPlayersCode | SavedPlayerNameCode>;
export type RemoveParticipantResult = Accepted | Rejected<GameAccessCode | 'participantNotFound'>;

/**
 * Validates capturing `players` into `game` as one batch: each saved player at most once and not
 * already in the game; captured names unique in the game ignoring case and outer spaces.
 */
function captureBatch(
  game: GameDocument,
  players: readonly SavedPlayer[],
  newId: () => string,
): { ok: true; participants: Participant[] } | { ok: false; rejection: Rejected<AddPlayersCode> } {
  if (players.length === 0) return { ok: false, rejection: rejected('noPlayersSelected', 'Select at least one player.') };
  const roster = game.planning.participants;
  const takenNames = new Map(roster.map((p) => [nameKey(p.name), p.name]));
  const takenIds = new Set(roster.map((p) => p.savedPlayerId));
  const added: Participant[] = [];
  for (const player of players) {
    if (takenIds.has(player.id)) {
      const captured = roster.find((p) => p.savedPlayerId === player.id);
      return {
        ok: false,
        rejection: rejected('alreadyInGame', `${captured?.name ?? player.name} is already in this game.`),
      };
    }
    const clash = takenNames.get(nameKey(player.name));
    if (clash !== undefined) {
      const message = `This game already has a player named “${clash}”. Use a distinguishing name.`;
      return { ok: false, rejection: rejected('nameTakenInGame', message, [problem('duplicateName', 'name', message)]) };
    }
    takenIds.add(player.id);
    takenNames.set(nameKey(player.name), player.name);
    added.push({ id: newId(), name: player.name.trim(), savedPlayerId: player.id });
  }
  return { ok: true, participants: added };
}

function withParticipants(game: GameDocument, participants: Participant[]): GameDocument {
  return withDraft(game, (draft) => ({ ...draft, participants: [...draft.participants, ...participants] }));
}

export function createParticipantOperations(rt: Runtime) {
  return {
    /** The saved-player picker for a game: alphabetical, marking players already in the game. */
    getPlayerPicker(gameId: string): readonly PlayerPickerEntry[] | null {
      const state = rt.state();
      const game = findGame(state, gameId);
      if (!game || game.phase !== 'planning') return null;
      return rt.memo(`planning.picker:${gameId}`, [game, state.savedPlayers], () =>
        [...state.savedPlayers].sort(byName).map((player) => {
          const captured = game.planning.participants.find((p) => p.savedPlayerId === player.id);
          return {
            savedPlayerId: player.id,
            name: player.name,
            inGame: captured !== undefined,
            capturedName: captured?.name ?? null,
          };
        }),
      );
    },

    /** Add N players: captures the selected saved players, in the given order, all or nothing. */
    async addSavedPlayers(gameId: string, savedPlayerIds: readonly string[]): Promise<AddSavedPlayersResult> {
      const state = rt.state();
      const access = planningGame(state, gameId);
      if (!access.ok) return access.rejection;
      const players: SavedPlayer[] = [];
      for (const id of new Set(savedPlayerIds)) {
        const player = state.savedPlayers.find((p) => p.id === id);
        if (!player) return rejected('savedPlayerNotFound', 'A selected saved player no longer exists.');
        players.push(player);
      }
      const batch = captureBatch(access.game, players, rt.newId);
      if (!batch.ok) return batch.rejection;
      await rt.apply(withGame(state, withParticipants(access.game, batch.participants)));
      return { status: 'accepted', participantIds: batch.participants.map((p) => p.id) };
    },

    /**
     * Save and add (N players): creates a saved player named `name` and captures it — after any
     * `alsoAddSavedPlayerIds` selected in the picker — into the game. All or nothing.
     */
    async createSavedPlayerAndAdd(
      gameId: string,
      name: string,
      alsoAddSavedPlayerIds: readonly string[] = [],
    ): Promise<CreateSavedPlayerAndAddResult> {
      const state = rt.state();
      const access = planningGame(state, gameId);
      if (!access.ok) return access.rejection;
      const prepared = prepareSavedPlayer(state, name, rt.newId());
      if (!prepared.ok) return prepared.rejection;
      const players: SavedPlayer[] = [];
      for (const id of new Set(alsoAddSavedPlayerIds)) {
        const player = state.savedPlayers.find((p) => p.id === id);
        if (!player) return rejected('savedPlayerNotFound', 'A selected saved player no longer exists.');
        players.push(player);
      }
      players.push(prepared.player);
      const batch = captureBatch(access.game, players, rt.newId);
      if (!batch.ok) return batch.rejection;
      await rt.apply({
        ...withGame(state, withParticipants(access.game, batch.participants)),
        savedPlayers: [...state.savedPlayers, prepared.player],
      });
      return {
        status: 'accepted',
        savedPlayerId: prepared.player.id,
        participantIds: batch.participants.map((p) => p.id),
      };
    },

    /**
     * Removes a Planning participant (the screen confirms first). Other participants keep their ids
     * and order; the saved player is untouched; an automatic reserve follows the new roster.
     */
    async removeParticipant(gameId: string, participantId: string): Promise<RemoveParticipantResult> {
      const state = rt.state();
      const access = planningGame(state, gameId);
      if (!access.ok) return access.rejection;
      if (!access.game.planning.participants.some((p) => p.id === participantId)) {
        return rejected('participantNotFound', 'This player is no longer in the game.');
      }
      const next = withDraft(access.game, (draft) => ({
        ...draft,
        participants: draft.participants.filter((p) => p.id !== participantId),
      }));
      await rt.apply(withGame(state, next));
      return { status: 'accepted' };
    },
  };
}
