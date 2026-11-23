import type { DocumentStore } from './document-store';
import { createJournaledStore } from './journaled-store';

/**
 * `localStorage` document store for the web preview that developers use for layout checks.
 * Not a product platform; documents live under `prefix` in the browser's storage.
 */
export function createLocalStorageStore(storage: Storage, prefix = 'poker-planner/'): DocumentStore {
  return createJournaledStore({
    async keys() {
      const keys: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key !== null && key.startsWith(prefix)) keys.push(key.slice(prefix.length));
      }
      return keys;
    },
    async get(key) {
      return storage.getItem(prefix + key);
    },
    async set(key, value) {
      storage.setItem(prefix + key, value);
    },
    async remove(key) {
      storage.removeItem(prefix + key);
    },
  });
}
