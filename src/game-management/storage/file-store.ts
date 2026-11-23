import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { DocumentStore } from './document-store';
import { createJournaledStore } from './journaled-store';

/**
 * File-backed document store on Node `fs`, for tests and tooling only (never bundled into the app).
 * One file per document in `directory`; each file write goes to a temporary file that is then
 * renamed over the target, and multi-document commits go through a journal file.
 */
export function createFileStore(directory: string): DocumentStore {
  const fileFor = (key: string) => path.join(directory, `${encodeURIComponent(key)}.json`);
  let tempCounter = 0;

  return createJournaledStore({
    async keys() {
      await mkdir(directory, { recursive: true });
      const names = await readdir(directory);
      return names.filter((name) => name.endsWith('.json')).map((name) => decodeURIComponent(name.slice(0, -5)));
    },
    async get(key) {
      try {
        return await readFile(fileFor(key), 'utf8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
      }
    },
    async set(key, value) {
      await mkdir(directory, { recursive: true });
      tempCounter += 1;
      const temp = path.join(directory, `.${process.pid}.${tempCounter}.tmp`);
      await writeFile(temp, value, 'utf8');
      await rename(temp, fileFor(key));
    },
    async remove(key) {
      await rm(fileFor(key), { force: true });
    },
  });
}
