import type { GameManagement, PaymentsView } from '@/game-management';

import {
  createTestHarness,
  expectStatus,
  observe,
  plannedGame,
  type PlanSetup,
  recordCount,
  startPlannedGame,
  type TestHarness,
} from '../support/game-management';

let harness: TestHarness;
let app: GameManagement;

beforeEach(async () => {
  harness = await createTestHarness();
  app = await harness.open();
});
afterEach(() => harness.cleanup());

const SIX = ['Alice', 'Bob', 'Cleo', 'Dan', 'Emma', 'Felix'];
/** 1 White ×200, 5 Red ×150, 25 Blue ×100, 100 Black ×50. Every stack: [15, 2, 3, 1] = 200 units. */
const chips = (players: string[], buyIn = '20'): PlanSetup => ({
  players,
  buyIn,
  chips: [
    ['1', '200'],
    ['5', '150'],
    ['25', '100'],
    ['100', '50'],
  ],
  colors: ['white', 'red', 'blue', 'black'],
});
const STACK = [15, 2, 3, 1];

/**
 * The spec's 8·7·6 versus 13·8 case at EUR 20 per 200 units: Alice +13, Bob −8, Cleo +8,
 * Dan −7, Emma −6, Felix 0. The six counts return exactly the 6 stacks handed out.
 */
const READY_COUNTS = [
  [0, 6, 8, 1], // 330 units: EUR 33.00
  [20, 0, 0, 1], // 120: EUR 12.00
  [5, 0, 3, 2], // 280: EUR 28.00
  [0, 1, 1, 1], // 130: EUR 13.00
  [0, 3, 1, 1], // 140: EUR 14.00
  [65, 2, 5, 0], // 200: EUR 20.00
];

async function startedGame(players: string[] = SIX, buyIn = '20') {
  const gameId = await plannedGame(app, 'cash', chips(players, buyIn));
  const ids = await startPlannedGame(app, gameId);
  expect(app.play.getCashPlayer(gameId, ids[0])!.buyIns[0].mix.map((c) => c.count)).toEqual(STACK);
  return { gameId, ids };
}

async function countAll(gameId: string, ids: readonly string[], counts: readonly (readonly number[])[]) {
  for (const [i, id] of ids.entries()) await recordCount(app, gameId, id, counts[i]);
}

/** A completed six-player game (the 8·7·6 versus 13·8 case). */
async function completedGame() {
  const { gameId, ids } = await startedGame();
  await countAll(gameId, ids, READY_COUNTS);
  expectStatus(await app.play.calculatePayments(gameId, { confirmed: true }), 'accepted');
  return { gameId, ids };
}

/** Everything observable about the game: cards, lists, reads of every tab and player, location. */
function observeAll(gameId: string, ids: readonly string[]) {
  return {
    ...observe(app, gameId),
    list: app.games.list(),
    history: app.games.history(),
    results: app.play.getResults(gameId),
    payments: app.play.getPayments(gameId),
    players: ids.map((id) => app.play.getCashPlayer(gameId, id)),
    editors: ids.map((id) => app.play.getCountEditor(gameId, id)),
    savedPlayers: app.savedPlayers.list(),
  };
}

/** Fails unless nothing observable changed, now and after a restart. */
async function expectUnchanged<R>(gameId: string, ids: readonly string[], run: () => Promise<R> | R): Promise<R> {
  const before = observeAll(gameId, ids);
  const result = await run();
  expect(observeAll(gameId, ids)).toEqual(before);
  app = await harness.restart(app);
  expect(observeAll(gameId, ids)).toEqual(before);
  return result;
}

const paymentLines = (payments: PaymentsView | null) =>
  payments?.summary.kind === 'payments'
    ? payments.summary.payments.map((p) => `${p.fromName} → ${p.toName} ${p.amountText}`)
    : [];

