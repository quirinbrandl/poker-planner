import type { GameManagement } from '@/game-management';

import { createTestHarness, expectStatus, observe, plannedGame, type PlanSetup, type TestHarness } from '../support/game-management';

let harness: TestHarness;
let app: GameManagement;

beforeEach(async () => {
  harness = await createTestHarness();
  app = await harness.open();
});
afterEach(() => harness.cleanup());

const NAMES = ['Alice', 'Bob', 'Cleo', 'Dan', 'Emma', 'Felix'];
const standard = (overrides: Partial<PlanSetup> = {}): PlanSetup => ({
  players: NAMES,
  chips: [
    ['1', '200'],
    ['5', '150'],
    ['25', '100'],
    ['100', '50'],
  ],
  ...overrides,
});

async function startedGame(mode: 'cash' | 'tournament' = 'cash', setup = standard()) {
  const gameId = await plannedGame(app, mode, setup);
  const preview = app.planning.getDistributionPreview(gameId)!.distribution;
  if (preview.kind !== 'planned') throw new Error('Expected a plan');
  expectStatus(
    await app.planning.start(gameId, { depthBb: preview.plan.depth.bb, reserveStacks: preview.plan.reserve.stacks }),
    'accepted',
  );
  return gameId;
}

describe('Return to Planning', () => {
  it('asks for confirmation first, saying what it clears and keeps; that changes nothing', async () => {
    const gameId = await startedGame();
    const before = observe(app, gameId);
    const result = expectStatus(await app.play.returnToPlanning(gameId), 'needsConfirmation');
    expect(result.confirmation).toEqual({
      kind: 'returnToPlanning',
      clears: { rebuys: 0, results: 0, handedOutStacks: 6, text: 'all handed-out stacks' },
      keeps: { players: 6, payoutSchedule: false, text: '6 players · buy-ins · settings' },
      note: 'Collect all chips. You’ll hand out new stacks after Start.',
    });
    expect(observe(app, gameId)).toEqual(before);
    app = await harness.restart(app);
    expect(observe(app, gameId)).toEqual(before);
  });

  it('clears the issued stacks and reopens a fresh Distribution preview, keeping roster and settings', async () => {
    const gameId = await startedGame('cash', standard({ buyIn: '25', preference: 'more', coverage: '3', depth: '80' }));
    const result = expectStatus(await app.play.returnToPlanning(gameId, { confirmed: true }), 'accepted');
    expect(result.location).toEqual({ kind: 'planning', gameId, step: 'preview' });

    for (let round = 0; round < 2; round++) {
      expect(app.play.getView(gameId)).toBeNull();
      expect(app.games.get(gameId)).toMatchObject({ phase: 'planning', startedAt: null, lastStep: 'preview' });
      expect(app.location.get()).toEqual({ kind: 'planning', gameId, step: 'preview' });
      const plan = app.planning.getView(gameId)!;
      expect(plan.currentStep).toBe('preview');
      expect(plan.returnToPreview).toBe(false);
      expect(plan.players.participants.map((p) => p.name)).toEqual(NAMES);
      expect(plan.settings).toMatchObject({
        buyIn: { text: '25' },
        depth: { text: '80' },
        coverage: { text: '3' },
        preference: 'more',
        reserve: { mode: 'automatic', text: '3' },
      });
      const preview = app.planning.getDistributionPreview(gameId)!;
      expect(preview.canStart).toBe(true);
      app = await harness.restart(app);
    }

    // Starting again hands out one new stack per player, not on top of the old ones.
    const preview = app.planning.getDistributionPreview(gameId)!.distribution;
    if (preview.kind !== 'planned') throw new Error('Expected a plan');
    expectStatus(
      await app.planning.start(gameId, { depthBb: preview.plan.depth.bb, reserveStacks: preview.plan.reserve.stacks }),
      'accepted',
    );
    const play = app.play.getView(gameId)!;
    expect(play.totals.stacks).toBe(6);
    expect(play.bank.chips).toBe(preview.plan.bank.chips);
  });

  it('keeps a custom reserve as typed', async () => {
    const gameId = await startedGame('cash', standard({ reserve: '1' }));
    expect(app.play.getView(gameId)!.details.reserve).toMatchObject({ mode: 'custom', configured: 1, atStart: 1 });
    expectStatus(await app.play.returnToPlanning(gameId, { confirmed: true }), 'accepted');
    expect(app.planning.getView(gameId)!.settings.reserve).toMatchObject({ mode: 'custom', text: '1' });
    expect(app.planning.getDistributionPreview(gameId)!.distribution).toMatchObject({ plan: { reserve: { target: 1 } } });
  });

  it('keeps a tournament’s payout schedule, editable again', async () => {
    const gameId = await startedGame('tournament');
    const confirmation = expectStatus(await app.play.returnToPlanning(gameId), 'needsConfirmation').confirmation;
    expect(confirmation.keeps).toEqual({
      players: 6,
      payoutSchedule: true,
      text: '6 players · buy-ins · settings · payout schedule',
    });
    expectStatus(await app.play.returnToPlanning(gameId, { confirmed: true }), 'accepted');
    const schedule = app.planning.getView(gameId)!.payoutSchedule;
    expect(schedule.preset.name).toBe('Top 2');
    expect(schedule.places.map((p) => p.share.text)).toEqual(['70', '30']);
    expectStatus(await app.planning.choosePayoutPreset(gameId, 'top3'), 'accepted');
  });

  it('is rejected for a game in Planning or a missing game', async () => {
    const gameId = await plannedGame(app, 'cash', standard());
    const before = observe(app, gameId);
    expect(await app.play.returnToPlanning(gameId, { confirmed: true })).toMatchObject({
      status: 'rejected',
      reason: { code: 'notInProgress' },
    });
    expect(observe(app, gameId)).toEqual(before);
    expect(await app.play.returnToPlanning('nope')).toMatchObject({ status: 'rejected', reason: { code: 'gameNotFound' } });
  });
});

