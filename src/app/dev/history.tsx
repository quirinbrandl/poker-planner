/**
 * Development only: History and the Games cards with fixture data (nothing is stored).
 *   /dev/history?state=saved|empty|after-delete|long      History
 *     |games|games-reopened|games-empty                   Games with In progress, reopened and Planning cards
 */
import { useLocalSearchParams } from 'expo-router';

import { GamesView } from '@/features/games/GamesView';
import type { GameCardData, GamesData } from '@/features/games/types';
import { HISTORY_FIXTURES, type HistoryFixtureName } from '@/features/history/fixtures';
import { HistoryView } from '@/features/history/HistoryView';
import { useToast } from '@/ui';

const PLANNING: GameCardData = {
  id: 'g2',
  phase: 'planning',
  identityLabel: 'Planning · Cash game',
  modeText: 'Cash game',
  reopened: false,
  progress: { current: 4, count: 5 },
  namesText: 'Maya, Jonas, Lena, Sam, Alex, Noor',
  dateText: '25 Nov 2026 · 19:30',
  entryText: 'Resume game settings',
};

const IN_PROGRESS: GameCardData = {
  id: 'g1',
  phase: 'inProgress',
  identityLabel: 'In progress · Cash game',
  modeText: 'Cash game',
  reopened: false,
  progress: null,
  namesText: 'Alice, Bob, Clara, David, Emma, Felix',
  dateText: '23 Nov 2026 · 19:30',
  entryText: 'Open Play',
};

const GAMES: Record<string, GamesData> = {
  games: { inProgress: [IN_PROGRESS], planning: [PLANNING], historyCount: 3 },
  'games-reopened': {
    inProgress: [{ ...IN_PROGRESS, reopened: true, entryText: 'Reopened · calculate Payments again' }],
    planning: [PLANNING],
    historyCount: 3,
  },
  'games-empty': { inProgress: [], planning: [], historyCount: 0 },
};

export default function HistoryDevRoute() {
  const { state = 'saved' } = useLocalSearchParams<{ state?: string }>();
  const toast = useToast();
  const fixture = (what: string) => () => toast.show(`${what} (fixture)`);

  const games = GAMES[state];
  if (games) {
    return (
      <GamesView
        data={games}
        onNewGame={fixture('New game')}
        onOpenGame={(id) => toast.show(`Opens ${id} (fixture)`)}
        onOpenHistory={fixture('History')}
        onOpenSavedPlayers={fixture('Saved players')}
        onOpenTemplates={fixture('Chip set templates')}
      />
    );
  }
  const name: HistoryFixtureName = state in HISTORY_FIXTURES ? (state as HistoryFixtureName) : 'saved';
  return (
    <HistoryView
      data={HISTORY_FIXTURES[name]}
      onBack={fixture('Back to Games')}
      onOpenGame={(id) => toast.show(`Opens Payments of ${id} with ← History (fixture)`)}
    />
  );
}
