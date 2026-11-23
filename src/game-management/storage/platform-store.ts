import type { DocumentStore } from './document-store';

/**
 * Fallback for environments without a platform store (Node, tests). Metro picks
 * `platform-store.native.ts` on Android/iOS and `platform-store.web.ts` on web. Tests inject a store.
 */
export async function openPlatformStore(): Promise<DocumentStore> {
  throw new Error('No platform document store in this environment; pass a store explicitly.');
}
