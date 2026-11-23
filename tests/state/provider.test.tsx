import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { type GameManagement, createMemoryStore } from '@/game-management';
import { GameManagementProvider, useGameManagement, useGames } from '@/state';

function GameNames({ onApp }: { onApp: (app: GameManagement) => void }) {
  const app = useGameManagement();
  onApp(app);
  const games = useGames();
  return <Text>{games.length === 0 ? 'No games' : games.map((g) => `${g.mode}: ${g.participantNames.join(', ')}`).join(' | ')}</Text>;
}

it('loads the store, then renders a list from a hook and re-renders after an operation', async () => {
  let app: GameManagement | undefined;
  let id = 0;
  await render(
    <GameManagementProvider store={createMemoryStore()} newId={() => `id-${++id}`} loading={<Text>Loading</Text>}>
      <GameNames onApp={(a) => (app = a)} />
    </GameManagementProvider>,
  );

  expect(await screen.findByText('No games')).toBeTruthy();

  await act(async () => {
    const { gameId } = await app!.games.create('tournament');
    await app!.planning.createSavedPlayerAndAdd(gameId, 'Alice');
  });
  expect(screen.getByText('tournament: Alice')).toBeTruthy();
});
