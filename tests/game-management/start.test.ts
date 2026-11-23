import type { GameManagement, PlayView } from '@/game-management';

import {
  createTestHarness,
  expectStatus,
  gameWithPlayers,
  observe,
  plannedGame,
  type PlanSetup,
  type TestHarness,
} from '../support/game-management';

let harness: TestHarness;
let app: GameManagement;

beforeEach(async () => {
  harness = await createTestHarness();
  app = await harness.open();
});
afterEach(() => harness.cleanup());

const NAMES = ['Alice', 'Bob', 'Cleo', 'Dan', 'Emma', 'Felix', 'Gina'];
const STANDARD: [string, string][] = [
  ['1', '200'],
  ['5', '150'],
  ['25', '100'],
  ['100', '50'],
];
const standard = (overrides: Partial<PlanSetup> = {}): PlanSetup => ({ players: NAMES.slice(0, 6), chips: STANDARD, ...overrides });
const ACCEPT = { depthBb: 100, reserveStacks: 3 };

const play = (gameId: string): PlayView => app.play.getView(gameId)!;
const counts = (mix: readonly { count: number }[]) => mix.map((c) => c.count);

async function startedGame(mode: 'cash' | 'tournament' = 'cash', setup = standard(), accept = ACCEPT) {
  const gameId = await plannedGame(app, mode, setup);
  expectStatus(await app.planning.start(gameId, accept), 'accepted');
  return gameId;
}

/** Fails unless nothing observable changed, now and after a restart. */
async function expectUnchanged(gameId: string, run: () => Promise<{ status: string }>, status = 'rejected') {
  const before = observe(app, gameId);
  const result = await run();
  expect(result.status).toBe(status);
  expect(observe(app, gameId)).toEqual(before);
  app = await harness.restart(app);
  expect(observe(app, gameId)).toEqual(before);
  return result;
}

