/**
 * The in-memory state holder shared by every area of game management.
 *
 * Reads are synchronous from `state()`. `apply(next)` replaces the state at once (so the UI
 * re-renders immediately), notifies subscribers and queues a commit of the changed documents.
 * Commits run strictly one after another, each writing the latest content of every document changed
 * since the previous successful commit, so two quick operations never interleave on disk. If a
 * commit fails, its documents stay pending and are retried with the next commit.
 */
import type { DocumentStore } from '../storage/document-store';
import type { AppState } from './documents';
import { changedKeys, documentChanges } from './persistence';

export type PersistenceStatus =
  | { state: 'saved' }
  | { state: 'saving' }
  /** The last commit failed; the changes are still in memory and pending. */
  | { state: 'failed'; message: string };

export interface Runtime {
  state(): AppState;
  apply(next: AppState): Promise<void>;
  now(): Date;
  newId(): string;
  subscribe(listener: () => void): () => void;
  persistenceStatus(): PersistenceStatus;
  /** Resolves when every queued commit has finished (or failed). */
  flush(): Promise<void>;
  /** Memoizes a derived view while its dependencies keep the same identities. */
  memo<T>(key: string, deps: readonly unknown[], compute: () => T): T;
}

export function createRuntime(options: {
  initial: AppState;
  store: DocumentStore;
  now: () => Date;
  newId: () => string;
}): Runtime {
  let current = options.initial;
  const pending = new Set<string>();
  let queue: Promise<void> = Promise.resolve();
  let queued = 0;
  let status: PersistenceStatus = { state: 'saved' };
  const listeners = new Set<() => void>();
  const memos = new Map<string, { deps: readonly unknown[]; value: unknown }>();

  const notify = () => {
    for (const listener of [...listeners]) listener();
  };
  const setStatus = (next: PersistenceStatus) => {
    status = next;
    notify();
  };

  async function commitPending() {
    if (pending.size === 0) return;
    const keys = [...pending];
    pending.clear();
    try {
      await options.store.commit(documentChanges(current, keys));
    } catch (error) {
      for (const key of keys) pending.add(key);
      throw error;
    }
  }

  return {
    state: () => current,
    now: options.now,
    newId: options.newId,
    apply(next) {
      const keys = changedKeys(current, next);
      if (keys.length === 0) return Promise.resolve();
      current = next;
      for (const key of keys) pending.add(key);
      queued += 1;
      if (status.state !== 'saving') status = { state: 'saving' };
      notify();
      const run = queue.then(commitPending).then(
        () => {
          queued -= 1;
          if (queued === 0) setStatus({ state: 'saved' });
        },
        (error: unknown) => {
          queued -= 1;
          setStatus({ state: 'failed', message: error instanceof Error ? error.message : String(error) });
          throw error;
        },
      );
      queue = run.catch(() => undefined);
      return run;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    persistenceStatus: () => status,
    flush: () => queue,
    memo(key, deps, compute) {
      const cached = memos.get(key);
      if (cached && cached.deps.length === deps.length && cached.deps.every((dep, i) => dep === deps[i])) {
        return cached.value as ReturnType<typeof compute>;
      }
      const value = compute();
      memos.set(key, { deps, value });
      return value;
    },
  };
}
