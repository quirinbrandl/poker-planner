import { fireEvent, screen } from '@testing-library/react-native';

import { gameCardData, historyCountLabel } from '@/features/games/cardData';
import { GamesView } from '@/features/games/GamesView';
import { HISTORY_FIXTURES } from '@/features/history/fixtures';
import { HistoryView } from '@/features/history/HistoryView';
import type { GameCard } from '@/game-management';

import { renderUi } from '../ui/render';

it('lists finished games with their summary and opens one', async () => {
  const onOpenGame = jest.fn();
  await renderUi(<HistoryView data={HISTORY_FIXTURES.saved} onBack={jest.fn()} onOpenGame={onOpenGame} />);
  const cards = screen.getAllByRole('button', { name: /^(Cash game|Tournament)\./ });
  expect(cards).toHaveLength(4);
  expect(
    screen.getByRole('button', {
      name: 'Cash game. Alice, Bob, Clara, David, Emma, Felix. 23 Nov 2026, 19:30–23:41. Buy-ins EUR 160.00, 3 payments, Top Alice +EUR 13.00',
    }),
  ).toBeTruthy();
  expect(
    screen.getByRole('button', {
      name: 'Tournament. Chris, Robin, Maya, Sam, Lena. 9 Nov 2026, 20:00–23:05. Prize pool EUR 100.00, 2 payments, Winner Chris',
    }),
  ).toBeTruthy();
  expect(screen.getByText('No payments needed')).toBeTruthy();
  expect(screen.queryByRole('search')).toBeNull();
  await fireEvent.press(cards[2]);
  expect(onOpenGame).toHaveBeenCalledWith('h3');
});

it('shows the empty state; the top bar leads back to Games', async () => {
  const onBack = jest.fn();
  await renderUi(<HistoryView data={HISTORY_FIXTURES.empty} onBack={onBack} onOpenGame={jest.fn()} />);
  expect(screen.getByText('No finished games yet')).toBeTruthy();
  const buttons = screen.getAllByRole('button', { name: 'Back to Games' });
  expect(buttons).toHaveLength(1);
  await fireEvent.press(buttons[0]);
  expect(onBack).toHaveBeenCalled();
});

const card = (phase: GameCard['phase']): GameCard => ({
  id: 'g1',
  mode: 'cash',
  phase,
  createdAt: new Date(2026, 10, 23, 19, 30).toISOString(),
  participantNames: ['Alice', 'Bob'],
  lastStep: phase === 'planning' ? 'settings' : null,
  lastStepTitle: phase === 'planning' ? 'Game settings' : null,
  startedAt: phase === 'planning' ? null : new Date(2026, 10, 23, 19, 45).toISOString(),
  finishedAt: null,
  reopened: false,
});

it('shows In progress, reopened and Planning cards and the History count', async () => {
  const onOpenGame = jest.fn();
  const onOpenHistory = jest.fn();
  await renderUi(
    <GamesView
      data={{
        inProgress: [gameCardData(card('inProgress'), { reopened: true }), { ...gameCardData(card('inProgress')), id: 'g3' }],
        planning: [{ ...gameCardData(card('planning')), id: 'g2' }],
        historyCount: 3,
      }}
      onNewGame={jest.fn()}
      onOpenGame={onOpenGame}
      onOpenHistory={onOpenHistory}
      onOpenSavedPlayers={jest.fn()}
      onOpenTemplates={jest.fn()}
    />,
  );
  expect(screen.getByText('Reopened')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'In progress · Cash game. Alice, Bob. 23 Nov 2026, 19:30. Open Play' })).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Planning · Cash game. Alice, Bob. 23 Nov 2026, 19:30. Step 4 of 5. Resume game settings' }),
  ).toBeTruthy();
  expect(screen.queryByText('1 draft')).toBeNull();
  await fireEvent.press(
    screen.getByRole('button', { name: 'In progress · Cash game. Alice, Bob. 23 Nov 2026, 19:30. Reopened · calculate Payments again' }),
  );
  expect(onOpenGame).toHaveBeenCalledWith('g1');
  await fireEvent.press(screen.getByRole('button', { name: 'History, 3 games' }));
  expect(onOpenHistory).toHaveBeenCalled();
});

it('labels the History row by its count', () => {
  expect(historyCountLabel(undefined)).toBe('');
  expect(historyCountLabel(0)).toBe('');
  expect(historyCountLabel(1)).toBe('1 game');
  expect(historyCountLabel(3)).toBe('3 games');
});