describe('Start', () => {
  it('records the accepted terms, contributions and the stack handed to every player', async () => {
    const gameId = await plannedGame(app, 'cash', standard());
    const result = expectStatus(await app.planning.start(gameId, ACCEPT), 'accepted');
    expect(result.location).toEqual({ kind: 'play', gameId });
    expect(app.location.get()).toEqual({ kind: 'play', gameId });
    expect(app.planning.getView(gameId)).toBeNull();
    expect(app.planning.getDistributionPreview(gameId)).toBeNull();

    const view = play(gameId);
    expect(view).toMatchObject({ gameId, mode: 'cash', phase: 'inProgress' });
    expect(view.terms).toEqual({
      blinds: { small: 1, big: 2, text: '1 / 2', rounded: false },
      depth: { bb: 100, requestedBb: 100, adjusted: false, text: '100 BB' },
      stack: { value: 200, text: '200 chip units' },
      buyIn: { cents: 2000, text: 'EUR 20.00' },
      rebuyPrice: { cents: 2000, text: 'EUR 20.00' },
      money: { kind: 'cash', rate: { numerator: 10, denominator: 1 }, rateText: 'EUR 0.10 / unit' },
      coverage: { payments: 4, text: '4 payments of each blind' },
      preference: 'fewer',
      preferenceText: 'Fewer chips',
    });
    expect(view.players.map((p) => [p.name, p.joinOrder, p.entry, p.contribution.text])).toEqual(
      NAMES.slice(0, 6).map((name, i) => [name, i + 1, 'initial', 'EUR 20.00']),
    );
    for (const player of view.players) {
      expect(counts(player.handedOut.mix)).toEqual([15, 2, 3, 1]);
      expect(player.handedOut).toMatchObject({ chips: 21, value: 200 });
    }
    expect(view.totals).toMatchObject({
      contributions: { cents: 12000, text: 'EUR 120.00', label: 'EUR 120.00 total contributions' },
      buyIns: 6,
      rebuys: 0,
      stacks: 6,
      prizePool: null,
    });
    expect(view.totals.inPlay).toMatchObject({ chips: 126, value: 1200 });
  });

  it('leaves the bank as the chip set minus the issued stacks and measures the reserve', async () => {
    const gameId = await startedGame();
    const { bank, reserve } = play(gameId);
    expect(counts(bank.mix)).toEqual([200 - 90, 150 - 12, 100 - 18, 50 - 6]);
    expect(bank).toMatchObject({ chips: 374, label: '374 available chips', valueText: '7,250 chip units' });
    expect(reserve).toEqual({
      configured: 3,
      startedTarget: 3,
      consumed: 0,
      unconsumed: 3,
      achievable: 3,
      achievableText: '3 of 3',
      weakened: false,
      summaryText: '3 reserve stacks available',
    });
  });

  it('locks an adjusted depth and a reduced reserve exactly as previewed', async () => {
    const setup: PlanSetup = {
      players: NAMES.slice(0, 6),
      chips: [
        ['1', '72'],
        ['5', '60'],
        ['25', '40'],
      ],
      buyIn: '19.50',
    };
    const gameId = await startedGame('cash', setup, { depthBb: 39, reserveStacks: 1 });
    const view = play(gameId);
    expect(view.terms.depth).toEqual({ bb: 39, requestedBb: 100, adjusted: true, text: '39 BB' });
    expect(view.terms.blinds).toMatchObject({ small: 2, big: 5, rounded: true });
    // EUR 19.50 over 195 units: exactly 10 cents per unit.
    expect(view.terms.money).toEqual({ kind: 'cash', rate: { numerator: 10, denominator: 1 }, rateText: 'EUR 0.10 / unit' });
    expect(view.details.depth).toEqual({ requestedBb: 100, acceptedBb: 39, adjusted: true, text: '39 BB (requested 100 BB)' });
    expect(view.details.reserve).toEqual({ mode: 'automatic', configured: 3, atStart: 1, reduced: true, text: '1 of 3 stacks' });
    expect(view.reserve).toMatchObject({ configured: 3, startedTarget: 1, unconsumed: 1, achievable: 1 });
  });

  it('keeps an exact fractional cash rate', async () => {
    const gameId = await startedGame('cash', standard({ buyIn: '20.40' }));
    expect(play(gameId).terms.money).toEqual({ kind: 'cash', rate: { numerator: 51, denominator: 5 }, rateText: 'EUR 0.102 / unit' });
  });

  it('is the same after restart', async () => {
    const gameId = await startedGame();
    const before = play(gameId);
    app = await harness.restart(app);
    expect(play(gameId)).toEqual(before);
    expect(app.location.get()).toEqual({ kind: 'play', gameId });
  });

  it('cannot issue twice', async () => {
    const gameId = await plannedGame(app, 'cash', standard());
    const [first, second] = await Promise.all([app.planning.start(gameId, ACCEPT), app.planning.start(gameId, ACCEPT)]);
    expect(first.status).toBe('accepted');
    expect(second).toMatchObject({ status: 'rejected', reason: { code: 'setupLocked' } });
    await expectUnchanged(gameId, () => app.planning.start(gameId, ACCEPT));
    expect(play(gameId).totals.stacks).toBe(6);
    expect(counts(play(gameId).bank.mix)).toEqual([110, 138, 82, 44]);
  });

  describe('is rejected without changing anything', () => {
    it('while setup is incomplete', async () => {
      const gameId = await plannedGame(app, 'cash', standard());
      await app.planning.setSettingText(gameId, 'coverage', '');
      const result = await expectUnchanged(gameId, () => app.planning.start(gameId, ACCEPT));
      expect(result).toMatchObject({ reason: { code: 'setupIncomplete', message: 'Fix setup inputs before starting.' } });
    });

    it('when no distribution exists', async () => {
      const gameId = await plannedGame(app, 'cash', standard({ chips: [['1', '10'], ['5', '10']] }));
      const result = await expectUnchanged(gameId, () => app.planning.start(gameId, ACCEPT));
      expect(result).toMatchObject({ reason: { code: 'noValidDistribution' } });
    });

    it('when the preview changed since the host confirmed it', async () => {
      const gameId = await plannedGame(app, 'cash', standard());
      for (const accept of [
        { depthBb: 98, reserveStacks: 3 },
        { depthBb: 100, reserveStacks: 2 },
      ]) {
        const result = await expectUnchanged(gameId, () => app.planning.start(gameId, accept));
        expect(result).toMatchObject({
          reason: { code: 'previewChanged', message: 'The preview changed. Check it and start again.' },
        });
      }
    });

    it('for a missing game', async () => {
      expect(await app.planning.start('nope', ACCEPT)).toMatchObject({ status: 'rejected', reason: { code: 'gameNotFound' } });
    });
  });
});

