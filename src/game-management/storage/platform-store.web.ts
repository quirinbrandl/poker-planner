import type { DocumentStore } from './document-store';
import { createLocalStorageStore } from './local-storage-store';

/** Web preview: the browser's `localStorage`. */
export async function openPlatformStore(): Promise<DocumentStore> {
  return createLocalStorageStore(window.localStorage);
}
