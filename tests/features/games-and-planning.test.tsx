import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { createGameManagement, createMemoryStore, type DocumentStore } from '@/game-management';

import { renderApp } from './render-app';

// Field helpers are spoken as the input's hint, so they are hidden from the accessibility tree.
const HIDDEN = { includeHiddenElements: true };

/** A cash game with six players and a valid chip set, waiting on Game settings. */
async function storeWithPlanOnSettings(): Promise<{ store: DocumentStore; gameId: string }> {
  const store = createMemoryStore();
  let id = 0;
  const app = await createGameManagement({ store, newId: () => `seed-${++id}` });
  const { gameId } = await app.games.create('cash');
  for (const name of ['Maya', 'Jonas', 'Lena', 'Sam', 'Alex', 'Noor']) {
    await app.planning.createSavedPlayerAndAdd(gameId, name);
  }
  await app.planning.continueFromStep(gameId, 'players');
  const row = await app.planning.addChipRow(gameId);
  if (row.status !== 'accepted') throw new Error('no row');
  await app.planning.setChipValueText(gameId, row.rowId, '1');
  await app.planning.setChipQuantityText(gameId, row.rowId, '300');
  const chips = await app.planning.continueFromStep(gameId, 'chipSet');
  if (chips.status === 'needsConfirmation') await app.planning.completeChipSetStep(gameId, { kind: 'onlyThisGame' });
  await app.persistence.flush();
  return { store, gameId };
}

it('offers New game on an empty Games screen; choosing a mode creates a plan that Games then lists', async () => {
  const router = await renderApp();
  expect(await screen.findByText('No games yet.')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'New game' }));
  expect(await screen.findByText('Choose mode')).toBeTruthy();

  // Continue without a choice creates nothing.
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(await screen.findByText('Choose a game mode to continue.')).toBeTruthy();
  expect(router.getPathname()).toBe('/new-game');

  await fireEvent.press(screen.getByRole('radio', { name: 'Tournament' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await waitFor(() => expect(router.getPathname()).toMatch(/^\/game\/.+\/planning\/players$/));

  await fireEvent.press(screen.getAllByRole('button', { name: 'Back to Games' })[0]);
  await waitFor(() => expect(router.getPathname()).toBe('/'));
  expect(await screen.findByText('Planning · Tournament')).toBeTruthy();
  expect(screen.getByText('Resume players →')).toBeTruthy();
  expect(screen.getByText('1 draft')).toBeTruthy();
});

it('reopens on the saved step, with Games underneath', async () => {
  const { store } = await storeWithPlanOnSettings();
  const router = await renderApp({ store });
  expect(await screen.findByText('Game settings')).toBeTruthy();
  expect(router.getPathname()).toMatch(/\/planning\/settings$/);

  await fireEvent.press(screen.getAllByRole('button', { name: 'Back to Games' })[0]);
  await waitFor(() => expect(router.getPathname()).toBe('/'));
  expect(await screen.findByText('Resume game settings →')).toBeTruthy();
});

it('stays on Game settings after an invalid Continue and shows the problems', async () => {
  const { store } = await storeWithPlanOnSettings();
  const router = await renderApp({ store });
  const buyIn = await screen.findByLabelText('Buy-in per player, euros');

  await fireEvent.changeText(buyIn, '20.005');
  // Still typing for the first time: no error yet.
  expect(screen.queryByText('Use at most two decimal places (whole cents).')).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(await screen.findByText('Check the highlighted fields.')).toBeTruthy();
  expect(screen.getByText('Use at most two decimal places (whole cents).')).toBeTruthy();
  expect(screen.getByLabelText('Buy-in per player, euros').props.value).toBe('20.005');
  expect(router.getPathname()).toMatch(/\/planning\/settings$/);
});

it('keeps the reserve automatic on focus, makes it custom on typing, and restores it with Use automatic', async () => {
  const { store } = await storeWithPlanOnSettings();
  await renderApp({ store });
  const reserve = await screen.findByLabelText('Chip reserve, stacks');
  expect(reserve.props.value).toBe('3');

  await fireEvent(reserve, 'focus');
  await fireEvent(reserve, 'blur');
  expect(screen.getByText('For rebuys and late arrivals. Automatic for 6 players.', HIDDEN)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Use automatic (3)' })).toBeNull();

  await fireEvent.changeText(reserve, '3');
  expect(await screen.findByText('For rebuys and late arrivals. Custom amount.', HIDDEN)).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Use automatic (3)' }));
  expect(await screen.findByText('For rebuys and late arrivals. Automatic for 6 players.', HIDDEN)).toBeTruthy();
  expect(screen.getByLabelText('Chip reserve, stacks').props.value).toBe('3');
});

it('deletes a game only after confirmation; Cancel changes nothing', async () => {
  const { store } = await storeWithPlanOnSettings();
  const router = await renderApp({ store });
  await screen.findByText('Game settings');

  await fireEvent.press(screen.getByRole('button', { name: 'Game actions' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Delete game…' }));
  expect(await screen.findByText('Delete this game?')).toBeTruthy();
  expect(screen.getByText('Maya, Jonas, Lena, Sam, Alex, Noor')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByText('Delete this game?')).toBeNull());
  expect(router.getPathname()).toMatch(/\/planning\/settings$/);

  await fireEvent.press(screen.getByRole('button', { name: 'Game actions' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Delete game…' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Delete game' }));
  await waitFor(() => expect(router.getPathname()).toBe('/'));
  expect(await screen.findByText('Game deleted')).toBeTruthy();
  expect(screen.getByText('No games yet.')).toBeTruthy();
});
