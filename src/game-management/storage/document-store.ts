/**
 * The persistence port of game management: string keys mapped to JSON text.
 *
 * Game management loads every document once at startup and afterwards only writes. Each accepted
 * operation commits all documents it changed in one atomic `commit`: after a crash or failure either
 * every change of that commit is visible on the next `loadAll`, or none is.
 */
export interface DocumentStore {
  /** Every stored document. Keys and texts exactly as last committed. */
  loadAll(): Promise<ReadonlyMap<string, string>>;
  /** Atomically writes (`text` is a string) and deletes (`text` is `null`) documents. */
  commit(changes: readonly DocumentChange[]): Promise<void>;
}

export interface DocumentChange {
  key: string;
  /** New JSON text, or `null` to delete the document. */
  text: string | null;
}
