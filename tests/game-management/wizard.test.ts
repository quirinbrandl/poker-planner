import type { GameManagement, PlanningView, StepId } from '@/game-management';

import { addChipRows, createTestHarness, expectStatus, gameWithPlayers, type TestHarness } from '../support/game-management';

let harness: TestHarness;
let app: GameManagement;

beforeEach(async () => {
  harness = await createTestHarness();
  app = await harness.open();
});
afterEach(() => harness.cleanup());

const view = (gameId: string): PlanningView => app.planning.getView(gameId)!;
const statuses = (gameId: string) => Object.fromEntries(view(gameId).steps.map((s) => [s.id, s.statusLabel]));

async function continueTo(gameId: string, step: StepId) {
  return expectStatus(await app.planning.continueFromStep(gameId, step), 'accepted').nextStep;
}

/** A valid cash game standing on Distribution preview. */
async function cashGameAtPreview() {
  const gameId = await gameWithPlayers(app, 'cash', ['Alice', 'Bob', 'Cleo']);
  await addChipRows(app, gameId, [
    ['1', '100'],
    ['5', '100'],
  ]);
  await app.planning.setSettingText(gameId, 'buyIn', '20');
  expect(await continueTo(gameId, 'players')).toBe('chipSet');
  expectStatus(await app.planning.completeChipSetStep(gameId, { kind: 'onlyThisGame' }), 'accepted');
  expect(await continueTo(gameId, 'settings')).toBe('preview');
  return gameId;
}

describe('step order and statuses', () => {
  it('shows the mode-specific steps with text statuses', async () => {
    const { gameId: cash } = await app.games.create('cash');
    const { gameId: tournament } = await app.games.create('tournament');
    expect(view(cash).steps.map((s) => s.title)).toEqual([
      'Choose mode',
      'Players',
      'Chip set',
      'Game settings',
      'Distribution preview',
    ]);
    expect(view(tournament).steps.map((s) => s.id)).toEqual(['mode', 'players', 'chipSet', 'settings', 'payouts', 'preview']);
    expect(statuses(cash)).toEqual({
      mode: 'Complete',
      players: 'Not filled in',
      chipSet: 'Not filled in',
      settings: 'Not filled in',
      preview: 'Not filled in',
    });
  });

  it('reports Needs attention and Complete from the current input', async () => {
    const gameId = await gameWithPlayers(app, 'cash', ['Alice']);
    await addChipRows(app, gameId, [['1', '']]);
    await app.planning.setSettingText(gameId, 'buyIn', '5');
    expect(statuses(gameId)).toMatchObject({ players: 'Needs attention', chipSet: 'Needs attention', settings: 'Complete' });

    await app.planning.createSavedPlayerAndAdd(gameId, 'Bob');
    await app.planning.setChipQuantityText(gameId, view(gameId).chipSet.rows[0].id, '50');
    expect(statuses(gameId)).toMatchObject({ players: 'Complete', chipSet: 'Complete', settings: 'Complete' });
  });
});

describe('Continue', () => {
  it('blocks on the current step’s problems, reveals them and keeps the input', async () => {
    const gameId = await gameWithPlayers(app, 'cash', ['Alice']);
    const blocked = expectStatus(await app.planning.continueFromStep(gameId, 'players'), 'stepInvalid');
    expect(blocked.problems.map((p) => [p.code, p.message])).toEqual([['tooFewPlayers', 'Add at least two players to continue.']]);

    app = await harness.restart(app);
    const v = view(gameId);
    expect(v.currentStep).toBe('players');
    expect(v.players.continueAttempted).toBe(true);
    expect(v.players.participants.map((p) => p.name)).toEqual(['Alice']);
  });

  it('requires two players in tournaments too', async () => {
    const gameId = await gameWithPlayers(app, 'tournament', ['Alice']);
    expectStatus(await app.planning.continueFromStep(gameId, 'players'), 'stepInvalid');
  });

  it('reveals untouched missing fields of Game settings on a failed Continue', async () => {
    const gameId = await gameWithPlayers(app, 'cash', ['Alice', 'Bob']);
    expect(view(gameId).settings.buyIn).toMatchObject({ edited: false, revealed: false });
    const blocked = expectStatus(await app.planning.continueFromStep(gameId, 'settings'), 'stepInvalid');
    expect(blocked.problems.map((p) => p.field)).toEqual(['buyIn']);
    expect(view(gameId).settings.buyIn).toMatchObject({ edited: false, revealed: true });
  });

  it('on a valid chip set asks where changes apply before advancing', async () => {
    const gameId = await gameWithPlayers(app, 'cash', ['Alice', 'Bob']);
    await continueTo(gameId, 'players');
    const [row] = await addChipRows(app, gameId, [['1', '']]);
    expectStatus(await app.planning.continueFromStep(gameId, 'chipSet'), 'stepInvalid');
    expect(view(gameId).chipSet.continueAttempted).toBe(true);

    await app.planning.setChipQuantityText(gameId, row, '10');
    const ask = expectStatus(await app.planning.continueFromStep(gameId, 'chipSet'), 'needsConfirmation');
    expect(ask.confirmation).toEqual({
      kind: 'chipSetScope',
      options: ['onlyThisGame', 'saveAsNewTemplate'],
      sourceTemplate: null,
      sourceTemplateDeleted: false,
      returnsToPreview: false,
    });
    expect(view(gameId).currentStep).toBe('chipSet');

    const done = expectStatus(await app.planning.completeChipSetStep(gameId, { kind: 'onlyThisGame' }), 'accepted');
    expect(done.nextStep).toBe('settings');
    expect(app.templates.list()).toEqual([]);
  });

  it('does not offer a working Start', async () => {
    const gameId = await cashGameAtPreview();
    expectStatus(await app.planning.continueFromStep(gameId, 'preview'), 'rejected');
    expect(view(gameId).phase).toBe('planning');
  });
});

