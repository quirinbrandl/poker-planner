import type { DistributionPlanView, GameManagement, PreviewStepView } from '@/game-management';

import { createTestHarness, expectStatus, observe, plannedGame, type PlanSetup, type TestHarness } from '../support/game-management';

let harness: TestHarness;
let app: GameManagement;

beforeEach(async () => {
  harness = await createTestHarness();
  app = await harness.open();
});
afterEach(() => harness.cleanup());

const NAMES = ['Alice', 'Bob', 'Cleo', 'Dan', 'Emma', 'Felix', 'Gina', 'Hugo', 'Iris', 'Jan', 'Kim', 'Lea'];
const STANDARD: [string, string][] = [
  ['1', '200'],
  ['5', '150'],
  ['25', '100'],
  ['100', '50'],
];
const standard = (overrides: Partial<PlanSetup> = {}): PlanSetup => ({ players: NAMES.slice(0, 6), chips: STANDARD, ...overrides });

const preview = (gameId: string): PreviewStepView => app.planning.getDistributionPreview(gameId)!;
function planned(gameId: string): DistributionPlanView {
  const distribution = preview(gameId).distribution;
  if (distribution.kind !== 'planned') throw new Error(`Expected a plan, got ${JSON.stringify(distribution)}`);
  return distribution.plan;
}
const counts = (mix: readonly { count: number }[]) => mix.map((c) => c.count);

describe('a feasible plan', () => {
  it('recommends one identical starting stack at the requested depth with the full automatic reserve', async () => {
    const gameId = await plannedGame(app, 'cash', standard());
    await app.planning.setChipColor(gameId, app.planning.getView(gameId)!.chipSet.rows[0].id, 'grey');
    const p = preview(gameId);
    expect(p.setupComplete).toBe(true);
    expect(p.blockers).toEqual([]);
    expect(p.canStart).toBe(true);
    const plan = planned(gameId);
    expect(plan.players).toBe(6);
    expect(plan.stack).toEqual({
      value: 200,
      chips: 21,
      mix: [
        { value: 1, color: 'grey', count: 15 },
        { value: 5, color: null, count: 2 },
        { value: 25, color: null, count: 3 },
        { value: 100, color: null, count: 1 },
      ],
    });
    expect(plan.depth).toEqual({ bb: 100, requestedBb: 100, adjusted: false });
    expect(plan.blinds).toEqual({ small: 1, big: 2, text: '1 / 2', rounded: false });
    expect(plan.money).toEqual({ kind: 'cash', buyIn: 2000, buyInText: 'EUR 20.00', rateText: 'EUR 0.10 / unit' });
    expect(plan.reserve).toEqual({ stacks: 3, target: 3, reduced: false });
    expect(plan.bank.chips).toBe(374);
    expect(counts(plan.bank.mix)).toEqual([110, 138, 82, 44]);
  });

  it('orders the mix by value whatever the row order, and keeps an exact sub-cent rate', async () => {
    const gameId = await plannedGame(app, 'cash', standard({ chips: [...STANDARD].reverse(), buyIn: '20.40' }));
    const plan = planned(gameId);
    expect(plan.stack.mix.map((c) => c.value)).toEqual([1, 5, 25, 100]);
    expect(plan.money).toMatchObject({ kind: 'cash', rateText: 'EUR 0.102 / unit' });
  });

  it('shows the prize pool in a tournament, never a chip money value', async () => {
    const gameId = await plannedGame(app, 'tournament', standard());
    expect(planned(gameId).money).toEqual({
      kind: 'tournament',
      buyIn: 2000,
      buyInText: 'EUR 20.00',
      prizePool: 12000,
      prizePoolText: 'EUR 120.00',
    });
  });

  it('follows the More chips preference and marks a rounded small blind', async () => {
    const gameId = await plannedGame(app, 'cash', standard({ preference: 'more' }));
    const plan = planned(gameId);
    expect(plan.blinds).toEqual({ small: 2, big: 5, text: '2 / 5', rounded: true });
    expect(plan.stack.value).toBe(500);
    expect(counts(plan.stack.mix)).toEqual([25, 20, 15, 0]);
    expect(plan.money).toMatchObject({ rateText: 'EUR 0.04 / unit' });
  });

  it('shows the nearest feasible depth without changing the requested depth', async () => {
    const gameId = await plannedGame(app, 'cash', {
      players: NAMES.slice(0, 4),
      chips: [
        ['1', '60'],
        ['2', '60'],
        ['5', '60'],
      ],
      reserve: '0',
    });
    const plan = planned(gameId);
    expect(plan.depth).toEqual({ bb: 60, requestedBb: 100, adjusted: true });
    expect(plan.stack.value).toBe(120);
    expect(preview(gameId).canStart).toBe(true);
    expect(app.planning.getView(gameId)!.settings.depth.text).toBe('100');
  });

  it('falls back to the highest achievable reserve and keeps the configured target', async () => {
    const gameId = await plannedGame(app, 'cash', {
      players: NAMES.slice(0, 6),
      chips: [
        ['1', '72'],
        ['5', '60'],
        ['25', '40'],
      ],
    });
    const plan = planned(gameId);
    expect(plan.reserve).toEqual({ stacks: 1, target: 3, reduced: true });
    expect(plan.depth).toEqual({ bb: 39, requestedBb: 100, adjusted: true });
    expect(preview(gameId).canStart).toBe(true);
    const settings = app.planning.getView(gameId)!.settings;
    expect(settings.reserve).toMatchObject({ mode: 'automatic', text: '3' });
  });
});