describe('Calculate Payments', () => {
  it('is rejected with the one reason while someone is uncounted, and changes nothing', async () => {
    const { gameId, ids } = await startedGame();
    await countAll(gameId, ids.slice(0, 5), READY_COUNTS);
    expect(app.play.getResults(gameId)!.calculatePayments).toEqual({ available: false, reason: 'Count everyone first.' });
    for (const confirmed of [false, true]) {
      const result = await expectUnchanged(gameId, ids, () => app.play.calculatePayments(gameId, { confirmed }));
      expect(result).toEqual({ status: 'rejected', reason: { code: 'notReady', message: 'Count everyone first.' } });
    }
    expect(app.games.get(gameId)!.phase).toBe('inProgress');
  });

  it('blocks even one missing chip unit, keeping every result', async () => {
    const { gameId, ids } = await startedGame();
    // Felix returns one White chip less: 1,199 of 1,200 units (EUR 0.10).
    await countAll(gameId, ids, [...READY_COUNTS.slice(0, 5), [64, 2, 5, 0]]);
    expect(app.play.getResults(gameId)!.status).toMatchObject({ kind: 'missing', title: '1 chip unit missing' });
    const result = await expectUnchanged(gameId, ids, () => app.play.calculatePayments(gameId, { confirmed: true }));
    expect(result).toMatchObject({ status: 'rejected', reason: { code: 'notReady', message: 'Find the missing chips first.' } });
    expect(app.play.getResults(gameId)!.accounting).toMatchObject({ counted: 6, countedUnits: 1199, issuedUnits: 1200 });
  });

  it('asks for confirmation first; without it nothing changes', async () => {
    const { gameId, ids } = await startedGame();
    await countAll(gameId, ids, READY_COUNTS);
    const result = await expectUnchanged(gameId, ids, () => app.play.calculatePayments(gameId));
    expect(result).toEqual({
      status: 'needsConfirmation',
      confirmation: { kind: 'calculatePayments', readyLine: 'All 6 counted · 1,200 chip units', facts: [] },
    });
    expect(app.play.getPayments(gameId)).toBeNull();
  });

  it('settles 8·7·6 against 13·8 with three direct payments and completes the game', async () => {
    const { gameId, ids } = await startedGame();
    await countAll(gameId, ids, READY_COUNTS);
    const result = expectStatus(await app.play.calculatePayments(gameId, { confirmed: true }), 'accepted');
    expect(result.location).toEqual({ kind: 'payments', gameId });
    expect(app.location.get()).toEqual({ kind: 'payments', gameId });

    const card = app.games.get(gameId)!;
    expect(card).toMatchObject({ phase: 'completed', reopened: false });
    expect(card.finishedAt).toEqual(expect.any(String));
    expect(app.games.list().some((g) => g.id === gameId)).toBe(false);

    const payments = app.play.getPayments(gameId)!;
    expect(payments).toMatchObject({ gameId, mode: 'cash', finishedAt: card.finishedAt });
    expect(payments.summary).toMatchObject({ kind: 'payments', countText: '3 payments', totalText: 'EUR 21.00 in total' });
    expect(paymentLines(payments)).toEqual(['Bob → Cleo EUR 8.00', 'Dan → Alice EUR 7.00', 'Emma → Alice EUR 6.00']);
    expect(payments.balances.map((b) => [b.name, b.lines.join(' · '), b.balanceText, b.direction])).toEqual([
      ['Alice', 'EUR 33.00 chips · EUR 20.00 buy-ins', '+EUR 13.00', 'gain'],
      ['Bob', 'EUR 12.00 chips · EUR 20.00 buy-ins', '−EUR 8.00', 'loss'],
      ['Cleo', 'EUR 28.00 chips · EUR 20.00 buy-ins', '+EUR 8.00', 'gain'],
      ['Dan', 'EUR 13.00 chips · EUR 20.00 buy-ins', '−EUR 7.00', 'loss'],
      ['Emma', 'EUR 14.00 chips · EUR 20.00 buy-ins', '−EUR 6.00', 'loss'],
      ['Felix', 'EUR 20.00 chips · EUR 20.00 buy-ins', 'EUR 0.00', 'even'],
    ]);
    expect(payments.balances.every((b) => b.placeLabel === null && !b.placeHighlight)).toBe(true);
    expect(payments.balances.map((b) => b.participantId)).toEqual(ids);

    // Restart: the same settlement is read back, not recalculated differently.
    app = await harness.restart(app);
    expect(app.play.getPayments(gameId)).toEqual(payments);
    expect(app.location.get()).toEqual({ kind: 'payments', gameId });
  });

  it('settles Alice and Bob (EUR 20 each, finishing EUR 30 / EUR 10) as Bob pays Alice EUR 10', async () => {
    const { gameId, ids } = await startedGame(['Alice', 'Bob']);
    await countAll(gameId, ids, [
      [30, 4, 6, 1], // 300 units: EUR 30.00
      [0, 0, 0, 1], // 100 units: EUR 10.00
    ]);
    expectStatus(await app.play.calculatePayments(gameId, { confirmed: true }), 'accepted');
    const payments = app.play.getPayments(gameId)!;
    expect(payments.summary).toMatchObject({ countText: '1 payment', totalText: 'EUR 10.00 in total' });
    expect(paymentLines(payments)).toEqual(['Bob → Alice EUR 10.00']);
    expect(payments.balances.map((b) => b.balanceText)).toEqual(['+EUR 10.00', '−EUR 10.00']);
  });

  it('completes with No payments needed when everyone breaks even', async () => {
    const { gameId, ids } = await startedGame();
    await countAll(gameId, ids, ids.map(() => STACK));
    expectStatus(await app.play.calculatePayments(gameId, { confirmed: true }), 'accepted');
    const payments = app.play.getPayments(gameId)!;
    expect(payments.summary).toEqual({ kind: 'noPayments' });
    expect(payments.balances.every((b) => b.balanceText === 'EUR 0.00' && b.direction === 'even')).toBe(true);
    expect(app.games.history()[0].facts).toEqual([{ label: 'Buy-ins', value: 'EUR 120.00' }, { value: 'No payments needed' }]);
  });

  it('keeps exact sub-cent amounts In progress and allocates whole cents at completion', async () => {
    // EUR 10.01 per 200 units: 5.005 cents per unit.
    const { gameId, ids } = await startedGame(SIX, '10.01');
    await countAll(gameId, ids, [
      [0, 0, 6, 1], // 250 units: EUR 12.5125 exact
      [0, 0, 2, 1], // 150 units: EUR 7.5075 exact
      [0, 0, 4, 1],
      [0, 0, 4, 1],
      [0, 0, 0, 2],
      [90, 12, 2, 0],
    ]);
    expect(app.play.getResults(gameId)!.players[0].result).toEqual({ amountText: '+EUR 2.5025', direction: 'gain' });
    expect(app.play.getCashPlayer(gameId, ids[0])!.result!.chipValueText).toBe('EUR 12.5125');

    expectStatus(await app.play.calculatePayments(gameId, { confirmed: true }), 'accepted');
    const results = app.play.getResults(gameId)!;
    expect(results.phase).toBe('completed');
    // Floors 1251 / 750 / 1001 × 4 leave one cent: it goes to Bob's larger remainder (.75 over .25).
    expect(results.players.map((p) => p.result!.amountText)).toEqual([
      '+EUR 2.50',
      '−EUR 2.50',
      'EUR 0.00',
      'EUR 0.00',
      'EUR 0.00',
      'EUR 0.00',
    ]);
    expect(app.play.getCashPlayer(gameId, ids[0])!.result).toMatchObject({
      chipValueText: 'EUR 12.51',
      winLoss: { amountText: '+EUR 2.50', direction: 'gain' },
    });
    expect(app.play.getCashPlayer(gameId, ids[1])!.result!.chipValueText).toBe('EUR 7.51');
    const payments = app.play.getPayments(gameId)!;
    expect(paymentLines(payments)).toEqual(['Bob → Alice EUR 2.50']);
    // Final results sum to all contributions exactly: 6 × EUR 10.01.
    const finals = payments.balances.map((b) => Number(b.lines[0].split(' chips')[0].replace('EUR ', '')) * 100);
    expect(Math.round(finals.reduce((sum, cents) => sum + cents, 0))).toBe(6006);
  });
});

