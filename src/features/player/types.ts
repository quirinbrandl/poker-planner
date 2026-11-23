/**
 * Data contracts of the player page and its two popups (Undo rebuy, Return to play).
 * Plain data only: game management fills these.
 */
import type { BuyInRecord, PlayerResult, ReturnToPlayData } from '@/game-management';

export type { BuyInRecord, PlayerResult, ReturnToPlayData, UndoRebuyData } from '@/game-management';

/** Everything the player page shows. */
export interface PlayerPageData {
  /** Completed shows the page read-only. */
  phase: 'inProgress' | 'completed';
  /** "Cash game · 16 Nov, 19:30". */
  context: string;
  /** Participant id: passed back in callbacks. */
  playerId: string;
  name: string;
  /** Where Back leads: "Back to Play", "Back to Results", "Back to Payments". */
  backLabel: string;
  /** Confirmed result, or `null` while the player is still playing. */
  result: PlayerResult | null;
  /** No result yet but a saved count draft (Count final chips reads "Resume count"). */
  countDraft: boolean;
  /** Buy-ins total: "EUR 40.00". */
  buyInsTotalText: string;
  /** Initial buy-in first, then rebuys in order. */
  buyIns: readonly BuyInRecord[];
  /** What the Return to play popup shows; `null` without a result or when read-only. */
  returnToPlay: ReturnToPlayData | null;
}


