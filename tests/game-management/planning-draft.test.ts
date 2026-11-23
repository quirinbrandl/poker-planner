import type { GameManagement, PlanningView } from '@/game-management';

import { addChipRows, createTestHarness, expectStatus, gameWithPlayers, type TestHarness } from '../support/game-management';

let harness: TestHarness;
let app: GameManagement;

beforeEach(async () => {
  harness = await createTestHarness();
  app = await harness.open();
});
afterEach(() => harness.cleanup());

const view = (gameId: string, a: GameManagement = app): PlanningView => {
  const v = a.planning.getView(gameId);
  if (!v) throw new Error('no planning view');
  return v;
};

describe('a new game', () => {
  it('starts autosaved in Planning at Players with the approved defaults', async () => {
    const { gameId } = await app.games.create('cash');
    app = await harness.restart(app);

    const v = view(gameId);
    expect(v.mode).toBe('cash');
    expect(v.phase).toBe('planning');
    expect(v.currentStep).toBe('players');
    expect(v.players.participants).toEqual([]);
    expect(v.chipSet.rows).toEqual([]);
    expect(v.chipSet.summary.label).toBe('No denominations yet');
    expect(v.settings.buyIn.text).toBe('');
    expect(v.settings.depth.text).toBe('100');
    expect(v.settings.recommendedDepthBb).toBe(100);
    expect(v.settings.preference).toBe('fewer');
    expect(v.settings.coverage.text).toBe('4');
    expect(v.settings.reserve).toMatchObject({ mode: 'automatic', text: '0', automaticCount: 0 });
    expect(v.settings.buyIn.problem?.code).toBe('buyInMissing');
  });

  it('is listed with mode, phase, creation time and participant names, newest first', async () => {
    const first = await gameWithPlayers(app, 'cash', ['Alice', 'Bob']);
    const second = await gameWithPlayers(app, 'tournament', ['Cleo']);
    app = await harness.restart(app);

    const list = app.games.list();
    expect(list.map((g) => g.id)).toEqual([second, first]);
    expect(list[1]).toMatchObject({
      mode: 'cash',
      phase: 'planning',
      participantNames: ['Alice', 'Bob'],
      lastStep: 'players',
      lastStepTitle: 'Players',
    });
    expect(new Date(list[1].createdAt).getTime()).toBeLessThan(new Date(list[0].createdAt).getTime());
  });
});