describe('a Completed game', () => {
  it('is read-only for every play operation, with the reopen route in the message', async () => {
    const { gameId, ids } = await completedGame();
    const reason = { code: 'gameCompleted', message: 'This game is completed. To change something, reopen it from ⋯.' };
    const attempts: (() => unknown)[] = [
      () => app.play.setCountText(gameId, ids[0], 1, '3'),
      () => app.play.setRemainingCountToZero(gameId, ids[0]),
      () => app.play.discardCountDraft(gameId, ids[0]),
      () => app.play.reviewCount(gameId, ids[0]),
      () => app.play.confirmResult(gameId, ids[0], { counts: [0, 0, 0, 0] }),
    ];
    for (const attempt of attempts) {
      expect(await expectUnchanged(gameId, ids, attempt)).toEqual({ status: 'rejected', reason });
    }
    expect(await expectUnchanged(gameId, ids, () => app.play.calculatePayments(gameId, { confirmed: true }))).toMatchObject({
      status: 'rejected',
      reason: { code: 'gameCompleted' },
    });
    expect(await expectUnchanged(gameId, ids, () => app.planning.setSettingText(gameId, 'buyIn', '50'))).toMatchObject({
      status: 'rejected',
      reason: { code: 'setupLocked' },
    });
    // Reads stay available, read-only.
    expect(app.play.getCountEditor(gameId, ids[0])).toBeNull();
    const results = app.play.getResults(gameId)!;
    expect(results).toMatchObject({ phase: 'completed', reopened: false, status: { kind: 'addsUp' } });
    expect(results.calculatePayments.available).toBe(false);
    expect(results.players.map((p) => p.state)).toEqual(ids.map(() => 'result'));
    const alice = app.play.getCashPlayer(gameId, ids[0])!;
    expect(alice).toMatchObject({ phase: 'completed', actions: { countFinalChips: false } });
    expect(alice.result).toMatchObject({ chipValueText: 'EUR 33.00', winLoss: { amountText: '+EUR 13.00' } });
    expect(app.play.getView(gameId)).toBeNull();
  });

  it('rejects Return to Planning until reopened', async () => {
    const { gameId, ids } = await completedGame();
    const result = await expectUnchanged(gameId, ids, () => app.play.returnToPlanning(gameId, { confirmed: true }));
    expect(result).toMatchObject({ status: 'rejected', reason: { code: 'gameCompleted' } });
    expectStatus(await app.play.reopen(gameId, { confirmed: true }), 'accepted');
    expect(expectStatus(await app.play.returnToPlanning(gameId), 'needsConfirmation').confirmation.clears.results).toBe(6);
  });
});

