import type { DocumentStore } from './document-store';

/** In-memory document store for screen tests and the design gallery. Lost when the process ends. */
export function createMemoryStore(initial?: ReadonlyMap<string, string>): DocumentStore {
  const documents = new Map(initial);
  return {
    async loadAll() {
      return new Map(documents);
    },
    async commit(changes) {
      for (const change of changes) {
        if (change.text === null) documents.delete(change.key);
        else documents.set(change.key, change.text);
      }
    },
  };
}
