import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import CountScreen from '@/features/count/CountScreen';
import PlayerScreen from '@/features/player/PlayerScreen';
import ResultsScreen from '@/features/results/ResultsScreen';
import { createGameManagement, createMemoryStore, type DocumentStore, type GameManagement } from '@/game-management';
import { GameManagementProvider, useGameManagement } from '@/state';
import { ToastProvider } from '@/ui';

import { expectStatus, plannedGame } from '../support/game-management';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

let live: GameManagement;
function Capture() {
  live = useGameManagement();
  return null;
}

/** A started cash game (Alice, Bob, Cleo), rendered on the given route. */
async function open(url: (gameId: string, ids: string[]) => string) {
  const store: DocumentStore = createMemoryStore();
  let n = 0;
  const seed = await createGameManagement({ store, newId: () => `seed-${++n}` });
  const gameId = await plannedGame(seed, 'cash', {
    players: ['Alice', 'Bob', 'Cleo'],
    chips: [
      ['1', '100'],
      ['5', '50'],
      ['25', '50'],
      ['100', '20'],
    ],
    colors: ['white', 'red', 'blue', 'black'],
  });
  const started = seed.planning.getDistributionPreview(gameId)!;
  if (started.distribution.kind !== 'planned') throw new Error('expected a plan');
  const plan = started.distribution.plan;
  expectStatus(await seed.planning.start(gameId, { depthBb: plan.depth.bb, reserveStacks: plan.reserve.stacks }), 'accepted');
  const ids = seed.play.getView(gameId)!.players.map((p) => p.id);
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
      index: () => <Text>Games</Text>,
      'game/[gameId]/results': ResultsScreen,
      'game/[gameId]/count/[participantId]': CountScreen,
      'game/[gameId]/player/[participantId]': PlayerScreen,
    },
    { initialUrl: url(gameId, ids), wrapper },
  );
  await screen.findAllByText(/./);
  return { gameId, ids, router };
}

const press = async (name: string | RegExp) => {
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name }));
  });
};

it('Results rows open the count editor and the player page', async () => {
  const { gameId, ids, router } = await open((gameId) => `/game/${gameId}/results`);
  expect(screen.getByText('3 still to count')).toBeTruthy();
  expect(screen.getAllByText('Uncounted')).toHaveLength(3);

  await press('Count chips for Bob');
  expect(router.getPathname()).toBe(`/game/${gameId}/count/${ids[1]}`);
  expect(screen.getByText('Bob · Final chips')).toBeTruthy();

  await press('Leave count for now');
  expect(router.getPathname()).toBe(`/game/${gameId}/results`);
  await act(async () => {
    await fireEvent.press(screen.getByText('Alice'));
  });
  expect(router.getPathname()).toBe(`/game/${gameId}/player/${ids[0]}`);
  expect(screen.getByRole('button', { name: /Back to Results/ })).toBeTruthy();
  await press('Count final chips');
  expect(router.getPathname()).toBe(`/game/${gameId}/count/${ids[0]}`);
});

it('the editor saves the raw text as the draft; Results shows it as a Count draft', async () => {
  const { gameId, ids } = await open((gameId) => `/game/${gameId}/results`);
  await press('Count chips for Cleo');
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('Quantity (chips)'), 'x3');
  });
  await act(() => live.persistence.flush());
  expect(live.play.getCountEditor(gameId, ids[2])!.entries[0].quantityText).toBe('x3');
  await press('Leave count for now');
  expect(screen.getByText('Count draft')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Resume count for Cleo' })).toBeTruthy();
});

it('reviews, confirms the result once, goes back and shows the toast', async () => {
  const { gameId, ids, router } = await open((gameId) => `/game/${gameId}/results`);
  const stack = live.play.getCashPlayer(gameId, ids[0])!.buyIns[0].mix;
  await act(async () => {
    for (const chip of stack) await live.play.setCountText(gameId, ids[0], chip.value, String(chip.count));
  });
  await press('Resume count for Alice');

  await press('Review result');
  expect(screen.getByText('Confirm Alice’s result?')).toBeTruthy();
  const bankBefore = live.play.getView(gameId)!.bank.chips;
  await press('Confirm result');

  expect(router.getPathname()).toBe(`/game/${gameId}/results`);
  expect(await screen.findByText('Result confirmed')).toBeTruthy();
  expect(screen.getByText('2 still to count')).toBeTruthy();
  expect(screen.getByLabelText('Break-even EUR 0.00')).toBeTruthy();
  expect(live.play.getResults(gameId)!.accounting.counted).toBe(1);
  expect(live.play.getView(gameId)!.bank.chips).toBe(bankBefore + stack.reduce((sum, chip) => sum + chip.count, 0));
});

it('marks missing quantities after a failed review and records nothing', async () => {
  const { gameId, ids } = await open((gameId, ids) => `/game/${gameId}/count/${ids[1]}`);
  await press('Review result');
  expect(screen.getByText('Count incomplete.')).toBeTruthy();
  expect(screen.getAllByText('Enter a quantity, including zero.').length).toBeGreaterThan(0);
  expect(live.play.getResults(gameId)!.players[1].state).toBe('uncounted');
  expect(live.play.getCountEditor(gameId, ids[1])!.hasDraft).toBe(false);
});
