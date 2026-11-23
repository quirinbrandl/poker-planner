import type { SQLiteDatabase } from 'expo-sqlite';

import type { DocumentStore } from './document-store';

/**
 * SQLite document store for Android and iOS (`expo-sqlite`). One table of key → JSON text; each
 * commit runs in one exclusive transaction.
 */
export async function openSqliteStore(databaseName = 'poker-planner.db'): Promise<DocumentStore> {
  const SQLite = await import('expo-sqlite');
  const db = await SQLite.openDatabaseAsync(databaseName);
  await db.execAsync(
    'PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS documents (key TEXT PRIMARY KEY NOT NULL, text TEXT NOT NULL);',
  );
  return createSqliteStore(db);
}

export function createSqliteStore(db: SQLiteDatabase): DocumentStore {
  return {
    async loadAll() {
      const rows = await db.getAllAsync<{ key: string; text: string }>('SELECT key, text FROM documents');
      return new Map(rows.map((row) => [row.key, row.text]));
    },
    async commit(changes) {
      if (changes.length === 0) return;
      await db.withExclusiveTransactionAsync(async (txn) => {
        for (const change of changes) {
          if (change.text === null) {
            await txn.runAsync('DELETE FROM documents WHERE key = ?', change.key);
          } else {
            await txn.runAsync(
              'INSERT INTO documents (key, text) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET text = excluded.text',
              change.key,
              change.text,
            );
          }
        }
      });
    },
  };
}
