import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import GamesScreen from '@/features/games/GamesScreen';
import HistoryScreen from '@/features/games/HistoryScreen';
import PaymentsScreen from '@/features/payments/PaymentsScreen';
import PlayerScreen from '@/features/player/PlayerScreen';
import ResultsScreen from '@/features/results/ResultsScreen';
import { createGameManagement, createMemoryStore, type DocumentStore, type GameManagement } from '@/game-management';
import { GameManagementProvider, useGameManagement } from '@/state';
import { ToastProvider } from '@/ui';

import { expectStatus, plannedGame, recordCount, startPlannedGame } from '../support/game-management';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

let live: GameManagement;
function Capture() {
  live = useGameManagement();
  return null;
}

/**
 * Alice and Bob (EUR 20 each) counted at EUR 30 / EUR 10, so everything adds up; `complete` also
 * calculates Payments. Renders the app at `url`.
 */
async function open(url: (gameId: string) => string, { complete = false } = {}) {
  const store: DocumentStore = createMemoryStore();
  let n = 0;
  const seed = await createGameManagement({ store, newId: () => `seed-${++n}` });
  const gameId = await plannedGame(seed, 'cash', {
    players: ['Alice', 'Bob'],
    chips: [
      ['1', '200'],
      ['5', '150'],
      ['25', '100'],
      ['100', '50'],
    ],
    colors: ['white', 'red', 'blue', 'black'],
  });
  const ids = await startPlannedGame(seed, gameId);
  await recordCount(seed, gameId, ids[0], [30, 4, 6, 1]);
  await recordCount(seed, gameId, ids[1], [0, 0, 0, 1]);
  if (complete) expectStatus(await seed.play.calculatePayments(gameId, { confirmed: true }), 'accepted');
  await seed.persistence.flush();
  let m = 0;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={metrics}>
      <ToastProvider>
        <GameManagementProvider store={store} newId={() => `app-${++m}`} loading={<Text>Loading</Text>}>
          <Capture />
          {children}
        </GameManagementProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
  const router = await renderRouter(
    {
      index: GamesScreen,
      history: HistoryScreen,
      'game/[gameId]/results': ResultsScreen,
      'game/[gameId]/payments': PaymentsScreen,
      'game/[gameId]/player/[participantId]': PlayerScreen,
    },
    { initialUrl: url(gameId), wrapper },
  );
  await screen.findAllByText(/./);
  return { gameId, ids, router };
}

const press = async (name: string | RegExp) => {
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name }));
  });
};

it('Calculate Payments confirms once and lands on Payments', async () => {
  const { gameId, router } = await open((gameId) => `/game/${gameId}/results`);
  const calculate = jest.spyOn(live.play, 'calculatePayments');
  await press('Calculate Payments…');
  expect(screen.getByText('Calculate Payments?')).toBeTruthy();
  expect(screen.getByLabelText('All 2 counted · 400 chip units')).toBeTruthy();
  expect(live.games.get(gameId)!.phase).toBe('inProgress');

  await press('Calculate Payments');
  expect(await screen.findByText('Game finished')).toBeTruthy();
  expect(calculate.mock.calls.filter(([, options]) => options?.confirmed)).toHaveLength(1);
  expect(router.getPathname()).toBe(`/game/${gameId}/payments`);
  expect(screen.getByText('1 payment')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Back to Games' })).toBeTruthy();
  expect(live.games.get(gameId)!.phase).toBe('completed');
});

it('Cancel in Calculate Payments? leaves the game In progress', async () => {
  const { gameId, router } = await open((gameId) => `/game/${gameId}/results`);
  await press('Calculate Payments…');
  await press('Cancel');
  expect(screen.queryByText('Calculate Payments?')).toBeNull();
  expect(router.getPathname()).toBe(`/game/${gameId}/results`);
  expect(live.games.get(gameId)!.phase).toBe('inProgress');
});

it('History opens Payments with back to History; a player opens read-only', async () => {
  const { gameId, ids, router } = await open(() => '/history', { complete: true });
  expect(screen.getByText('Alice, Bob')).toBeTruthy();
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: /^Cash game\. Alice, Bob\./ }));
  });
  expect(router.getPathname()).toBe(`/game/${gameId}/payments`);
  expect(screen.getByRole('button', { name: 'Back to History' })).toBeTruthy();
  expect(screen.getByText(/ · \d+ \w+, \d\d:\d\d(–| – \d+ \w+, )\d\d:\d\d$/)).toBeTruthy();

  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: /^Alice,/ }));
  });
  expect(router.getPathname()).toBe(`/game/${gameId}/player/${ids[0]}`);
  expect(screen.getByRole('button', { name: /Back to Payments/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Count final chips' })).toBeNull();
  await press(/Back to Payments/);
  expect(router.getPathname()).toBe(`/game/${gameId}/payments`);

  await press('Back to History');
  expect(router.getPathname()).toBe('/history');
});

it('Reopen from ⋯ lands on In progress Results with the reopened note', async () => {
  const { gameId, router } = await open((gameId) => `/game/${gameId}/payments?from=history`, { complete: true });
  await press('Game actions');
  await press('Reopen game…');
  expect(screen.getByText('Reopen this game?')).toBeTruthy();
  await press('Reopen game');

  expect(router.getPathname()).toBe(`/game/${gameId}/results`);
  expect(await screen.findByText('Game reopened')).toBeTruthy();
  expect(screen.getByText('Reopened · calculate Payments again when you’re done.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Back to Games' })).toBeTruthy();
  expect(live.games.get(gameId)).toMatchObject({ phase: 'inProgress', reopened: true });
  expect(live.play.getPayments(gameId)).toBeNull();
});
