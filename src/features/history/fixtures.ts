/** Development and test fixtures for History, from the approved prototype's saved history. */
import type { HistoryCardData, HistoryData } from './types';

const FINISHED: readonly HistoryCardData[] = [
  {
    gameId: 'h1',
    modeLabel: 'Cash game',
    namesText: 'Alice, Bob, Clara, David, Emma, Felix',
    dateText: '23 Nov 2026 · 19:30–23:41',
    facts: [{ label: 'Buy-ins', value: 'EUR 160.00' }, { value: '3 payments' }, { label: 'Top', value: 'Alice +EUR 13.00' }],
  },
  {
    gameId: 'h2',
    modeLabel: 'Cash game',
    namesText: 'Maya, Jonas, Lena, Sam, Alex, Noor',
    dateText: '16 Nov 2026 · 19:30–23:52',
    facts: [{ label: 'Buy-ins', value: 'EUR 140.00' }, { value: '2 payments' }, { label: 'Top', value: 'Lena +EUR 18.40' }],
  },
  {
    gameId: 'h3',
    modeLabel: 'Tournament',
    namesText: 'Chris, Robin, Maya, Sam, Lena',
    dateText: '9 Nov 2026 · 20:00–23:05',
    facts: [{ label: 'Prize pool', value: 'EUR 100.00' }, { value: '2 payments' }, { label: 'Winner', value: 'Chris' }],
  },
  {
    gameId: 'h4',
    modeLabel: 'Cash game',
    namesText: 'Chris, Robin, Maya, Sam',
    dateText: '2 Nov 2026 · 19:00–22:40',
    facts: [{ label: 'Buy-ins', value: 'EUR 80.00' }, { value: 'No payments needed' }],
  },
];

export const HISTORY_FIXTURES = {
  saved: { games: FINISHED },
  empty: { games: [] },
  /** The first game deleted from History. */
  'after-delete': { games: FINISHED.slice(1) },
  /** A game that ran past midnight and long names. */
  long: {
    games: [
      {
        gameId: 'h0',
        modeLabel: 'Cash game',
        namesText: 'Alexandra-Marie, Bartholomew, Clara, David, Emma, Felix, Grace, Hana, Ivan, Jonas, Kai, Lena',
        dateText: '23 Nov 2026 · 19:30–24 Nov 2026 · 01:10',
        facts: [
          { label: 'Buy-ins', value: 'EUR 300.00' },
          { value: '10 payments' },
          { label: 'Top', value: 'Alexandra-Marie +EUR 31.50' },
        ],
      },
      ...FINISHED,
    ],
  },
} satisfies Record<string, HistoryData>;

export type HistoryFixtureName = keyof typeof HISTORY_FIXTURES;
