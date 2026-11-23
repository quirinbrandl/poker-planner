import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import OrderScreen from '@/features/tournament/OrderScreen';
import { TournamentPlayScreen } from '@/features/tournament/TournamentPlayScreen';
import { createGameManagement, createMemoryStore, type DocumentStore, type GameManagement } from '@/game-management';
import { GameManagementProvider } from '@/state';

import { plannedGame } from '../support/game-management';
import { renderUi } from '../ui/render';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), dismissTo: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void | (() => void)) => jest.requireActual('react').useEffect(effect, [effect]),
}));

const NAMES = ['Alice', 'Bob', 'Cleo', 'Dan', 'Emma', 'Felix'];
let id = 0;
const newId = () => `id-${++id}`;

/** A started six-player tournament (Top 2 of EUR 120) on `store`, with `out` already eliminated. */
async function seed(store: DocumentStore, out: string[] = []) {
  const app = await createGameManagement({ store, newId });
  const gameId = await plannedGame(app, 'tournament', {
    players: NAMES,
    chips: [
      ['1', '200'],
      ['5', '150'],
      ['25', '100'],
      ['100', '50'],
    ],
  });
  await app.planning.start(gameId, { depthBb: 100, reserveStacks: 3 });
  const ids = Object.fromEntries(app.play.getView(gameId)!.players.map((p) => [p.name, p.id]));
  for (const name of out) await app.play.recordElimination(gameId, ids[name]);
  await app.persistence.flush();
  return { gameId, ids };
}

/** What a restarted app sees: the finishing order, best place first. */
async function savedOrder(store: DocumentStore, gameId: string): Promise<string[]> {
  const app: GameManagement = await createGameManagement({ store, newId });
  return app.play.getTournamentResults(gameId)!.finishers.map((f) => `${f.placeLabel} ${f.name}`);
}

function render(store: DocumentStore, element: React.ReactElement) {
  return renderUi(
    <GameManagementProvider store={store} newId={newId}>
      {element}
    </GameManagementProvider>,
  );
}

const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  jest.mocked(router.back).mockClear();
  mockParams = {};
});

it('Play: Out records the elimination once and the standings follow', async () => {
  const store = createMemoryStore();
  const { gameId } = await seed(store);
  await render(store, <TournamentPlayScreen gameId={gameId} />);
  expect(await screen.findByText('Still in · 6')).toBeTruthy();

  await fireEvent.press(button('Felix is out…'));
  expect(screen.getByText('Felix is out?')).toBeTruthy();
  expect(screen.getByText('Closes')).toBeTruthy();
  const confirm = button('Felix is out');
  await fireEvent.press(confirm);
  await fireEvent.press(confirm);
  expect(await screen.findByText('Still in · 5')).toBeTruthy();
  expect(button('Add player')).toBeDisabled();
  expect(screen.getByText('Next out: 5th')).toBeTruthy();
  await waitFor(async () => expect(await savedOrder(store, gameId)).toEqual(['6th Felix']));
});

it('Order editor: Save order applies the draft', async () => {
  const store = createMemoryStore();
  const { gameId } = await seed(store, ['Felix', 'Dan']);
  mockParams = { gameId };
  await render(store, <OrderScreen />);
  expect(await screen.findByText('Finishing order')).toBeTruthy();
  await fireEvent.press(button('Move Felix up to 5th'));
  expect(screen.getByText('Unsaved')).toBeTruthy();
  expect(await savedOrder(store, gameId)).toEqual(['5th Dan', '6th Felix']);

  await fireEvent.press(button('Save order…'));
  expect(screen.getByText('Save the new order?')).toBeTruthy();
  expect(screen.getByLabelText('Felix: 6th → 5th')).toBeTruthy();
  await fireEvent.press(button('Save order'));
  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  expect(await savedOrder(store, gameId)).toEqual(['5th Felix', '6th Dan']);
});

it('Order editor: Cancel with changes asks, and Discard leaves the saved order as it was', async () => {
  const store = createMemoryStore();
  const { gameId } = await seed(store, ['Felix', 'Dan']);
  mockParams = { gameId };
  await render(store, <OrderScreen />);
  await screen.findByText('Finishing order');
  await fireEvent.press(button('Undo Dan’s elimination'));
  await fireEvent.press(button('Cancel'));
  expect(screen.getByText('Discard order changes?')).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();
  await fireEvent.press(button('Discard'));
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(await savedOrder(store, gameId)).toEqual(['5th Dan', '6th Felix']);
});
