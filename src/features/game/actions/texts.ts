import type { GameActionsPhase } from './types';

/**
 * The lifecycle toasts, in one place so every screen uses the same words. `useToast` draws the
 * ✓ itself (tone `confirmed`), so the strings carry no tick.
 */
export const GAME_TOASTS = {
  finished: 'Game finished',
  reopened: 'Game reopened',
  backInPlanning: 'Back in Planning',
  deleted: 'Game deleted',
} as const;

/** The reopened game's line under Calculate Payments on Results. */
export const REOPENED_NOTE = 'Reopened · calculate Payments again when you’re done.';

/** The reopened game's entry line on its Games card (the card adds the arrow). */
export const REOPENED_ENTRY = 'Reopened · calculate Payments again';

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Return to Planning? “Clears” parts with zero counts left out. Cash games have no eliminations;
 * pass 0. Handed-out stacks are always cleared.
 */
export function clearsParts({ eliminations, rebuys, results }: { eliminations: number; rebuys: number; results: number }): string[] {
  const parts: string[] = [];
  if (eliminations > 0) parts.push(count(eliminations, 'elimination', 'eliminations'));
  if (rebuys > 0) parts.push(count(rebuys, 'rebuy', 'rebuys'));
  if (results > 0) parts.push(count(results, 'result', 'results'));
  parts.push('all handed-out stacks');
  return parts;
}

/** Return to Planning? “Keeps” parts: players, buy-ins, settings and, in a tournament, the payout schedule. */
export function keepsParts({ players, mode }: { players: number; mode: 'cash' | 'tournament' }): string[] {
  const parts = [count(players, 'player', 'players'), 'buy-ins', 'settings'];
  if (mode === 'tournament') parts.push('payout schedule');
  return parts;
}

/** The actions the sheet offers in each phase, in order. Completed never offers Return to Planning. */
export const PHASE_ACTIONS = {
  planning: ['delete'],
  inProgress: ['returnToPlanning', 'delete'],
  completed: ['reopen', 'delete'],
} as const satisfies Record<GameActionsPhase, readonly string[]>;
