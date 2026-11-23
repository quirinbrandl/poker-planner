import type { GameManagement } from '@/game-management';

import { createTestHarness, expectStatus, gameWithPlayers, type TestHarness } from '../support/game-management';

let harness: TestHarness;
let app: GameManagement;

beforeEach(async () => {
  harness = await createTestHarness();
  app = await harness.open();
});
afterEach(() => harness.cleanup());

const names = (gameId: string) => app.planning.getView(gameId)!.players.participants.map((p) => p.name);

describe('saved players', () => {
  it('are created trimmed, listed alphabetically and kept across restart', async () => {
    expectStatus(await app.savedPlayers.create('  bob '), 'accepted');
    expectStatus(await app.savedPlayers.create('Alice'), 'accepted');
    app = await harness.restart(app);
    expect(app.savedPlayers.list().map((p) => p.name)).toEqual(['Alice', 'bob']);
  });

  it.each([
    ['', 'nameRequired'],
    ['   ', 'nameRequired'],
    ['alice', 'duplicateName'],
    [' ALICE  ', 'duplicateName'],
  ])('reject %j as %s without changing anything', async (name, code) => {
    await app.savedPlayers.create('Alice');
    const result = expectStatus(await app.savedPlayers.create(name), 'rejected');
    expect(result.reason.code).toBe(code);
    expect(result.reason.problems?.[0].field).toBe('name');
    app = await harness.restart(app);
    expect(app.savedPlayers.list().map((p) => p.name)).toEqual(['Alice']);
  });

  it('can be renamed (including a case change of itself) but not onto another name', async () => {
    const { savedPlayerId: alice } = expectStatus(await app.savedPlayers.create('Alice'), 'accepted');
    await app.savedPlayers.create('Bob');
    expectStatus(await app.savedPlayers.rename(alice, 'ALICE'), 'accepted');
    expect(expectStatus(await app.savedPlayers.rename(alice, 'bob'), 'rejected').reason.code).toBe('duplicateName');
    expect(expectStatus(await app.savedPlayers.rename(alice, ' '), 'rejected').reason.code).toBe('nameRequired');
    app = await harness.restart(app);
    expect(app.savedPlayers.list().map((p) => p.name)).toEqual(['ALICE', 'Bob']);
  });

  it('can be deleted', async () => {
    const { savedPlayerId } = expectStatus(await app.savedPlayers.create('Alice'), 'accepted');
    expectStatus(await app.savedPlayers.delete(savedPlayerId), 'accepted');
    expectStatus(await app.savedPlayers.delete(savedPlayerId), 'rejected');
    app = await harness.restart(app);
    expect(app.savedPlayers.list()).toEqual([]);
  });
});