describe('Reopen', () => {
  it('asks for confirmation, is rejected unless Completed, and changes nothing until confirmed', async () => {
    const { gameId, ids } = await startedGame();
    expect(await expectUnchanged(gameId, ids, () => app.play.reopen(gameId, { confirmed: true }))).toMatchObject({
      status: 'rejected',
      reason: { code: 'notCompleted' },
    });
    await countAll(gameId, ids, READY_COUNTS);
    expectStatus(await app.play.calculatePayments(gameId, { confirmed: true }), 'accepted');
    const result = await expectUnchanged(gameId, ids, () => app.play.reopen(gameId));
    expect(result).toEqual({ status: 'needsConfirmation', confirmation: { kind: 'reopen', mode: 'cash' } });
    expect(await app.play.reopen('nope', { confirmed: true })).toMatchObject({ reason: { code: 'gameNotFound' } });
  });

  it('keeps every record, withdraws the settlement and marks the game reopened', async () => {
    const { gameId, ids } = await completedGame();
    const before = { players: ids.map((id) => app.play.getCashPlayer(gameId, id)!), payments: app.play.getPayments(gameId)! };

    const result = expectStatus(await app.play.reopen(gameId, { confirmed: true }), 'accepted');
    expect(result.location).toEqual({ kind: 'results', gameId });
    app = await harness.restart(app);

    expect(app.location.get()).toEqual({ kind: 'results', gameId });
    expect(app.games.get(gameId)).toMatchObject({ phase: 'inProgress', finishedAt: null, reopened: true });
    expect(app.games.list().map((g) => g.id)).toContain(gameId);
    expect(app.games.history()).toEqual([]);
    expect(app.play.getPayments(gameId)).toBeNull();
    const results = app.play.getResults(gameId)!;
    expect(results).toMatchObject({ phase: 'inProgress', reopened: true, status: { kind: 'addsUp' } });
    expect(results.calculatePayments.available).toBe(true);
    // Results and buy-ins stay; amounts are exact again (here they happen to be whole cents).
    for (const [i, id] of ids.entries()) {
      const player = app.play.getCashPlayer(gameId, id)!;
      expect(player.buyIns).toEqual(before.players[i].buyIns);
      expect(player.result!.finalChips).toEqual(before.players[i].result!.finalChips);
      expect(player.phase).toBe('inProgress');
    }
    // Opening it from Games leads to Results.
    expect(expectStatus(await app.games.open(gameId), 'accepted').location).toEqual({ kind: 'results', gameId });

    // Calculating again without changes gives identical Payments; the reopened mark goes.
    expectStatus(await app.play.calculatePayments(gameId, { confirmed: true }), 'accepted');
    const again = app.play.getPayments(gameId)!;
    expect({ ...again, finishedAt: '' }).toEqual({ ...before.payments, finishedAt: '' });
    expect(again.finishedAt > before.payments.finishedAt).toBe(true);
    expect(app.games.get(gameId)!.reopened).toBe(false);
  });

  it('makes play operations available again', async () => {
    const { gameId, ids } = await completedGame();
    expectStatus(await app.play.reopen(gameId, { confirmed: true }), 'accepted');
    expectStatus(await app.play.calculatePayments(gameId), 'needsConfirmation');
    // No longer `gameCompleted`: the ordinary rules apply (corrections of a result come later).
    expect(app.play.reviewCount(gameId, ids[0])).toMatchObject({ status: 'rejected', reason: { code: 'resultExists' } });
  });
});

