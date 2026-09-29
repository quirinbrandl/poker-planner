import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  createGameManagement,
  type LocalDatabase,
} from '../../src/game-management';

// A real SQLite adapter, not an in-memory replacement for persistence.
// Only provisioning/cleanup happens here; tests observe the application interface.
export function isolatedStore() {
  const directory = mkdtempSync(join(tmpdir(), 'poker-planner-'));
  const connections: ReturnType<typeof createGameManagement>[] = [];
  return {
    open({ readOnly = false } = {}) {
      const sqlite = new DatabaseSync(join(directory, 'games.db'), {
        readOnly,
      });
      const database: LocalDatabase = {
        execSync: (sql) => sqlite.exec(sql),
        runSync: (sql, ...params) => sqlite.prepare(sql).run(...params),
        getFirstSync: <T>(sql: string, ...params: (string | number)[]) =>
          (sqlite.prepare(sql).get(...params) as T | undefined) ?? null,
        getAllSync: <T>(sql: string, ...params: (string | number)[]) =>
          sqlite.prepare(sql).all(...params) as T[],
        closeSync: () => sqlite.close(),
      };
      const games = createGameManagement(database, randomUUID);
      connections.push(games);
      return games;
    },
    dispose() {
      for (const games of connections) games.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
