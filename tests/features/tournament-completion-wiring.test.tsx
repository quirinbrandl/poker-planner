import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import GameDetailsScreen from '@/features/details/GameDetailsScreen';
import AddPlayerScreen from '@/features/entry/AddPlayerScreen';
import PaymentsScreen from '@/features/payments/PaymentsScreen';
import PlayScreen from '@/features/play/PlayScreen';
import PlayerScreen from '@/features/player/PlayerScreen';
import ResultsScreen from '@/features/results/ResultsScreen';
import { createGameManagement, createMemoryStore, type DocumentStore, type GameManagement } from '@/game-management';
import { GameManagementProvider, useGameManagement } from '@/state';
import { ToastProvider } from '@/ui';

import { expectStatus, plannedGame, recordCount, startPlannedGame } from '../support/game-management';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const NAMES = ['Alice', 'Bob', 'Cleo', 'Dan', 'Emma', 'Felix'];
const CHIPS: [string, string][] = [
  ['1', '200'],
  ['5', '150'],
  ['25', '100'],
  ['100', '50'],
];

let live: GameManagement;
function Capture() {
  live = useGameManagement();
  return null;
}

type Seed = (app: GameManagement) => Promise<string>;

/** A started six-player tournament (Top 2 of EUR 120) with `out` eliminated in this order. */
const tournament =
  (out: string[] = [], { complete = false } = {}): Seed =>
  async (app) => {
    const gameId = await plannedGame(app, 'tournament', { players: NAMES, chips: CHIPS });
    await startPlannedGame(app, gameId);
    const ids = Object.fromEntries(app.play.getView(gameId)!.players.map((p) => [p.name, p.id]));
    for (const name of out) expectStatus(await app.play.recordElimination(gameId, ids[name]), 'accepted');
    if (complete) expectStatus(await app.play.calculatePayments(gameId, { confirmed: true }), 'accepted');
    return gameId;
  };

/** Alice and Bob counted at EUR 30 / EUR 10 and completed. */
const completedCash: Seed = async (app) => {
  const gameId = await plannedGame(app, 'cash', { players: ['Alice', 'Bob'], chips: CHIPS, colors: ['white', 'red', 'blue', 'black'] });
  const ids = await startPlannedGame(app, gameId);
  await recordCount(app, gameId, ids[0], [30, 4, 6, 1]);
  await recordCount(app, gameId, ids[1], [0, 0, 0, 1]);
  expectStatus(await app.play.calculatePayments(gameId, { confirmed: true }), 'accepted');
  return gameId;
};

async function open(seedGame: Seed, url: (gameId: string) => string) {
  const store: DocumentStore = createMemoryStore();
  let n = 0;
  const seed = await createGameManagement({ store, newId: () => `seed-${++n}` });
  const gameId = await seedGame(seed);
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
      'game/[gameId]/play': PlayScreen,
      'game/[gameId]/results': ResultsScreen,
      'game/[gameId]/details': GameDetailsScreen,
      'game/[gameId]/payments': PaymentsScreen,
      'game/[gameId]/player/[participantId]': PlayerScreen,
      'game/[gameId]/add-player': AddPlayerScreen,
    },
    { initialUrl: url(gameId), wrapper },
  );
  await screen.findAllByText(/./);
  return { gameId, router };
}

const press = async (name: string | RegExp) => {
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name }));
  });
};

it('+ Rebuy on tournament Play issues once and raises the prize pool', async () => {
  const { gameId } = await open(tournament(), (id) => `/game/${id}/play`);
  expect(screen.getByText('EUR 120.00')).toBeTruthy();
  const issue = jest.spyOn(live.play, 'issueRebuy');
  await press('Rebuy for Bob');
  expect(screen.getByText('Rebuy for Bob')).toBeTruthy();
  expect(screen.getByText('EUR 120.00 → EUR 140.00')).toBeTruthy();
  const confirm = screen.getByRole('button', { name: /^Issue rebuy/ });
  await fireEvent.press(confirm);
  await fireEvent.press(confirm);
  expect(await screen.findByText('Rebuy issued for Bob')).toBeTruthy();
  expect(issue).toHaveBeenCalledTimes(1);
  expect(screen.getByText('EUR 140.00')).toBeTruthy();
  expect(screen.getByText('6 buy-ins + 1 rebuy')).toBeTruthy();
  expect(live.play.getTournamentPlay(gameId)!.prizePool.amountText).toBe('EUR 140.00');
});