describe('two small reads', () => {
  it('checks a saved-player name live with the same problem create and rename reject with', async () => {
    const { savedPlayerId } = expectStatus(await app.savedPlayers.create('Alice'), 'accepted');
    expect(app.savedPlayers.checkName('  ')).toMatchObject({ code: 'nameRequired', field: 'name' });
    const duplicate = app.savedPlayers.checkName('  aLiCe ');
    expect(duplicate).toMatchObject({ code: 'duplicateName', field: 'name' });
    expect(await app.savedPlayers.create('  aLiCe ')).toMatchObject({ reason: { problems: [duplicate] } });
    expect(app.savedPlayers.checkName('alice', { exceptId: savedPlayerId })).toBeNull();
    expect(app.savedPlayers.checkName('Bob')).toBeNull();
  });

  it('preselects the suggested payout preset when a tournament opens straight onto Payout schedule', async () => {
    const gameId = await plannedGame(app, 'cash', standard({ players: ['Alice', 'Bob'] }));
    const bob = app.planning.getView(gameId)!.players.participants[1];
    expectStatus(await app.planning.removeParticipant(gameId, bob.id), 'accepted');
    expectStatus(await app.planning.changeMode(gameId, 'tournament'), 'accepted');
    expectStatus(await app.planning.goToStep(gameId, 'payouts', { fromPreview: true }), 'accepted');
    expect(app.planning.getView(gameId)!.payoutSchedule.places).toEqual([]);
    expectStatus(await app.planning.addSavedPlayers(gameId, [bob.savedPlayerId!]), 'accepted');
    expect(app.planning.getView(gameId)!.payoutSchedule.places).toEqual([]);

    expectStatus(await app.location.set({ kind: 'games' }), 'accepted');
    const opened = expectStatus(await app.games.open(gameId), 'accepted');
    expect(opened.location).toEqual({ kind: 'planning', gameId, step: 'payouts' });
    app = await harness.restart(app);
    const schedule = app.planning.getView(gameId)!.payoutSchedule;
    expect(schedule.preset).toMatchObject({ id: 'winnerTakesAll' });
    expect(schedule.places.map((p) => p.share.text)).toEqual(['100']);
  });
});