describe('History and Games', () => {
  it('lists Completed games newest finished first with their captured facts', async () => {
    const first = await completedGame();
    // A second game, finished later, with the same saved players.
    const second = await startedGame(['Alice', 'Bob']);
    await countAll(second.gameId, second.ids, [
      [30, 4, 6, 1],
      [0, 0, 0, 1],
    ]);
    expectStatus(await app.play.calculatePayments(second.gameId, { confirmed: true }), 'accepted');
    // A third one stays In progress.
    const open = await startedGame(['Cleo', 'Dan']);

    // Renaming or deleting saved players never rewrites history.
    const alice = app.savedPlayers.list().find((p) => p.name === 'Alice')!;
    expectStatus(await app.savedPlayers.rename(alice.id, 'Alicia'), 'accepted');
    const bob = app.savedPlayers.list().find((p) => p.name === 'Bob')!;
    expectStatus(await app.savedPlayers.delete(bob.id), 'accepted');
    app = await harness.restart(app);

    const history = app.games.history();
    expect(history.map((g) => g.gameId)).toEqual([second.gameId, first.gameId]);
    expect(history[1]).toEqual({
      gameId: first.gameId,
      mode: 'cash',
      participantNames: SIX,
      createdAt: app.games.get(first.gameId)!.createdAt,
      finishedAt: app.games.get(first.gameId)!.finishedAt,
      facts: [{ label: 'Buy-ins', value: 'EUR 120.00' }, { value: '3 payments' }, { label: 'Top', value: 'Alice +EUR 13.00' }],
    });
    expect(history[0].facts).toEqual([
      { label: 'Buy-ins', value: 'EUR 40.00' },
      { value: '1 payment' },
      { label: 'Top', value: 'Alice +EUR 10.00' },
    ]);
    expect(history[0].finishedAt > history[1].finishedAt).toBe(true);
    expect(app.games.list().map((g) => g.id)).toEqual([open.gameId]);
    expect(paymentLines(app.play.getPayments(second.gameId))).toEqual(['Bob → Alice EUR 10.00']);

    // Opening a Completed game leads to its Payments, from History.
    const opened = expectStatus(await app.games.open(first.gameId), 'accepted');
    expect(opened.location).toEqual({ kind: 'payments', gameId: first.gameId, from: 'history' });
    expect(app.location.get()).toEqual(opened.location);
  });

  it('deletes only the Completed game and returns to History', async () => {
    const done = await completedGame();
    const other = await startedGame(['Cleo', 'Dan']);
    expectStatus(await app.games.open(done.gameId), 'accepted');
    const saved = app.savedPlayers.list();
    const otherBefore = observeAll(other.gameId, other.ids);

    expectStatus(await app.games.delete(done.gameId), 'accepted');
    app = await harness.restart(app);

    expect(app.games.get(done.gameId)).toBeNull();
    expect(app.games.history()).toEqual([]);
    expect(app.location.get()).toEqual({ kind: 'history' });
    expect(app.savedPlayers.list()).toEqual(saved);
    expect({ ...observeAll(other.gameId, other.ids), location: null, history: null }).toEqual({
      ...otherBefore,
      location: null,
      history: null,
    });
  });
});

