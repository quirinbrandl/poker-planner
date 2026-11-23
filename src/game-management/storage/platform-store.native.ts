import type { DocumentStore } from './document-store';
import { openSqliteStore } from './sqlite-store';

/** Android and iOS: the app-private SQLite database. */
export function openPlatformStore(): Promise<DocumentStore> {
  return openSqliteStore();
}