describe('locked setup', () => {
  it('rejects every Planning operation with the route to Return to Planning, even with no play records', async () => {
    const gameId = await startedGame();
    const rowId = 'row-that-does-not-matter';
    const locked = [
      () => app.planning.setSettingText(gameId, 'buyIn', '30'),
      () => app.planning.useAutomaticReserve(gameId),
      () => app.planning.setDistributionPreference(gameId, 'more'),
      () => app.planning.addChipRow(gameId),
      () => app.planning.setChipValueText(gameId, rowId, '2'),
      () => app.planning.removeParticipant(gameId, 'id-1'),
      () => app.planning.createSavedPlayerAndAdd(gameId, 'Nora'),
      () => app.planning.changeMode(gameId, 'tournament'),
      () => app.planning.goToStep(gameId, 'settings'),
      () => app.planning.continueFromStep(gameId, 'settings'),
      () => app.planning.goBack(gameId),
      () => app.planning.start(gameId, ACCEPT),
    ];
    for (const operation of locked) {
      const result = await expectUnchanged(gameId, operation);
      expect(result).toMatchObject({
        reason: { code: 'setupLocked', message: 'Setup is locked. To change it, use ⋯ → Return to Planning.' },
      });
    }
    expect(app.savedPlayers.list().map((p) => p.name)).not.toContain('Nora');
  });

  it('shows read-only Game details ending with the locked note', async () => {
    const gameId = await startedGame();
    const details = play(gameId).details;
    expect(details).toMatchObject({
      playersText: '6 players',
      chipSet: { summaryText: '4 denominations · 500 chips · 8,450 chip units' },
      startingStack: { value: 200, chips: 21, text: '200 chip units' },
      depth: { requestedBb: 100, acceptedBb: 100, adjusted: false, text: '100 BB' },
      blindsText: '1 / 2 chip units · 100 BB',
      buyInText: 'EUR 20.00 · rebuys the same',
      rateText: 'EUR 0.10 / unit',
      coverageText: '4 payments of each blind',
      preferenceText: 'Fewer chips',
      reserve: { mode: 'automatic', configured: 3, atStart: 3, reduced: false, text: '3 stacks' },
      payouts: null,
      lockedNote: 'Setup is locked. To change it, use ⋯ → Return to Planning.',
    });
    expect(details.chipSet.denominations.map((d) => [d.value, d.quantity])).toEqual(STANDARD.map(([v, q]) => [Number(v), Number(q)]));
    expect(details.players.map((p) => p.name)).toEqual(NAMES.slice(0, 6));
  });
});

