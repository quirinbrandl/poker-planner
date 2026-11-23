import type { TournamentActionResult } from './types';

/** A game-management result as the tournament screens take it: accepted, or rejected with its message. */
export function actionResult(
  result: { status: 'accepted' } | { status: 'rejected'; reason: { message: string } },
): TournamentActionResult {
  return result.status === 'accepted' ? { status: 'accepted' } : { status: 'rejected', message: result.reason.message };
}
