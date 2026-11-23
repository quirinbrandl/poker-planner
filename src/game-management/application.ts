import { EMPTY_STATE } from './core/documents';
import { stateFromDocuments } from './core/persistence';
import { createRuntime, type PersistenceStatus } from './core/runtime';
import { createGamesApi } from './games/games';
import { createLocationApi } from './location/working-location';
import { createPlanningApi } from './planning';
import { createSavedPlayerOperations } from './reusable/saved-players';
import { createTemplateOperations } from './reusable/templates';
import type { DocumentStore } from './storage/document-store';

export interface GameManagementOptions {
  store: DocumentStore;
  /** Clock for creation dates. Default: the system clock. */
  now?: () => Date;
  /** Id generator for games, participants, rows and records. Default: random ids. */
  newId?: () => string;
}

function randomId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return random;
  const hex = () => Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
  return `${hex()}-${hex()}-${hex()}-${hex()}`;
}

/**
 * Loads all saved data from `store` and returns the application. Rejects with
 * `UnsupportedDataVersionError` or `CorruptDataError` (writing nothing) if the data cannot be used.
 */
export async function createGameManagement(options: GameManagementOptions) {
  const documents = await options.store.loadAll();
  const initial = documents.size === 0 ? EMPTY_STATE : stateFromDocuments(documents);
  const rt = createRuntime({
    initial,
    store: options.store,
    now: options.now ?? (() => new Date()),
    newId: options.newId ?? randomId,
  });

  return {
    /** Calls `listener` after every change (state or persistence status). Returns unsubscribe. */
    subscribe: rt.subscribe,
    games: createGamesApi(rt),
    planning: createPlanningApi(rt),
    savedPlayers: createSavedPlayerOperations(rt),
    templates: createTemplateOperations(rt),
    location: createLocationApi(rt),
    persistence: {
      /** `saving` while commits are pending; `failed` if the last commit failed (changes stay pending). */
      getStatus: (): PersistenceStatus => rt.persistenceStatus(),
      /** Resolves when all queued commits have finished. */
      flush: (): Promise<void> => rt.flush(),
    },
  };
}

export type GameManagement = Awaited<ReturnType<typeof createGameManagement>>;