describe('raw input', () => {
  it('keeps invalid and incomplete values exactly as typed, with their problems, across restart', async () => {
    const gameId = await gameWithPlayers(app, 'cash', ['Alice']);
    const [rowA, rowB] = await addChipRows(app, gameId, [
      ['5', ''],
      ['5', '-3'],
    ]);
    expectStatus(await app.planning.setSettingText(gameId, 'buyIn', '20.505'), 'savedInvalid');
    expectStatus(await app.planning.setSettingText(gameId, 'depth', ' 1e2'), 'savedInvalid');
    expectStatus(await app.planning.setSettingText(gameId, 'coverage', '0'), 'savedInvalid');

    app = await harness.restart(app);
    const v = view(gameId);
    expect(v.settings.buyIn).toMatchObject({ text: '20.505', edited: true, revealed: true });
    expect(v.settings.buyIn.problem?.code).toBe('buyInTooManyDecimals');
    expect(v.settings.depth.text).toBe(' 1e2');
    expect(v.settings.depth.problem?.code).toBe('depthNotWholeNumber');
    expect(v.settings.coverage.problem?.code).toBe('coverageBelowMinimum');
    expect(v.players.problems.map((p) => p.code)).toEqual(['tooFewPlayers']);

    const [a, b] = v.chipSet.rows;
    expect(a.id).toBe(rowA);
    expect(a.quantity.problem?.code).toBe('quantityMissing');
    expect(b.id).toBe(rowB);
    expect(b.value.problem).toMatchObject({ code: 'duplicateValue', message: 'Combine quantities in the existing row' });
    expect(b.quantity).toMatchObject({ text: '-3' });
    expect(b.quantity.problem?.code).toBe('quantityNotWholeNumber');
    expect(v.chipSet.summary.label).toBe('Incomplete chip set');
  });

  it('treats empty as missing, not zero, and accepts valid money with comma or dot', async () => {
    const { gameId } = await app.games.create('cash');
    expect(expectStatus(await app.planning.setSettingText(gameId, 'buyIn', '0'), 'savedInvalid').problems[0].code).toBe(
      'buyInNotPositive',
    );
    expectStatus(await app.planning.setSettingText(gameId, 'buyIn', '0,01'), 'accepted');
    expectStatus(await app.planning.setSettingText(gameId, 'buyIn', '20.5'), 'accepted');
    expect(expectStatus(await app.planning.setSettingText(gameId, 'depth', ''), 'savedInvalid').problems[0].code).toBe(
      'depthMissing',
    );
    expect(view(gameId).settings.depth.text).toBe('');
  });

  it('accepts explicit zero quantities, including an all-zero set', async () => {
    const { gameId } = await app.games.create('cash');
    await addChipRows(app, gameId, [
      ['1', '0'],
      ['5', '0'],
    ]);
    const v = view(gameId);
    expect(v.chipSet.problems).toEqual([]);
    expect(v.chipSet.summary).toMatchObject({ kind: 'valid', label: '2 denominations · 0 chips · 0 chip units' });
  });

  it('requires at least one denomination and keeps row order, colours and edits', async () => {
    const { gameId } = await app.games.create('cash');
    expect(view(gameId).chipSet.setProblem?.code).toBe('noDenominations');
    const [r1, r2, r3] = await addChipRows(app, gameId, [
      ['25', '100'],
      ['1', '200'],
      ['5', '100'],
    ]);
    expectStatus(await app.planning.setChipColor(gameId, r2, 'white'), 'accepted');
    app = await harness.restart(app);

    const v = view(gameId);
    expect(v.chipSet.rows.map((r) => [r.id, r.value.text, r.color])).toEqual([
      [r1, '25', null],
      [r2, '1', 'white'],
      [r3, '5', null],
    ]);
    expect(v.chipSet.summary.label).toBe('3 denominations · 400 chips · 3,200 chip units');
  });

  it('removes blank rows at once and asks before removing a populated row', async () => {
    const { gameId } = await app.games.create('cash');
    const { rowId: blank } = expectStatus(await app.planning.addChipRow(gameId), 'accepted');
    const [filled] = await addChipRows(app, gameId, [['5', '']]);

    expectStatus(await app.planning.removeChipRow(gameId, blank), 'accepted');
    const ask = expectStatus(await app.planning.removeChipRow(gameId, filled), 'needsConfirmation');
    expect(ask.confirmation).toMatchObject({ kind: 'removeChipRow', index: 1, valueText: '5', quantityText: '' });
    expect(view(gameId).chipSet.rows).toHaveLength(1);

    expectStatus(await app.planning.removeChipRow(gameId, filled, { confirmed: true }), 'accepted');
    app = await harness.restart(app);
    expect(view(gameId).chipSet.rows).toEqual([]);
    expect(view(gameId).chipSet.setProblem?.code).toBe('noDenominations');
  });
});

describe('several games', () => {
  it('stay independent through edits, restart and deletion', async () => {
    const a = await gameWithPlayers(app, 'cash', ['Alice', 'Bob']);
    const b = await gameWithPlayers(app, 'tournament', ['Alice', 'Cleo']);
    await app.planning.setSettingText(a, 'buyIn', '20');
    await app.planning.setSettingText(b, 'buyIn', '10,50');
    await addChipRows(app, a, [['1', '100']]);

    app = await harness.restart(app);
    expect(view(a).settings.buyIn.text).toBe('20');
    expect(view(b).settings.buyIn.text).toBe('10,50');
    expect(view(b).chipSet.rows).toEqual([]);
    expect(view(b).players.participants.map((p) => p.name)).toEqual(['Alice', 'Cleo']);
    const bBefore = view(b);

    expectStatus(await app.games.delete(a), 'accepted');
    app = await harness.restart(app);
    expect(app.planning.getView(a)).toBeNull();
    expect(app.games.list().map((g) => g.id)).toEqual([b]);
    expect(view(b)).toEqual(bBefore);
    expect(app.savedPlayers.list().map((p) => p.name)).toEqual(['Alice', 'Bob', 'Cleo']);
  });
});

