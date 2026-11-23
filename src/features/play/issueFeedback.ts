/**
 * Hands the confirmation of an issuance made on another screen (late entry) to Play, which shows
 * it once when it comes back into focus. Screen state only: nothing here is game data.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import type { IssueFeedback } from '@/game-management';

const pending = new Map<string, IssueFeedback>();

/** Leaves `feedback` for the game's Play screen. */
export function postIssueFeedback(gameId: string, feedback: IssueFeedback): void {
  pending.set(gameId, feedback);
}

/** Calls `show` with feedback left for this game whenever the screen gains focus. */
export function useIssueFeedback(gameId: string, show: (feedback: IssueFeedback) => void): void {
  useFocusEffect(
    useCallback(() => {
      const feedback = pending.get(gameId);
      if (!feedback) return;
      pending.delete(gameId);
      show(feedback);
    }, [gameId, show]),
  );
}
