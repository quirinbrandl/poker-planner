import { Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PlayersStepScreen from '@/features/planning/PlayersStepScreen';
import SavedPlayersScreen from '@/features/players/SavedPlayersScreen';
import { createGameManagement, createMemoryStore, type DocumentStore, type GameManagement } from '@/game-management';
import { GameManagementProvider, useGameManagement } from '@/state';
import { ToastProvider } from '@/ui';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let ids = 0;
const newId = () => `id-${++ids}`;

/** Seeds a memory store through the public interface, then renders the real routes on it. */
async function setup(seed: (app: GameManagement) => Promise<string>, initialUrl: (gameId: string) => string) {
  const store: DocumentStore = createMemoryStore();
  const seeder = await createGameManagement({ store, newId });
  const gameId = await seed(seeder);
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
      'players/index': SavedPlayersScreen,
      'game/[gameId]/planning/players': PlayersStepScreen,
      'game/[gameId]/planning/chip-set': () => <Text>Chip set step</Text>,
    },
    { initialUrl: initialUrl(gameId) },
  );
  await waitFor(() => expect(handle.app).toBeDefined());
  return { router, gameId, app: () => handle.app! };
}

const roster = (app: GameManagement, gameId: string) =>
  app.planning.getView(gameId)!.players.participants.map((p) => p.name);

async function press(name: string | RegExp) {
  const button = await screen.findByRole('button', { name });
  await act(async () => {
    fireEvent.press(button);
  });
}

it('Save and add creates the saved player and puts them on the roster', async () => {
  const { gameId, app } = await setup(
    async (seeder) => (await seeder.games.create('cash')).gameId as string,
    (id) => `/game/${id}/planning/players`,
  );
  await screen.findByText('No players yet');

  await press('Add players');
  await press('New player');
  fireEvent.changeText(screen.getByLabelText('Player name'), '  Ana ');
  await press('Save and add');

  expect(await screen.findByText('Ana')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Remove Ana from this game' })).toBeTruthy();
  expect(roster(app(), gameId)).toEqual(['Ana']);
  expect(app().savedPlayers.list().map((p) => p.name)).toEqual(['Ana']);
});

it('refuses a duplicate name next to the field and keeps the typed text', async () => {
  const { gameId, app } = await setup(
    async (seeder) => {
      await seeder.savedPlayers.create('Ben');
      return (await seeder.games.create('cash')).gameId as string;
    },
    (id) => `/game/${id}/planning/players`,
  );

  await press('Add players');
  await press('New player');
  fireEvent.changeText(screen.getByLabelText('Player name'), ' ben ');
  await press('Save and add');

  expect(await screen.findByText('A player named “Ben” already exists.')).toBeTruthy();
  expect(screen.getByLabelText('Player name').props.value).toBe(' ben ');
  expect(roster(app(), gameId)).toEqual([]);
  expect(app().savedPlayers.list().map((p) => p.name)).toEqual(['Ben']);
});

it('Continue with one player stays on the step and says why', async () => {
  const { router, gameId, app } = await setup(
    async (seeder) => {
      const { gameId: id } = (await seeder.games.create('cash')) as { gameId: string };
      await seeder.planning.createSavedPlayerAndAdd(id, 'Ana');
      return id;
    },
    (id) => `/game/${id}/planning/players`,
  );

  await press('Continue');

  expect(await screen.findByText('Add at least two players to continue.')).toBeTruthy();
  expect(router.getPathname()).toBe(`/game/${gameId}/planning/players`);
  expect(app().planning.getView(gameId)!.currentStep).toBe('players');
});

it('removing a player needs confirmation, and Cancel changes nothing', async () => {
  const { gameId, app } = await setup(
    async (seeder) => {
      const { gameId: id } = (await seeder.games.create('cash')) as { gameId: string };
      await seeder.planning.createSavedPlayerAndAdd(id, 'Ana');
      await seeder.planning.createSavedPlayerAndAdd(id, 'Ben');
      return id;
    },
    (id) => `/game/${id}/planning/players`,
  );

  await press('Remove Ana from this game');
  expect(await screen.findByText('Remove Ana?')).toBeTruthy();
  await press('Cancel');
  expect(roster(app(), gameId)).toEqual(['Ana', 'Ben']);

  await press('Remove Ana from this game');
  await press('Remove from this game');
  await waitFor(() => expect(roster(app(), gameId)).toEqual(['Ben']));
  expect(app().savedPlayers.list().map((p) => p.name)).toEqual(['Ana', 'Ben']);
});

it('renaming a saved player leaves the game’s captured name alone', async () => {
  const { gameId, app } = await setup(
    async (seeder) => {
      const { gameId: id } = (await seeder.games.create('cash')) as { gameId: string };
      await seeder.planning.createSavedPlayerAndAdd(id, 'Ana');
      return id;
    },
    () => '/players',
  );
  await waitFor(() => expect(app().location.get()).toEqual({ kind: 'savedPlayers' }));

  await press('Edit saved player Ana');
  fireEvent.changeText(screen.getByLabelText('Player name'), 'Anna');
  await press('Save');

  expect(await screen.findByText('Anna')).toBeTruthy();
  expect(app().savedPlayers.list().map((p) => p.name)).toEqual(['Anna']);
  expect(roster(app(), gameId)).toEqual(['Ana']);
});

it('leaving a changed name editor asks first, and Keep editing keeps the text', async () => {
  const { app } = await setup(
    async (seeder) => {
      await seeder.savedPlayers.create('Ana');
      return '';
    },
    () => '/players',
  );

  await press('Edit saved player Ana');
  fireEvent.changeText(screen.getByLabelText('Player name'), 'Anja');
  await press('Cancel');
  expect(await screen.findByText('Discard this name edit?')).toBeTruthy();
  await press('Keep editing');
  expect(screen.getByLabelText('Player name').props.value).toBe('Anja');

  await press('Cancel');
  await press('Discard changes');
  expect(await screen.findByRole('button', { name: 'Edit saved player Ana' })).toBeTruthy();
  expect(app().savedPlayers.list().map((p) => p.name)).toEqual(['Ana']);
});
