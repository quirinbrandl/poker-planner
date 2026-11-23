import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import GamesScreen from '@/features/games/GamesScreen';
import PreviewStepScreen from '@/features/planning/PreviewStepScreen';
import { LaunchRestoreProvider } from '@/features/shared/launch';
import { createGameManagement, createMemoryStore, type DocumentStore, type GameManagement } from '@/game-management';
import { GameManagementProvider, useGameManagement } from '@/state';
import { ToastProvider } from '@/ui';

import { plannedGame } from '../support/game-management';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

let live: GameManagement;
function Capture() {
  live = useGameManagement();
  return null;
}

function Play() {
  return <Text>Play screen</Text>;
}

/** The app on `store`, opened at `initialUrl`. Rendering again on the same store is a restart. */
async function launch(store: DocumentStore, initialUrl: string) {
  let n = 0;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={metrics}>
      <ToastProvider>
        <GameManagementProvider store={store} newId={() => `app-${++n}`} loading={<Text>Loading</Text>}>
          <Capture />
          <LaunchRestoreProvider>{children}</LaunchRestoreProvider>
        </GameManagementProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
  const router = await renderRouter(
    {
      index: GamesScreen,
      'game/[gameId]/planning/preview': PreviewStepScreen,
      'game/[gameId]/play': Play,
    },
    { initialUrl, wrapper },
  );
  await screen.findAllByText(/./);
  return router;
}

const press = async (name: string) => {
  await act(async () => {
    await fireEvent.press(screen.getAllByRole('button', { name }).at(-1)!);
  });
};

it('Start leaves for Play without passing through Games, so a restart reopens Play', async () => {
  const store = createMemoryStore();
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
  });
  await seed.persistence.flush();

  const router = await launch(store, `/game/${gameId}/planning/preview`);
  await press('Start cash game');
  expect(screen.getByText('Start cash game?')).toBeTruthy();
  await press('Start cash game');

  expect(await screen.findByText('Play screen')).toBeTruthy();
  expect(router.getPathname()).toBe(`/game/${gameId}/play`);
  expect(live.games.get(gameId)!.phase).toBe('inProgress');
  // Games never came into focus on the way, so the place to reopen is still Play.
  expect(live.location.get()).toEqual({ kind: 'play', gameId });

  await live.persistence.flush();
  await act(async () => {
    router.unmount();
  });
  const restarted = await launch(store, '/');
  expect(await screen.findByText('Play screen')).toBeTruthy();
  expect(restarted.getPathname()).toBe(`/game/${gameId}/play`);
});
