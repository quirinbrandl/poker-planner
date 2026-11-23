import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AddPlayerScreen from '@/features/entry/AddPlayerScreen';
import PlayScreen from '@/features/play/PlayScreen';
import { createGameManagement, createMemoryStore, type DocumentStore, type GameManagement } from '@/game-management';
import { GameManagementProvider, useGameManagement } from '@/state';
import { ToastProvider } from '@/ui';

import { expectStatus, plannedGame, type PlanSetup } from '../support/game-management';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let ids = 0;
const newId = () => `id-${++ids}`;

/** Full coverage for every rebuy. */
const STANDARD: PlanSetup = {
  players: ['Alice', 'Bob', 'Cleo'],
  chips: [
    ['1', '200'],
    ['5', '150'],
    ['25', '100'],
    ['100', '50'],
  ],
};
/** After Start only ten 1-unit chips are left: rebuys get 3 of 4 coverage, late entry is blocked. */
const SMALL: PlanSetup = {
  players: ['Alice', 'Bob'],
  chips: [
    ['1', '40'],
    ['5', '10'],
    ['25', '10'],
    ['100', '5'],
  ],
  reserve: '0',
};

/** Starts a cash game through the public interface, then renders the real routes on its store at Play. */
async function setup(plan: PlanSetup, reserveStacks: number) {
  const store: DocumentStore = createMemoryStore();
  const seeder = await createGameManagement({ store, newId });
  const gameId = await plannedGame(seeder, 'cash', plan);
  expectStatus(await seeder.planning.start(gameId, { depthBb: 100, reserveStacks }), 'accepted');
  expectStatus(await seeder.savedPlayers.create('Nora'), 'accepted');
  await seeder.persistence.flush();

  const handle: { app?: GameManagement } = {};
  function Capture({ children }: { children: ReactNode }) {
    handle.app = useGameManagement();
    return <>{children}</>;
  }
  function Layout() {
    return (
      <SafeAreaProvider initialMetrics={metrics}>
        <ToastProvider>
          <GameManagementProvider store={store} newId={newId}>
            <Capture>
              <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
            </Capture>
          </GameManagementProvider>
        </ToastProvider>
      </SafeAreaProvider>
    );
  }
  const router = await renderRouter(
    {
      _layout: Layout,
      index: () => <Text>Games home</Text>,
      'game/[gameId]/play': PlayScreen,
      'game/[gameId]/add-player': AddPlayerScreen,
      'game/[gameId]/count/[participantId]': () => <Text>Count editor</Text>,
    },
    { initialUrl: `/game/${gameId}/play` },
  );
  await waitFor(() => expect(handle.app).toBeDefined());
  await screen.findByText(/^Playing · /);
  return { router, gameId, app: () => handle.app! };
}

async function press(name: string | RegExp) {
  await fireEvent.press(await screen.findByRole('button', { name }));
}

it('Rebuy opens the proposal; Cancel records nothing; Issue records it once with feedback', async () => {
  const { gameId, app } = await setup(STANDARD, 2);
  await press('Rebuy for Bob');
  expect(await screen.findByText('Rebuy for Bob')).toBeTruthy();
  expect(screen.getByText('New total contribution')).toBeTruthy();
  expect(screen.getByText('EUR 40.00')).toBeTruthy();

  await press('Cancel');
  await waitFor(() => expect(screen.queryByText('Rebuy for Bob')).toBeNull());
  expect(app().play.getView(gameId)!.totals.rebuys).toBe(0);

  await press('Rebuy for Bob');
  await press('Issue rebuy · EUR 20.00');
  expect(await screen.findByText('Rebuy issued for Bob')).toBeTruthy();
  expect(screen.getByText(/EUR 20.00 contribution · 200 chip units issued/)).toBeTruthy();
  expect(screen.getByText('EUR 40.00 contribution · 1 rebuy')).toBeTruthy();
  expect(app().play.getView(gameId)!.totals.rebuys).toBe(1);
});

it('a reduced-coverage rebuy needs Accept & issue; Decline records nothing', async () => {
  const { gameId, app } = await setup(SMALL, 0);
  await press('Rebuy for Alice');
  expect(await screen.findByText('3 of 4 · Reduced blind-payment coverage')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Issue rebuy · EUR 20.00' })).toBeNull();
  await press('Decline');
  await waitFor(() => expect(screen.queryByText('Rebuy for Alice')).toBeNull());
  expect(app().play.getView(gameId)!.totals.rebuys).toBe(0);

  await press('Rebuy for Alice');
  await press('Accept & issue · EUR 20.00');
  expect(await screen.findByText('Rebuy issued for Alice')).toBeTruthy();
  expect(screen.getByText(/covers 3 of 4 blind payments/)).toBeTruthy();
  expect(app().play.getView(gameId)!.totals.rebuys).toBe(1);
});

it('Result opens the count editor of that player', async () => {
  const { router, gameId, app } = await setup(STANDARD, 2);
  await press('Result for Cleo');
  const cleo = app().play.getView(gameId)!.players[2].id;
  await waitFor(() => expect(router.getPathname()).toBe(`/game/${gameId}/count/${cleo}`));
});

it('late entry: Review entry, then Add player & issue stack joins and returns to Play', async () => {
  const { router, gameId, app } = await setup(STANDARD, 2);
  await press('Add player');
  await waitFor(() => expect(router.getPathname()).toBe(`/game/${gameId}/add-player`));
  await fireEvent.press(await screen.findByText('Nora'));
  await press('Review entry');
  expect(await screen.findByText('Add Nora')).toBeTruthy();

  await press('Cancel');
  expect(await screen.findByText('Nora has not joined.')).toBeTruthy();
  expect(app().play.getView(gameId)!.players).toHaveLength(3);

  await press('Review entry');
  await press('Add player & issue stack');
  await waitFor(() => expect(router.getPathname()).toBe(`/game/${gameId}/play`));
  expect(await screen.findByText('Nora joined')).toBeTruthy();
  expect(screen.getByText('Playing · 4')).toBeTruthy();
  expect(app().play.getView(gameId)!.players.map((p) => p.name)).toEqual(['Alice', 'Bob', 'Cleo', 'Nora']);
});

it('a blocked entry explains why and offers no accept', async () => {
  const { gameId, app } = await setup(SMALL, 0);
  await press('Add player');
  await fireEvent.press(await screen.findByText('Nora'));
  await press('Review entry');
  expect(await screen.findByText('Cannot add Nora')).toBeTruthy();
  expect(screen.getByText(/covers only 3 of the required 4 payments of each blind/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Add player & issue stack' })).toBeNull();
  await press('Back to player selection');
  expect(await screen.findByText('Nora has not joined.')).toBeTruthy();
  expect(app().play.getView(gameId)!.players).toHaveLength(2);
});