describe('roster and setup edits', () => {
  it('lets the automatic reserve follow the roster and keeps a custom one', async () => {
    const auto = await plannedGame(app, 'cash', standard());
    const custom = await plannedGame(app, 'cash', standard({ reserve: '3' }));
    expectStatus(await app.planning.createSavedPlayerAndAdd(auto, NAMES[6]), 'accepted');
    const gina = app.savedPlayers.list().find((p) => p.name === NAMES[6])!;
    expectStatus(await app.planning.addSavedPlayers(custom, [gina.id]), 'accepted');
    expect(planned(auto).reserve).toEqual({ stacks: 4, target: 4, reduced: false });
    expect(planned(custom).reserve).toEqual({ stacks: 3, target: 3, reduced: false });
    expect(planned(auto).players).toBe(7);
  });

  it('recomputes against the requested depth after edits and issues nothing', async () => {
    const gameId = await plannedGame(app, 'cash', standard());
    for (const name of NAMES.slice(6, 12)) await app.planning.createSavedPlayerAndAdd(gameId, name);
    expect(planned(gameId).depth).toEqual({ bb: 93, requestedBb: 100, adjusted: true });
    const view = app.planning.getView(gameId)!;
    for (const p of view.players.participants.slice(6)) await app.planning.removeParticipant(gameId, p.id);
    expect(planned(gameId).depth).toEqual({ bb: 100, requestedBb: 100, adjusted: false });
    expect(app.planning.getView(gameId)!.settings.depth.text).toBe('100');
    expect(app.play.getView(gameId)).toBeNull();
    expect(app.games.get(gameId)!.phase).toBe('planning');
  });

  it('is the same after restart', async () => {
    const gameId = await plannedGame(app, 'cash', standard({ preference: 'more' }));
    const before = preview(gameId);
    app = await harness.restart(app);
    expect(preview(gameId)).toEqual(before);
  });

  it('returns the same object while nothing relevant changes, also across wizard navigation', async () => {
    const gameId = await plannedGame(app, 'cash', standard());
    const first = preview(gameId);
    expectStatus(await app.planning.goToStep(gameId, 'settings', { fromPreview: true }), 'accepted');
    expectStatus(await app.planning.goToStep(gameId, 'preview'), 'accepted');
    expect(preview(gameId)).toBe(first);
    await app.planning.setSettingText(gameId, 'depth', '50');
    expect(preview(gameId)).not.toBe(first);
    expect(planned(gameId).depth.bb).toBe(50);
  });
});

describe('no recommendation', () => {
  it('lists setup problems while setup is incomplete', async () => {
    const gameId = await plannedGame(app, 'cash', standard());
    await app.planning.setSettingText(gameId, 'buyIn', '');
    const p = preview(gameId);
    expect(p.distribution).toEqual({ kind: 'setupIncomplete' });
    expect(p.canStart).toBe(false);
    expect(p.blockers.map((b) => [b.step, b.problems[0].message])).toEqual([['settings', 'Enter the buy-in per player.']]);
  });

  it.each([
    [
      'insufficientValue',
      [
        ['1', '10'],
        ['5', '10'],
      ],
      'Not enough chip value',
      'The chip set holds 60 chip units, at most 6 for each of 6 players. A stack that pays 4 small and big blinds needs at least 12.',
    ],
    [
      'insufficientBlindChips',
      [
        ['1', '18'],
        ['100', '6'],
      ],
      'Not enough blind-paying chips',
      'Each stack needs chips for 4 separate small and big blind payments; the chip set has 18 chips of value 1 for 6 players.',
    ],
    [
      'unsuitableDenominations',
      [
        ['10', '6'],
        ['15', '6'],
      ],
      'Unsuitable denominations',
      'With chips of 10 and 15, 6 identical stacks can’t pay a small and a big blind exactly at any depth.',
    ],
  ] as const)('names the %s shortfall with the game’s numbers', async (reason, chips, title, message) => {
    const gameId = await plannedGame(app, 'cash', standard({ chips: chips.map(([v, q]) => [v, q]), coverage: reason === 'unsuitableDenominations' ? '1' : undefined, reserve: '0' }));
    const p = preview(gameId);
    expect(p.distribution).toEqual({ kind: 'noValidDistribution', reason, title, message });
    expect(p.canStart).toBe(false);
    expect(p.setupComplete).toBe(true);
  });

  it('asks to simplify a chip set too large to work out', async () => {
    const gameId = await plannedGame(app, 'cash', {
      players: NAMES.slice(0, 10),
      chips: [
        ['185', '260'],
        ['357', '228'],
        ['373', '244'],
        ['421', '212'],
        ['461', '356'],
      ],
      reserve: '6',
      preference: 'more',
    });
    const p = preview(gameId);
    expect(p.distribution).toEqual({
      kind: 'tooComplex',
      message:
        'This chip set is too large to work out on the phone. Simplify it, for example by removing a few rarely used denominations.',
    });
    expect(p.canStart).toBe(false);
    const result = await app.planning.start(gameId, { depthBb: 100, reserveStacks: 6 });
    expect(result).toMatchObject({ status: 'rejected', reason: { code: 'tooComplex' } });
  }, 60_000);

  it('is not part of the Planning view and is `null` for a missing game', async () => {
    const gameId = await plannedGame(app, 'cash', standard());
    expect(app.planning.getView(gameId)!.preview).toEqual({ blockers: [], setupComplete: true });
    expect(app.planning.getDistributionPreview('nope')).toBeNull();
    expect(observe(app, gameId).play).toBeNull();
  });
});
