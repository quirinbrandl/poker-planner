import { formatGameDateTime, formatTime, modeLabel, participantNamesLabel } from '@/features/shared/format';
import type { HistoryGameView } from '@/game-management';

import type { HistoryCardData } from './types';

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "23 Nov 2026 · 19:30–23:41", or "23 Nov 2026 · 19:30–24 Nov 2026 · 01:10" past midnight (local time). */
export function playedTimeText(createdAt: string, finishedAt: string): string {
  const end = sameDay(new Date(createdAt), new Date(finishedAt)) ? formatTime(finishedAt) : formatGameDateTime(finishedAt);
  return `${formatGameDateTime(createdAt)}–${end}`;
}

/** A History card from game management's `HistoryGameView`. */
export function historyCardData(game: HistoryGameView): HistoryCardData {
  return {
    gameId: game.gameId,
    modeLabel: modeLabel(game.mode),
    namesText: participantNamesLabel(game.participantNames),
    dateText: playedTimeText(game.createdAt, game.finishedAt),
    facts: game.facts,
  };
}