describe('tournament Start', () => {
  it('locks the payout schedule and shows it with current amounts', async () => {
    const gameId = await startedGame('tournament');
    const view = play(gameId);
    expect(view.terms.money).toEqual({ kind: 'tournament', text: 'No chip money value' });
    expect(view.details.rateText).toBeNull();
    expect(view.totals.prizePool).toEqual({ cents: 12000, text: 'EUR 120.00' });
    expect(view.details.payouts).toEqual({
      name: 'Top 2',
      places: [
        { place: 1, placeLabel: '1st', shareText: '70%', amount: 8400, amountText: 'EUR 84.00' },
        { place: 2, placeLabel: '2nd', shareText: '30%', amount: 3600, amountText: 'EUR 36.00' },
      ],
      prizePool: { cents: 12000, text: 'EUR 120.00' },
      prizePoolLine: 'Prize pool EUR 120.00 · 6 buy-ins',
    });
    const result = await expectUnchanged(gameId, () => app.planning.choosePayoutPreset(gameId, 'top3'));
    expect(result).toMatchObject({ reason: { code: 'setupLocked' } });
  });

  it('keeps a custom schedule as typed', async () => {
    const gameId = await plannedGame(app, 'tournament', standard());
    const places = app.planning.getView(gameId)!.payoutSchedule.places;
    await app.planning.setPayoutShareText(gameId, places[0].id, '66.67');
    await app.planning.setPayoutShareText(gameId, places[1].id, '33.33');
    expectStatus(await app.planning.start(gameId, ACCEPT), 'accepted');
    const payouts = play(gameId).details.payouts!;
    expect(payouts.name).toBe('Custom');
    expect(payouts.places.map((p) => [p.shareText, p.amountText])).toEqual([
      ['66.67%', 'EUR 80.01'],
      ['33.33%', 'EUR 39.99'],
    ]);
  });
});

describe('Games list and working location', () => {
  it('lists an In progress game first with its start date, and opening it leads to Play', async () => {
    const planning = await plannedGame(app, 'cash', standard());
    const started = await startedGame();
    const list = app.games.list();
    expect(list.map((c) => [c.id, c.phase])).toEqual([
      [started, 'inProgress'],
      [planning, 'planning'],
    ]);
    expect(list[0]).toMatchObject({ participantNames: NAMES.slice(0, 6), lastStep: null, lastStepTitle: null });
    expect(list[0].startedAt).toEqual(expect.any(String));
    expect(list[1].startedAt).toBeNull();

    expectStatus(await app.location.set({ kind: 'games' }), 'accepted');
    expect(expectStatus(await app.games.open(started), 'accepted').location).toEqual({ kind: 'play', gameId: started });
    expect(app.location.get()).toEqual({ kind: 'play', gameId: started });
  });

  it('records and restores the Play, Results and Game details tabs', async () => {
    const gameId = await startedGame();
    for (const kind of ['details', 'results', 'play'] as const) {
      expectStatus(await app.location.set({ kind, gameId }), 'accepted');
      app = await harness.restart(app);
      expect(app.location.get()).toEqual({ kind, gameId });
    }
  });

  it('rejects a workspace the game does not have in its phase', async () => {
    const planning = await plannedGame(app, 'cash', standard());
    const started = await startedGame();
    expect(await app.location.set({ kind: 'play', gameId: planning })).toMatchObject({ reason: { code: 'wrongPhase' } });
    expect(await app.location.set({ kind: 'planning', gameId: started, step: 'preview' })).toMatchObject({
      reason: { code: 'wrongPhase' },
    });
    expect(await app.location.set({ kind: 'details', gameId: 'nope' })).toMatchObject({ reason: { code: 'gameNotFound' } });
  });

  it('falls back to Games when the started game is deleted', async () => {
    const gameId = await startedGame();
    expectStatus(await app.location.set({ kind: 'details', gameId }), 'accepted');
    expectStatus(await app.games.delete(gameId), 'accepted');
    app = await harness.restart(app);
    expect(app.location.get()).toEqual({ kind: 'games' });
    expect(app.play.getView(gameId)).toBeNull();
  });

  it('has no Play view for a game in Planning', async () => {
    const gameId = await gameWithPlayers(app, 'cash', ['Alice', 'Bob']);
    expect(app.play.getView(gameId)).toBeNull();
    expect(app.play.getView('nope')).toBeNull();
  });
});
