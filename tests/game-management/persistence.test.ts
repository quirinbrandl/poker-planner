import { createGameManagement, type GameManagement, UnsupportedDataVersionError } from '@/game-management';

import { addChipRows, createTestHarness, expectStatus, gameWithPlayers, type TestHarness } from '../support/game-management';

let harness: TestHarness;
let app: GameManagement;

beforeEach(async () => {
  harness = await createTestHarness();
  app = await harness.open();
});
afterEach(() => harness.cleanup());

/** Everything the host can observe, for before/after comparisons. */
function observe(a: GameManagement) {
  return {
    games: a.games.list(),
    views: a.games.list().map((g) => a.planning.getView(g.id)),
    players: a.savedPlayers.list(),
    templates: a.templates.list(),
    location: a.location.get(),
  };
}

it('rejected operations leave memory and saved data unchanged', async () => {
  const gameId = await gameWithPlayers(app, 'cash', ['Alice', 'Bob']);
  const [row] = await addChipRows(app, gameId, [['1', '10']]);
  const { templateId } = expectStatus(
    await app.templates.create({ name: 'Home', rows: [{ id: 'a', valueText: '1', quantityText: '5', color: null }] }),
    'accepted',
  );
  await app.persistence.flush();
  const before = observe(app);

  const results = [
    await app.savedPlayers.create('alice'),
    await app.savedPlayers.rename('missing', 'X'),
    await app.planning.createSavedPlayerAndAdd(gameId, 'Bob'),
    await app.planning.addSavedPlayers(gameId, [app.savedPlayers.list()[0].id]),
    await app.planning.removeParticipant(gameId, 'missing'),
    await app.planning.setChipValueText(gameId, 'missing', '5'),
    await app.planning.setSettingText('missing', 'buyIn', '5'),
    await app.planning.goToStep(gameId, 'preview'),
    await app.templates.create({ name: 'home', rows: [{ id: 'a', valueText: '1', quantityText: '5', color: null }] }),
    await app.templates.update(templateId, { name: 'Home', rows: [] }),
    await app.planning.completeChipSetStep(gameId, { kind: 'updateSourceTemplate' }),
    await app.games.delete('missing'),
    await app.location.set({ kind: 'planning', gameId: 'missing', step: 'players' }),
  ];
  for (const result of results) expect(result.status).toBe('rejected');
  // Declined confirmations change nothing either.
  expectStatus(await app.planning.removeChipRow(gameId, row), 'needsConfirmation');
  expectStatus(await app.planning.applyTemplate(gameId, templateId), 'needsConfirmation');

  expect(observe(app)).toEqual(before);
  app = await harness.restart(app);
  expect(observe(app)).toEqual(before);
});

it('quick successive operations are all saved, in order', async () => {
  const { gameId } = await app.games.create('cash');
  const typing = ['2', '20', '20,', '20,5', '20,50'].map((text) => app.planning.setSettingText(gameId, 'buyIn', text));
  const adding = app.planning.createSavedPlayerAndAdd(gameId, 'Alice');
  await Promise.all([...typing, adding]);
  app = await harness.open();
  const v = app.planning.getView(gameId)!;
  expect(v.settings.buyIn.text).toBe('20,50');
  expect(v.players.participants.map((p) => p.name)).toEqual(['Alice']);
});

it('reads reflect a change immediately and report saving until the commit finishes', async () => {
  const { gameId } = await app.games.create('cash');
  const pending = app.planning.setSettingText(gameId, 'buyIn', '7');
  expect(app.planning.getView(gameId)!.settings.buyIn.text).toBe('7');
  expect(app.persistence.getStatus()).toEqual({ state: 'saving' });
  await pending;
  expect(app.persistence.getStatus()).toEqual({ state: 'saved' });
});

it('notifies subscribers and keeps unchanged reads identical', async () => {
  const { gameId } = await app.games.create('cash');
  const other = await gameWithPlayers(app, 'cash', ['Alice']);
  const listener = jest.fn();
  const unsubscribe = app.subscribe(listener);
  const otherView = app.planning.getView(other);
  const players = app.savedPlayers.list();

  await app.planning.setSettingText(gameId, 'buyIn', '7');
  expect(listener).toHaveBeenCalled();
  expect(app.planning.getView(other)).toBe(otherView);
  expect(app.savedPlayers.list()).toBe(players);
  expect(app.planning.getView(gameId)).toBe(app.planning.getView(gameId));
  unsubscribe();
});

it('refuses to open data from a newer app version and leaves it untouched', async () => {
  await gameWithPlayers(app, 'cash', ['Alice']);
  await app.persistence.flush();
  const store = harness.store();
  await store.commit([{ key: 'meta', text: JSON.stringify({ schemaVersion: 999 }) }]);
  const before = await store.loadAll();

  await expect(createGameManagement({ store: harness.store() })).rejects.toBeInstanceOf(UnsupportedDataVersionError);
  expect(await harness.store().loadAll()).toEqual(before);
});
