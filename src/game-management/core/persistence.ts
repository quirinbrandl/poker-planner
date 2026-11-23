/**
 * Mapping between `AppState` and stored documents, and the schema-version guard.
 */
import type { DocumentChange } from '../storage/document-store';
import { type AppState, EMPTY_STATE, type GameDocument, SCHEMA_VERSION } from './documents';

const META_KEY = 'meta';
const PLAYERS_KEY = 'savedPlayers';
const TEMPLATES_KEY = 'templates';
const LOCATION_KEY = 'location';
const GAME_PREFIX = 'game/';

/** Thrown at startup when stored data was written by a newer app version. Nothing is written. */
export class UnsupportedDataVersionError extends Error {
  constructor(readonly storedVersion: number) {
    super(
      `Saved data uses format version ${storedVersion}, but this app only understands up to ${SCHEMA_VERSION}. Update the app; your data was left untouched.`,
    );
    this.name = 'UnsupportedDataVersionError';
  }
}

/** Thrown at startup when a stored document cannot be read. Nothing is written. */
export class CorruptDataError extends Error {
  constructor(readonly key: string) {
    super(`Saved data "${key}" could not be read; it was left untouched.`);
    this.name = 'CorruptDataError';
  }
}

export function stateFromDocuments(documents: ReadonlyMap<string, string>): AppState {
  const read = <T>(key: string): T | undefined => {
    const text = documents.get(key);
    if (text === undefined) return undefined;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new CorruptDataError(key);
    }
  };

  const meta = read<{ schemaVersion: number }>(META_KEY);
  const version = meta?.schemaVersion ?? SCHEMA_VERSION;
  if (typeof version !== 'number' || version > SCHEMA_VERSION) {
    throw new UnsupportedDataVersionError(Number(version));
  }
  // Future: migrate older versions here before reading.

  const games: Record<string, GameDocument> = {};
  for (const key of documents.keys()) {
    if (!key.startsWith(GAME_PREFIX)) continue;
    const game = read<GameDocument>(key);
    if (!game || typeof game.id !== 'string' || !game.planning) throw new CorruptDataError(key);
    games[game.id] = game;
  }

  return {
    games,
    savedPlayers: read<{ players: AppState['savedPlayers'] }>(PLAYERS_KEY)?.players ?? EMPTY_STATE.savedPlayers,
    templates: read<{ templates: AppState['templates'] }>(TEMPLATES_KEY)?.templates ?? EMPTY_STATE.templates,
    location: read<{ location: AppState['location'] }>(LOCATION_KEY)?.location ?? EMPTY_STATE.location,
  };
}

/** Keys whose documents differ between two states (by reference; states are immutable). */
export function changedKeys(before: AppState, after: AppState): string[] {
  const keys: string[] = [];
  if (before.games !== after.games) {
    for (const id of new Set([...Object.keys(before.games), ...Object.keys(after.games)])) {
      if (before.games[id] !== after.games[id]) keys.push(GAME_PREFIX + id);
    }
  }
  if (before.savedPlayers !== after.savedPlayers) keys.push(PLAYERS_KEY);
  if (before.templates !== after.templates) keys.push(TEMPLATES_KEY);
  if (before.location !== after.location) keys.push(LOCATION_KEY);
  return keys;
}

/** The document changes that write `keys` as they are in `state`, plus the schema marker. */
export function documentChanges(state: AppState, keys: Iterable<string>): DocumentChange[] {
  const changes: DocumentChange[] = [{ key: META_KEY, text: JSON.stringify({ schemaVersion: SCHEMA_VERSION }) }];
  for (const key of keys) {
    let value: unknown;
    if (key.startsWith(GAME_PREFIX)) value = state.games[key.slice(GAME_PREFIX.length)];
    else if (key === PLAYERS_KEY) value = { players: state.savedPlayers };
    else if (key === TEMPLATES_KEY) value = { templates: state.templates };
    else if (key === LOCATION_KEY) value = { location: state.location };
    changes.push({ key, text: value === undefined ? null : JSON.stringify(value) });
  }
  return changes;
}