describe('navigation', () => {
  it('Back moves to the previous step; unreached steps cannot be opened', async () => {
    const gameId = await gameWithPlayers(app, 'tournament', ['Alice', 'Bob']);
    expect(expectStatus(await app.planning.goToStep(gameId, 'settings'), 'rejected').reason.code).toBe('stepNotReached');
    await continueTo(gameId, 'players');
    expect(expectStatus(await app.planning.goBack(gameId), 'accepted').step).toBe('players');
    expect(expectStatus(await app.planning.goBack(gameId), 'accepted').step).toBe('mode');
    expectStatus(await app.planning.goBack(gameId), 'rejected');
    expect(expectStatus(await app.planning.goToStep(gameId, 'chipSet'), 'accepted').step).toBe('chipSet');
    app = await harness.restart(app);
    expect(view(gameId).currentStep).toBe('chipSet');
    expect(view(gameId).steps.filter((s) => s.reached).map((s) => s.id)).toEqual(['mode', 'players', 'chipSet']);
  });

  it('a correction from preview returns directly, and the context survives restart', async () => {
    const gameId = await cashGameAtPreview();
    expectStatus(await app.planning.goToStep(gameId, 'players', { fromPreview: true }), 'accepted');
    expect(view(gameId).returnToPreview).toBe(true);

    // Leave mid-correction with an invalid roster.
    const alice = view(gameId).players.participants[0].id;
    const bob = view(gameId).players.participants[1].id;
    await app.planning.removeParticipant(gameId, alice);
    await app.planning.removeParticipant(gameId, bob);
    await app.location.set({ kind: 'games' });
    app = await harness.restart(app);
    expect(app.location.get()).toEqual({ kind: 'games' });

    expect(expectStatus(await app.games.open(gameId), 'accepted').location).toEqual({ kind: 'planning', gameId, step: 'players' });
    expect(view(gameId).returnToPreview).toBe(true);
    expectStatus(await app.planning.continueFromStep(gameId, 'players'), 'stepInvalid');

    await app.planning.createSavedPlayerAndAdd(gameId, 'Dana');
    expect(await continueTo(gameId, 'players')).toBe('preview');
    const v = view(gameId);
    expect(v.returnToPreview).toBe(false);
    expect(v.settings.buyIn.text).toBe('20');
    expect(v.chipSet.rows).toHaveLength(2);
  });

  it('a chip set correction from preview returns there after the scope choice', async () => {
    const gameId = await cashGameAtPreview();
    await app.planning.goToStep(gameId, 'chipSet', { fromPreview: true });
    const ask = expectStatus(await app.planning.continueFromStep(gameId, 'chipSet'), 'needsConfirmation');
    expect(ask.confirmation.returnsToPreview).toBe(true);
    const done = expectStatus(await app.planning.completeChipSetStep(gameId, { kind: 'onlyThisGame' }), 'accepted');
    expect(done.nextStep).toBe('preview');
  });

  it('preview links may open a newly required step that was never reached', async () => {
    const gameId = await cashGameAtPreview();
    await app.planning.changeMode(gameId, 'tournament');
    expectStatus(await app.planning.goToStep(gameId, 'payouts'), 'rejected');
    expectStatus(await app.planning.goToStep(gameId, 'payouts', { fromPreview: true }), 'accepted');
    expect(view(gameId).payoutSchedule.preset.name).toBe('Top 2');
    expect(await continueTo(gameId, 'payouts')).toBe('preview');
  });
});

describe('working location', () => {
  it('is Games when there is nothing to resume', async () => {
    expect(app.location.get()).toEqual({ kind: 'games' });
  });

  it('restores the game and step the host was on, without changing anything', async () => {
    const gameId = await gameWithPlayers(app, 'cash', ['Alice', 'Bob']);
    await continueTo(gameId, 'players');
    const before = view(gameId);
    app = await harness.restart(app);
    expect(app.location.get()).toEqual({ kind: 'planning', gameId, step: 'chipSet' });
    expect(view(gameId)).toEqual(before);
  });

  it('restores management destinations and falls back to Games when the game is gone', async () => {
    const gameId = await gameWithPlayers(app, 'cash', ['Alice']);
    expectStatus(await app.location.set({ kind: 'templates' }), 'accepted');
    app = await harness.restart(app);
    expect(app.location.get()).toEqual({ kind: 'templates' });

    await app.games.open(gameId);
    await app.games.delete(gameId);
    app = await harness.restart(app);
    expect(app.location.get()).toEqual({ kind: 'games' });
  });
});
