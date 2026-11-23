import type { GameMode, GamePhase } from '@/domain/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** "9 Nov 2026 · 19:30" in the phone's local time. */
export function formatGameDateTime(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} · ${clock(date)}`;
}

/** "23 Nov, 19:30": the short form used in workspace context lines. */
export function formatShortDateTime(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${clock(date)}`;
}

/** "19:30" */
export function formatTime(iso: string): string {
  return clock(new Date(iso));
}

export function modeLabel(mode: GameMode): string {
  return mode === 'cash' ? 'Cash game' : 'Tournament';
}

export function phaseLabel(phase: GamePhase): string {
  if (phase === 'planning') return 'Planning';
  return phase === 'inProgress' ? 'In progress' : 'Completed';
}

/** "1 player", "6 players" */
export function playerCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'player' : 'players'}`;
}
