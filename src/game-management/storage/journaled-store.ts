import type { DocumentChange, DocumentStore } from './document-store';

/**
 * A key-value backend whose single-key writes are atomic but which has no multi-key transaction
 * (a directory of files, `localStorage`). `createJournaledStore` adds atomic multi-key commits on top.
 */
export interface KeyValueBackend {
  keys(): Promise<string[]>;
  get(key: string): Promise<string | null>;
  /** Must replace the value atomically (no torn writes). */
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const JOURNAL_KEY = '__journal__';

/**
 * Multi-key atomicity through a write-ahead journal: the whole commit is first written as one
 * journal entry (atomic), then applied key by key, then the journal is removed. If the process dies
 * part-way, the next load replays the journal, so a commit is either fully applied or not at all.
 */
export function createJournaledStore(backend: KeyValueBackend): DocumentStore {
  async function apply(changes: readonly DocumentChange[]) {
    for (const change of changes) {
      if (change.text === null) await backend.remove(change.key);
      else await backend.set(change.key, change.text);
    }
  }

  return {
    async loadAll() {
      const journal = await backend.get(JOURNAL_KEY);
      if (journal !== null) {
        await apply(JSON.parse(journal) as DocumentChange[]);
        await backend.remove(JOURNAL_KEY);
      }
      const result = new Map<string, string>();
      for (const key of await backend.keys()) {
        if (key === JOURNAL_KEY) continue;
        const text = await backend.get(key);
        if (text !== null) result.set(key, text);
      }
      return result;
    },
    async commit(changes) {
      if (changes.length === 0) return;
      if (changes.some((change) => change.key === JOURNAL_KEY)) {
        throw new Error(`"${JOURNAL_KEY}" is a reserved document key`);
      }
      if (changes.length === 1) {
        await apply(changes);
        return;
      }
      await backend.set(JOURNAL_KEY, JSON.stringify(changes));
      await apply(changes);
      await backend.remove(JOURNAL_KEY);
    },
  };
}