describe('chip reserve', () => {
  it('follows the roster while automatic', async () => {
    const gameId = await gameWithPlayers(app, 'cash', ['A', 'B', 'C']);
    expect(view(gameId).settings.reserve).toMatchObject({ mode: 'automatic', text: '2', automaticCount: 2, problem: null });
    await app.planning.createSavedPlayerAndAdd(gameId, 'D');
    await app.planning.createSavedPlayerAndAdd(gameId, 'E');
    expect(view(gameId).settings.reserve.text).toBe('3');
    await app.planning.removeParticipant(gameId, view(gameId).players.participants[0].id);
    app = await harness.restart(app);
    expect(view(gameId).settings.reserve).toMatchObject({ mode: 'automatic', text: '2' });
  });

  it.each([
    ['0', null],
    ['2', null],
    ['', 'reserveMissing'],
    ['two', 'reserveNotWholeNumber'],
  ])('keeps a custom %j through roster changes until Use automatic', async (typed, code) => {
    const gameId = await gameWithPlayers(app, 'cash', ['A', 'B', 'C']);
    await app.planning.setSettingText(gameId, 'reserve', typed);
    await app.planning.createSavedPlayerAndAdd(gameId, 'D');
    await app.planning.createSavedPlayerAndAdd(gameId, 'E');
    app = await harness.restart(app);

    let reserve = view(gameId).settings.reserve;
    expect(reserve).toMatchObject({ mode: 'custom', text: typed, automaticCount: 3 });
    expect(reserve.problem?.code ?? null).toBe(code);

    expectStatus(await app.planning.useAutomaticReserve(gameId), 'accepted');
    await app.planning.createSavedPlayerAndAdd(gameId, 'F');
    app = await harness.restart(app);
    reserve = view(gameId).settings.reserve;
    expect(reserve).toMatchObject({ mode: 'automatic', text: '3', problem: null });
  });
});

describe('mode change during Planning', () => {
  it('keeps participants, chip set, shared settings and dormant payout entries', async () => {
    const gameId = await gameWithPlayers(app, 'tournament', ['Alice', 'Bob']);
    await addChipRows(app, gameId, [['1', '100']]);
    await app.planning.setSettingText(gameId, 'buyIn', '15');
    await app.planning.setSettingText(gameId, 'reserve', '0');
    await app.planning.setDistributionPreference(gameId, 'more');
    const { rowId } = expectStatus(await app.planning.addPayoutRow(gameId), 'accepted');
    await app.planning.setPayoutShareText(gameId, rowId, '100');
    const before = view(gameId);

    expectStatus(await app.planning.changeMode(gameId, 'cash'), 'accepted');
    app = await harness.restart(app);
    const cash = view(gameId);
    expect(cash.mode).toBe('cash');
    expect(cash.steps.map((s) => s.id)).toEqual(['mode', 'players', 'chipSet', 'settings', 'preview']);
    expect(cash.players).toEqual(before.players);
    expect(cash.chipSet).toEqual(before.chipSet);
    expect(cash.settings).toEqual(before.settings);
    expect(cash.payoutSchedule.rows.map((r) => r.share.text)).toEqual(['100']);

    expectStatus(await app.planning.changeMode(gameId, 'tournament'), 'accepted');
    const back = view(gameId);
    expect(back.steps.map((s) => s.id)).toContain('payouts');
    expect(back.payoutSchedule.rows.map((r) => r.share.text)).toEqual(['100']);
  });

  it('a newly required payout step shows up in the whole-plan check', async () => {
    const gameId = await gameWithPlayers(app, 'cash', ['Alice', 'Bob']);
    await addChipRows(app, gameId, [['1', '100']]);
    await app.planning.setSettingText(gameId, 'buyIn', '10');
    expect(view(gameId).preview).toEqual({ blockers: [], setupComplete: true });

    await app.planning.changeMode(gameId, 'tournament');
    const preview = view(gameId).preview;
    expect(preview.setupComplete).toBe(false);
    expect(preview.blockers.map((b) => [b.step, b.problems[0].code])).toEqual([['payouts', 'noPaidPlaces']]);
  });
});
