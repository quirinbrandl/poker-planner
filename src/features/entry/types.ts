/**
 * Display contracts of late entry (Add player and the Add <name> popup). Plain data only: game
 * management computes every value and wording (see `@/game-management`); the screens only show it.
 */
import type { AddPlayerScreenView } from '@/game-management';

export type { EntryCandidate, EntryPopupData } from '@/game-management';

/** What the Add player screen shows besides the staged selection. */
export interface AddPlayerData extends AddPlayerScreenView {
  /** "Cash game · 13 Nov, 19:30". */
  context: string;
}

/** One quiet line under the list: the outcome of the last review, or why Review entry cannot run. */
export interface EntryNotice {
  tone: 'info' | 'error';
  /** "Nora has not joined." */
  message: string;
}