it('Rebuy instead in the Out popup opens the rebuy popup and records no elimination', async () => {
  const { gameId } = await open(tournament(), (id) => `/game/${id}/play`);
  await press('Felix is out…');
  await press('Rebuy for Felix instead');
  expect(screen.getByText('Rebuy for Felix')).toBeTruthy();
  await press('Cancel');
  expect(screen.queryByText('Rebuy for Felix')).toBeNull();
  expect(live.play.getTournamentResults(gameId)!.finishers).toEqual([]);
  expect(live.play.getTournamentPlay(gameId)!.prizePool.amountText).toBe('EUR 120.00');
});

it('Add player opens late entry before anyone is out, and explains instead once someone is', async () => {
  const first = await open(tournament(), (id) => `/game/${id}/play`);
  await press('Add player');
  expect(first.router.getPathname()).toBe(`/game/${first.gameId}/add-player`);
  expect(screen.getByText('Review entry')).toBeTruthy();
  screen.unmount();

  const { gameId, router } = await open(tournament(['Felix']), (id) => `/game/${id}/play`);
  expect(screen.getByRole('button', { name: 'Add player' }).props.accessibilityHint).toBe(
    'Late entry closes once anyone is out (1 elimination recorded). It opens again only if every elimination is undone.',
  );
  await press('Add player');
  expect(screen.getByText('Late entry closed: someone is out.')).toBeTruthy();
  expect(router.getPathname()).toBe(`/game/${gameId}/play`);
});

it('the reserve line opens Bank & reserve in place', async () => {
  await open(tournament(), (id) => `/game/${id}/play`);
  await press(/reserve stacks?\. Bank and reserve details/);
  // The top bar goes back to Play (no second Back button under the page).
  const back = screen.getAllByRole('button', { name: 'Back to Play' });
  expect(back).toHaveLength(1);
  await act(async () => {
    await fireEvent.press(back[0]);
  });
  expect(screen.getByText('Still in · 6')).toBeTruthy();
});

it('Calculate Payments… on tournament Results confirms once and lands on Payments', async () => {
  const { gameId, router } = await open(tournament(['Felix', 'Emma', 'Dan', 'Cleo', 'Bob']), (id) => `/game/${id}/results`);
  const calculate = jest.spyOn(live.play, 'calculatePayments');
  await press('Calculate Payments…');
  expect(screen.getByText('Calculate Payments?')).toBeTruthy();
  expect(screen.getByLabelText('Alice wins · all 5 eliminations recorded')).toBeTruthy();
  expect(screen.getByLabelText('1st · Alice: EUR 84.00')).toBeTruthy();
  expect(live.games.get(gameId)!.phase).toBe('inProgress');

  await press('Calculate Payments');
  expect(await screen.findByText('Game finished')).toBeTruthy();
  expect(calculate.mock.calls.filter(([, options]) => options?.confirmed)).toHaveLength(1);
  expect(router.getPathname()).toBe(`/game/${gameId}/payments`);
  expect(screen.getByText('5 payments')).toBeTruthy();
  expect(screen.getByRole('button', { name: /^Alice, 1st, EUR 20\.00 in · EUR 84\.00 out,/ })).toBeTruthy();
  expect(live.games.get(gameId)!.phase).toBe('completed');
});

it('a Completed tournament shows read-only Results and a read-only player page', async () => {
  const { gameId, router } = await open(tournament(['Felix', 'Emma', 'Dan', 'Cleo', 'Bob'], { complete: true }), (id) => `/game/${id}/results`);
  expect(screen.getByText('Alice wins')).toBeTruthy();
  expect(screen.getByText('Completed')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Edit order/ })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Calculate Payments…' })).toBeNull();

  await press(/^Bob, 2nd place/);
  expect(router.getPathname()).toMatch(new RegExp(`^/game/${gameId}/player/`));
  expect(screen.getByText('Bob')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Back in the game/ })).toBeNull();
});

it.each([
  ['tournament', tournament(['Felix', 'Emma', 'Dan', 'Cleo', 'Bob'], { complete: true }), 'Payouts · Top 2'],
  ['cash game', completedCash, 'Rate: EUR 0.10 per chip unit'],
])('Completed Game details of a %s shows the finishing time and no bank link', async (_mode, seed, marker) => {
  await open(seed, (id) => `/game/${id}/details`);
  // Created and finished are the game line's range ("23 Nov, 19:30–23:41"), not rows.
  expect(screen.getByText(/ · \d+ \w+, \d\d:\d\d(–| – \d+ \w+, )\d\d:\d\d$/)).toBeTruthy();
  expect(screen.getByText('Completed')).toBeTruthy();
  expect(screen.queryByText(marker) ?? screen.queryByLabelText(marker)).toBeTruthy();
  expect(screen.getByText('Read-only. To change something, reopen the game from ⋯.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'View current bank & reserve' })).toBeNull();
});
