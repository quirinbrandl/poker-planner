import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { PayoutsStep } from '@/features/planning/payouts/PayoutsStep';
import { createGameManagement, createMemoryStore, type DocumentStore, type GameManagement } from '@/game-management';
import { GameManagementProvider } from '@/state';
import { colors } from '@/ui';

import { renderUi } from '../ui/render';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), dismissTo: jest.fn(), push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
  // The step frame registers its Android back handler while focused; a rendered step is focused.
  useFocusEffect: (effect: () => void | (() => void)) => jest.requireActual('react').useEffect(effect, [effect]),
}));

const NAMES = ['Alice', 'Bob', 'Cleo', 'Dan', 'Emma', 'Felix'];
let id = 0;
const newId = () => `id-${++id}`;

/** A saved tournament with six players and a EUR 20 buy-in, standing on the Payout schedule step. */
async function seedTournament(store: DocumentStore, shape?: (app: GameManagement, gameId: string) => Promise<void>) {
  const app = await createGameManagement({ store, newId });
  const { gameId } = await app.games.create('tournament');
  for (const name of NAMES) await app.planning.createSavedPlayerAndAdd(gameId, name);
  for (const [value, quantity] of [
    ['25', '200'],
    ['100', '200'],
  ]) {
    const added = await app.planning.addChipRow(gameId);
    if (added.status !== 'accepted') throw new Error('row');
    await app.planning.setChipValueText(gameId, added.rowId, value);
    await app.planning.setChipQuantityText(gameId, added.rowId, quantity);
  }
  await app.planning.setSettingText(gameId, 'buyIn', '20');
  await app.planning.continueFromStep(gameId, 'players');
  await app.planning.completeChipSetStep(gameId, { kind: 'onlyThisGame' });
  await app.planning.continueFromStep(gameId, 'settings');
  await shape?.(app, gameId);
  await app.persistence.flush();
  return gameId;
}

async function renderStep(shape?: (app: GameManagement, gameId: string) => Promise<void>) {
  const store = createMemoryStore();
  const gameId = await seedTournament(store, shape);
  await renderUi(
    <GameManagementProvider store={store} newId={newId}>
      <PayoutsStep gameId={gameId} />
    </GameManagementProvider>,
  );
  await screen.findByText('Payout schedule');
}

const share = (place: string) => screen.getByLabelText(`${place} place share, percent`);
const shares = () => ['1st', '2nd', '3rd'].flatMap((p) => screen.queryAllByLabelText(`${p} place share, percent`)).map((i) => i.props.value);
const colorOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).color;

beforeEach(() => jest.mocked(router.replace).mockClear());

it('shows the suggested preset, its prizes and a complete total on the first visit', async () => {
  await renderStep();
  expect(screen.getByRole('button', { name: 'Preset: Top 2, Suggested' })).toBeTruthy();
  expect(screen.getByText('EUR 120.00')).toBeTruthy();
  expect(shares()).toEqual(['70', '30']);
  expect(screen.getByText('EUR 84.00')).toBeTruthy();
  expect(screen.getByText('EUR 36.00')).toBeTruthy();
  expect(screen.getByText('Total 100%')).toBeTruthy();
});

it('replaces every share when a preset is picked from the sheet', async () => {
  await renderStep();
  await fireEvent.press(screen.getByRole('button', { name: /^Preset: Top 2/ }));
  expect(screen.getByRole('radio', { name: 'Top 2, 70 / 30%, Suggested' })).toBeChecked();
  await act(async () => {
    fireEvent.press(screen.getByRole('radio', { name: 'Top 3, 50 / 30 / 20%' }));
  });
  expect(shares()).toEqual(['50', '30', '20']);
  expect(screen.getByRole('button', { name: 'Preset: Top 3, Suggested for 6 players: Top 2' })).toBeTruthy();
});

it('typing makes the schedule Custom and shows the field error only after leaving the field', async () => {
  await renderStep();
  await act(async () => {
    fireEvent.changeText(share('2nd'), '80');
  });
  expect(share('2nd').props.value).toBe('80');
  expect(screen.getByRole('button', { name: /^Preset: Custom/ })).toBeTruthy();
  expect(screen.queryByText('Can’t be more than 1st place (70%).')).toBeNull();
  expect(screen.getAllByText('—')).toHaveLength(2);

  await act(async () => {
    fireEvent(share('2nd'), 'blur');
  });
  expect(screen.getByText('Can’t be more than 1st place (70%).')).toBeTruthy();
});

it('a failed Continue stays on the step and turns the total from amber to red', async () => {
  await renderStep();
  await act(async () => {
    fireEvent.changeText(share('2nd'), '20');
  });
  expect(colorOf('Total 90% · 10% left')).toBe(colors.warning);

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  });
  expect(router.replace).not.toHaveBeenCalled();
  expect(colorOf('Total 90% · 10% left')).toBe(colors.error);
});

it('fixes too many paid places with the suggested preset in one tap', async () => {
  await renderStep(async (app, gameId) => {
    await app.planning.choosePayoutPreset(gameId, 'top4');
    for (let i = 0; i < 3; i++) {
      const last = app.planning.getView(gameId)!.players.participants.at(-1)!;
      await app.planning.removeParticipant(gameId, last.id);
    }
  });
  expect(screen.getByText('4 paid places, but only 3 players.')).toBeTruthy();
  expect(screen.getByText('Can’t pay more places than players (3).')).toBeTruthy();

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Use Top 2' }));
  });
  expect(screen.queryByText('4 paid places, but only 3 players.')).toBeNull();
  expect(shares()).toEqual(['70', '30']);
});