describe('Delete game', () => {
  it('removes a Planning or In progress game only, keeping saved players, templates and other games', async () => {
    const templateId = expectStatus(
      await app.templates.create({ name: 'Home', rows: [{ id: 'row-1', valueText: '1', quantityText: '100', color: null }] }),
      'accepted',
    ).templateId;
    const done = await completedGame();
    const running = await startedGame(['Cleo', 'Dan']);
    const planning = await plannedGame(app, 'tournament', chips(['Emma', 'Felix']));
    const saved = app.savedPlayers.list();
    const templates = app.templates.list();
    const doneBefore = observeAll(done.gameId, done.ids);
    const history = app.games.history();

    expectStatus(await app.games.open(planning), 'accepted');
    expectStatus(await app.games.delete(planning), 'accepted');
    app = await harness.restart(app);
    expect(app.games.get(planning)).toBeNull();
    expect(app.location.get()).toEqual({ kind: 'games' });
    expect(app.games.list().map((g) => g.id)).toEqual([running.gameId]);

    expectStatus(await app.games.open(running.gameId), 'accepted');
    expectStatus(await app.games.delete(running.gameId), 'accepted');
    app = await harness.restart(app);
    expect(app.games.get(running.gameId)).toBeNull();
    expect(app.play.getView(running.gameId)).toBeNull();
    expect(app.location.get()).toEqual({ kind: 'games' });
    expect(app.games.list()).toEqual([]);

    // Nothing else changed: reusable records and the Completed game with its history entry.
    expect(app.savedPlayers.list()).toEqual(saved);
    expect(app.templates.list()).toEqual(templates);
    expect(app.templates.get(templateId)).not.toBeNull();
    expect(app.games.history()).toEqual(history);
    expect({ ...observeAll(done.gameId, done.ids), location: null, list: null }).toEqual({
      ...doneBefore,
      location: null,
      list: null,
    });
    expect(await app.games.delete(running.gameId)).toMatchObject({ status: 'rejected', reason: { code: 'gameNotFound' } });
  });
});

describe('working location', () => {
  it('restores Payments and the other tabs of a Completed game, and falls back when the phase changed', async () => {
    const { gameId } = await completedGame();
    for (const kind of ['payments', 'results', 'details'] as const) {
      expectStatus(await app.location.set({ kind, gameId, from: 'history' }), 'accepted');
      app = await harness.restart(app);
      expect(app.location.get()).toEqual({ kind, gameId, from: 'history' });
    }
    expect(await app.location.set({ kind: 'play', gameId })).toMatchObject({ reason: { code: 'wrongPhase' } });

    // Reopened: Payments are gone and the game left History (its tabs lead back to Games).
    expectStatus(await app.play.reopen(gameId, { confirmed: true }), 'accepted');
    expect(await app.location.set({ kind: 'payments', gameId })).toMatchObject({ reason: { code: 'wrongPhase' } });
    expectStatus(await app.location.set({ kind: 'details', gameId, from: 'history' }), 'accepted');
    app = await harness.restart(app);
    expect(app.location.get()).toEqual({ kind: 'details', gameId });
  });

  it('leads back to History once the Completed game it was in is deleted', async () => {
    const { gameId } = await completedGame();
    const other = await completedGame();
    expectStatus(await app.location.set({ kind: 'results', gameId, from: 'history' }), 'accepted');
    // Deleting another game leaves the location alone.
    expectStatus(await app.games.delete(other.gameId), 'accepted');
    expect(app.location.get()).toEqual({ kind: 'results', gameId, from: 'history' });
    expectStatus(await app.games.delete(gameId), 'accepted');
    app = await harness.restart(app);
    expect(app.location.get()).toEqual({ kind: 'history' });
  });
});