describe('capturing players into a game', () => {
  it('Save and add creates the saved player and captures the name with a stable id and joining order', async () => {
    const { gameId } = await app.games.create('cash');
    const created = expectStatus(await app.planning.createSavedPlayerAndAdd(gameId, ' Zoe '), 'accepted');
    await app.planning.createSavedPlayerAndAdd(gameId, 'Adam');
    app = await harness.restart(app);

    const participants = app.planning.getView(gameId)!.players.participants;
    expect(participants.map((p) => [p.name, p.joinOrder])).toEqual([
      ['Zoe', 1],
      ['Adam', 2],
    ]);
    expect(participants[0].id).toBe(created.participantIds[0]);
    expect(participants[0].savedPlayerId).toBe(created.savedPlayerId);
  });

  it('Save and add N players is all or nothing', async () => {
    const { savedPlayerId: alice } = expectStatus(await app.savedPlayers.create('Alice'), 'accepted');
    const { gameId } = await app.games.create('cash');

    const dup = expectStatus(await app.planning.createSavedPlayerAndAdd(gameId, 'alice', []), 'rejected');
    expect(dup.reason.code).toBe('duplicateName');

    const ok = expectStatus(await app.planning.createSavedPlayerAndAdd(gameId, 'Bob', [alice]), 'accepted');
    expect(ok.participantIds).toHaveLength(2);
    expect(names(gameId)).toEqual(['Alice', 'Bob']);
  });

  it('adds a batch of saved players and marks those already in the game', async () => {
    const ids: string[] = [];
    for (const name of ['Cleo', 'Alice', 'Bob']) ids.push(expectStatus(await app.savedPlayers.create(name), 'accepted').savedPlayerId);
    const { gameId } = await app.games.create('cash');
    expectStatus(await app.planning.addSavedPlayers(gameId, [ids[0], ids[2]]), 'accepted');

    expect(app.planning.getPlayerPicker(gameId)).toEqual([
      { savedPlayerId: ids[1], name: 'Alice', inGame: false, capturedName: null },
      { savedPlayerId: ids[2], name: 'Bob', inGame: true, capturedName: 'Bob' },
      { savedPlayerId: ids[0], name: 'Cleo', inGame: true, capturedName: 'Cleo' },
    ]);
    expect(names(gameId)).toEqual(['Cleo', 'Bob']);
  });

  it('rejects a batch with a player already in the game or a clashing captured name, changing nothing', async () => {
    const { savedPlayerId: alice } = expectStatus(await app.savedPlayers.create('Alice'), 'accepted');
    const { gameId } = await app.games.create('cash');
    await app.planning.addSavedPlayers(gameId, [alice]);
    // The saved player is renamed; the game keeps "Alice", and the renamed record stays unavailable.
    await app.savedPlayers.rename(alice, 'Alicia');
    const { savedPlayerId: newAlice } = expectStatus(await app.savedPlayers.create('ALICE'), 'accepted');
    const { savedPlayerId: bob } = expectStatus(await app.savedPlayers.create('Bob'), 'accepted');

    expect(expectStatus(await app.planning.addSavedPlayers(gameId, [bob, alice]), 'rejected').reason.code).toBe('alreadyInGame');
    const clash = expectStatus(await app.planning.addSavedPlayers(gameId, [bob, newAlice]), 'rejected');
    expect(clash.reason).toMatchObject({ code: 'nameTakenInGame' });
    expect(app.planning.getPlayerPicker(gameId)!.find((e) => e.savedPlayerId === alice)).toMatchObject({
      name: 'Alicia',
      inGame: true,
      capturedName: 'Alice',
    });

    app = await harness.restart(app);
    expect(names(gameId)).toEqual(['Alice']);
  });

  it('removing a participant keeps the others’ ids and order and the saved player', async () => {
    const gameId = await gameWithPlayers(app, 'cash', ['A', 'B', 'C']);
    const [a, b, c] = app.planning.getView(gameId)!.players.participants;
    expectStatus(await app.planning.removeParticipant(gameId, b.id), 'accepted');
    app = await harness.restart(app);
    expect(app.planning.getView(gameId)!.players.participants.map((p) => [p.id, p.name, p.joinOrder])).toEqual([
      [a.id, 'A', 1],
      [c.id, 'C', 2],
    ]);
    expect(app.savedPlayers.list().map((p) => p.name)).toEqual(['A', 'B', 'C']);
  });
});

describe('snapshot independence', () => {
  it('renaming or deleting a saved player never changes any game', async () => {
    const one = await gameWithPlayers(app, 'cash', ['Alice', 'Bob']);
    const two = await gameWithPlayers(app, 'tournament', ['Bob', 'Alice']);
    const [alice, bob] = app.savedPlayers.list();

    await app.savedPlayers.rename(alice.id, 'Alicia');
    await app.savedPlayers.delete(bob.id);
    app = await harness.restart(app);

    expect(names(one)).toEqual(['Alice', 'Bob']);
    expect(names(two)).toEqual(['Bob', 'Alice']);
    expect(app.games.list().map((g) => g.participantNames)).toEqual([
      ['Bob', 'Alice'],
      ['Alice', 'Bob'],
    ]);
    // The renamed record is available to future games under its new name.
    const three = await gameWithPlayers(app, 'cash', ['Alicia']);
    expect(names(three)).toEqual(['Alicia']);
  });
});
