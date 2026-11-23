import type {
  EntryConfirmation,
  GameManagement,
  RebuyConfirmation,
} from '@/game-management';

import {
  createTestHarness,
  expectStatus,
  observe,
  plannedGame,
  type PlanSetup,
  type TestHarness,
  withSavedPlayRecords,
} from '../support/game-management';

let harness: TestHarness;
let app: GameManagement;

beforeEach(async () => {
  harness = await createTestHarness();
  app = await harness.open();
});
afterEach(() => harness.cleanup());

const NAMES = ['Alice', 'Bob', 'Cleo', 'Dan', 'Emma', 'Felix'];
/** 6 players, 200-unit stacks [15, 2, 3, 1], automatic reserve 3. */
const STANDARD: PlanSetup = {
  players: NAMES,
  chips: [
    ['1', '200'],
    ['5', '150'],
    ['25', '100'],
    ['100', '50'],
  ],
};
/**
 * 2 players, no reserve. Each starting stack is [15, 2, 3, 1, 0], leaving [10, 6, 4, 3, 1]: too few
 * 1-unit chips for full coverage (4 payments of each blind need 12), so rebuys walk down from
 * reduced coverage (3 of 4) to zero coverage (2 × 100) to no exact stack (40 units plus a 500).
 */
const SMALL: PlanSetup = {
  players: ['Alice', 'Bob'],
  chips: [
    ['1', '40'],
    ['5', '10'],
    ['25', '10'],
    ['100', '5'],
    ['500', '1'],
  ],
  reserve: '0',
};

const counts = (mix: readonly { count: number }[]) => mix.map((c) => c.count);
const value = (mix: readonly { value: number; count: number }[]) => mix.reduce((s, c) => s + c.value * c.count, 0);

async function started(setup: PlanSetup, reserveStacks: number) {
  const gameId = await plannedGame(app, 'cash', setup);
  expectStatus(await app.planning.start(gameId, { depthBb: 100, reserveStacks }), 'accepted');
  return gameId;
}

const playerId = (gameId: string, name: string) => app.play.getView(gameId)!.players.find((p) => p.name === name)!.id;
const bank = (gameId: string) => counts(app.play.getView(gameId)!.bank.mix);

function rebuyProposal(gameId: string, name: string): RebuyConfirmation {
  return expectStatus(app.play.proposeRebuy(gameId, playerId(gameId, name)), 'needsConfirmation').confirmation;
}

async function rebuy(gameId: string, name: string) {
  const proposal = rebuyProposal(gameId, name);
  expectStatus(await app.play.issueRebuy(gameId, proposal.acceptance), 'accepted');
  return proposal;
}

async function savedPlayer(name: string) {
  return expectStatus(await app.savedPlayers.create(name), 'accepted').savedPlayerId;
}

function entryProposal(gameId: string, savedPlayerId: string): EntryConfirmation {
  return expectStatus(app.play.proposeEntry(gameId, savedPlayerId), 'needsConfirmation').confirmation;
}

/** Everything observable about the game and saved players. */
function snapshot(gameId: string) {
  return {
    ...observe(app, gameId),
    screen: app.play.getPlayScreen(gameId),
    bankReserve: app.play.getBankReserve(gameId),
    details: app.play.getGameDetails(gameId),
    addPlayer: app.play.getAddPlayer(gameId),
    savedPlayers: app.savedPlayers.list(),
  };
}

/** Runs `operation` and fails unless nothing observable changed, now and after a restart. */
async function expectNothingChanged<R>(gameId: string, operation: () => R | Promise<R>): Promise<R> {
  const before = snapshot(gameId);
  const result = await operation();
  expect(snapshot(gameId)).toEqual(before);
  app = await harness.restart(app);
  expect(snapshot(gameId)).toEqual(before);
  return result;
}

describe('fully qualifying rebuys', () => {
  it('proposes an exact, fully covered stack from the bank and records exactly it', async () => {
    const gameId = await started(STANDARD, 3);
    const bankBefore = bank(gameId);
    const bob = playerId(gameId, 'Bob');

    const proposal = await expectNothingChanged(gameId, () => rebuyProposal(gameId, 'Bob'));
    const { popup, acceptance } = proposal;
    expect(popup).toMatchObject({
      kind: 'proposal',
      playerId: bob,
      playerName: 'Bob',
      reducedCoverage: null,
      reserveAfter: { value: '2', unit: 'stacks left' },
      priceText: 'EUR 20.00',
      newTotalText: 'EUR 40.00',
      reserveNote: null,
    });
    expect(popup.extraFacts).toBeUndefined();
    expect(popup.stack.unitsText).toBe('200');
    expect(value(popup.stack.chips)).toBe(200);
    // Fewer chips: 15 × 1 is the least that pays 4 of each blind with separate chips at 1 / 2.
    expect(counts(popup.stack.chips)).toEqual([15, 2, 3, 1]);
    expect(acceptance).toEqual({ participantId: bob, mix: [15, 2, 3, 1], newTotalCents: 4000, reserveAfter: 2, acceptedCoverage: null });

    const issued = expectStatus(await app.play.issueRebuy(gameId, acceptance), 'accepted');
    expect(issued.feedback).toEqual({ title: 'Rebuy issued for Bob', message: '+EUR 20.00 contribution · 200 chip units issued.' });

    const check = () => {
      const view = app.play.getView(gameId)!;
      expect(counts(view.bank.mix)).toEqual(bankBefore.map((c, i) => c - acceptance.mix[i]));
      const row = view.players.find((p) => p.id === bob)!;
      expect(row.contribution).toEqual({ stacks: 2, rebuys: 1, cents: 4000, text: 'EUR 40.00 contribution · 1 rebuy' });
      expect(counts(row.handedOut.mix)).toEqual([30, 4, 6, 2]);
      expect(view.totals).toMatchObject({ buyIns: 6, rebuys: 1, stacks: 7, contributions: { cents: 14000 } });
      expect(view.reserve).toMatchObject({ startedTarget: 3, consumed: 1, unconsumed: 2, achievable: 2, weakened: false });
      // Earlier mixes are untouched.
      for (const other of view.players.filter((p) => p.id !== bob)) expect(counts(other.handedOut.mix)).toEqual([15, 2, 3, 1]);
      expect(app.play.getPlayScreen(gameId)!.playing.find((p) => p.id === bob)!.contributionText).toBe(
        'EUR 40.00 contribution · 1 rebuy',
      );
      expect(app.play.getPlayScreen(gameId)!.reserveText).toBe('2 reserve stacks available');
    };
    check();
    app = await harness.restart(app);
    check();
  });

  it('cannot issue the same proposal twice', async () => {
    const gameId = await started(STANDARD, 3);
    const { acceptance } = rebuyProposal(gameId, 'Bob');
    const [first, second] = await Promise.all([app.play.issueRebuy(gameId, acceptance), app.play.issueRebuy(gameId, acceptance)]);
    expect(first.status).toBe('accepted');
    expect(second).toMatchObject({ status: 'rejected', reason: { code: 'proposalChanged' } });
    await expectNothingChanged(gameId, () => app.play.issueRebuy(gameId, acceptance));
    expect(app.play.getView(gameId)!.totals.rebuys).toBe(1);
  });

  it('keeps qualifying requests allowed after the reserve target is used up', async () => {
    const gameId = await started(STANDARD, 3);
    expect((await rebuy(gameId, 'Bob')).popup.reserveAfter.value).toBe('2');
    expect((await rebuy(gameId, 'Cleo')).popup.reserveAfter.value).toBe('1');
    const third = await rebuy(gameId, 'Dan');
    expect(third.popup).toMatchObject({ reserveAfter: { value: '0', unit: 'stacks left' }, reserveNote: null });
    expect(app.play.getPlayScreen(gameId)!.reserveText).toBe('Reserve used · more stacks may be possible');

    const fourth = rebuyProposal(gameId, 'Bob');
    expect(fourth.popup).toMatchObject({
      reducedCoverage: null,
      reserveAfter: { value: '0', unit: 'stacks left' },
      newTotalText: 'EUR 60.00',
      reserveNote: 'More rebuys are still allowed when another stack is possible.',
    });
    expectStatus(await app.play.issueRebuy(gameId, fourth.acceptance), 'accepted');
    const { reserve } = app.play.getView(gameId)!;
    expect(reserve).toMatchObject({ startedTarget: 3, consumed: 4, unconsumed: 0 });
    expect(app.play.getBankReserve(gameId)!.reserve).toEqual({
      startedTargetText: '3 stacks',
      consumedText: '4',
      unconsumedText: '0',
      achievableText: '0 of 0',
    });
  });

  it('allows qualifying requests with a zero reserve target', async () => {
    const gameId = await started({ ...STANDARD, reserve: '0' }, 0);
    expect(app.play.getPlayScreen(gameId)!.reserveText).toBe('No reserve target · more stacks may be possible');
    const proposal = await rebuy(gameId, 'Alice');
    expect(proposal.popup).toMatchObject({
      reducedCoverage: null,
      reserveAfter: { value: '0', unit: 'stacks left' },
      reserveNote: 'More rebuys are still allowed when another stack is possible.',
    });
    expect(app.play.getView(gameId)!.reserve).toMatchObject({ startedTarget: 0, consumed: 1, unconsumed: 0 });
  });

  it('follows the distribution preference', async () => {
    // The same chip set starts at 1 / 2 with Fewer chips and at 2 / 5 with More chips.
    const more = await started({ ...STANDARD, preference: 'more' }, 3);
    const view = app.play.getView(more)!;
    expect(view.terms.stack.value).toBe(500);
    expect(counts(view.bank.mix)).toEqual([50, 30, 10, 50]);
    const proposal = rebuyProposal(more, 'Bob');
    // As many chips as the bank allows while 2 further stacks stay formable at the same time.
    expect(proposal.acceptance).toMatchObject({ mix: [30, 14, 4, 3], reserveAfter: 2 });
    expect(value(proposal.popup.stack.chips)).toBe(500);
    expectStatus(await app.play.issueRebuy(more, proposal.acceptance), 'accepted');
    expect(app.play.getView(more)!.reserve).toMatchObject({ consumed: 1, unconsumed: 2, achievable: 2 });
  });
});

describe('reduced coverage and impossible rebuys', () => {
  it('offers reduced coverage only when nothing qualifies and records it only when accepted', async () => {
    const gameId = await started(SMALL, 0);
    expect(bank(gameId)).toEqual([10, 6, 4, 3, 1]);

    const proposal = await expectNothingChanged(gameId, () => rebuyProposal(gameId, 'Alice'));
    expect(proposal.popup).toMatchObject({
      reducedCoverage: { achieved: 3, required: 4 },
      reserveAfter: { value: '0', unit: 'stacks left' },
      newTotalText: 'EUR 40.00',
    });
    expect(counts(proposal.popup.stack.chips)).toEqual([10, 3, 3, 1, 0]);
    expect(proposal.acceptance.acceptedCoverage).toBe(3);

    // Without the explicit acceptance nothing is issued.
    const unaccepted = await expectNothingChanged(gameId, () =>
      app.play.issueRebuy(gameId, { ...proposal.acceptance, acceptedCoverage: null }),
    );
    expect(unaccepted).toMatchObject({ status: 'rejected', reason: { code: 'reducedCoverageNotAccepted' } });

    const issued = expectStatus(await app.play.issueRebuy(gameId, proposal.acceptance), 'accepted');
    expect(issued.feedback.message).toBe('+EUR 20.00 contribution · 200 chip units issued · covers 3 of 4 blind payments.');
    app = await harness.restart(app);
    expect(bank(gameId)).toEqual([0, 3, 1, 2, 1]);
    expect(app.play.getView(gameId)!.reserve).toMatchObject({ startedTarget: 0, consumed: 1 });
  });

  it('goes down to zero coverage, then blocks without an exact stack', async () => {
    const gameId = await started(SMALL, 0);
    await rebuy(gameId, 'Alice');

    const zero = rebuyProposal(gameId, 'Bob');
    expect(zero.popup.reducedCoverage).toEqual({ achieved: 0, required: 4 });
    expect(counts(zero.popup.stack.chips)).toEqual([0, 0, 0, 2, 0]);
    expectStatus(await app.play.issueRebuy(gameId, zero.acceptance), 'accepted');
    expect(bank(gameId)).toEqual([0, 3, 1, 0, 1]);

    const blocked = await expectNothingChanged(gameId, () => app.play.proposeRebuy(gameId, playerId(gameId, 'Alice')));
    expect(blocked).toMatchObject({
      status: 'rejected',
      reason: { code: 'unsuitableDenominations' },
      blocked: {
        kind: 'blocked',
        playerName: 'Alice',
        message:
          'No exact 200-unit stack can be formed. The smaller chips make only 40 units, and the 500-unit chip cannot be split.',
      },
    });
  });

  it('names a value shortage', async () => {
    const setup: PlanSetup = { ...SMALL, chips: SMALL.chips.slice(0, 4) };
    const gameId = await started(setup, 0);
    await rebuy(gameId, 'Alice');
    await rebuy(gameId, 'Bob');
    const blocked = app.play.proposeRebuy(gameId, playerId(gameId, 'Alice'));
    expect(blocked).toMatchObject({
      status: 'rejected',
      reason: { code: 'insufficientValue', message: 'An exact 200-unit stack is needed, but the bank holds only 40 chip units.' },
    });
  });

  it('rejects a stale proposal after the bank changed', async () => {
    const gameId = await started(SMALL, 0);
    const forAlice = rebuyProposal(gameId, 'Alice');
    await rebuy(gameId, 'Bob');
    const stale = await expectNothingChanged(gameId, () => app.play.issueRebuy(gameId, forAlice.acceptance));
    expect(stale).toMatchObject({ status: 'rejected', reason: { code: 'proposalChanged' } });
  });
});

describe('who can rebuy', () => {
  it('refuses a player with a confirmed result and shows the signed provisional balance', async () => {
    const gameId = await started(STANDARD, 3);
    const alice = playerId(gameId, 'Alice');
    const cleo = playerId(gameId, 'Cleo');
    await rebuy(gameId, 'Bob');
    // No public result operation exists yet: the records are written as the results feature will.
    app = await withSavedPlayRecords(harness, app, gameId, {
      results: [{ participantId: alice, counts: [15, 2, 5, 1] }],
      countDrafts: [{ participantId: cleo, quantityTexts: ['3', '', '', ''] }],
    });

    const refused = await expectNothingChanged(gameId, () => app.play.proposeRebuy(gameId, alice));
    expect(refused).toMatchObject({ status: 'rejected', reason: { code: 'finishedPlaying' } });

    const screen = app.play.getPlayScreen(gameId)!;
    expect(screen.finished).toEqual([
      {
        id: alice,
        name: 'Alice',
        contributionText: 'EUR 20.00 contribution',
        balanceText: '+EUR 5.00',
        direction: 'gain',
        balanceCaption: 'Won',
        hasCorrectionDraft: false,
      },
    ]);
    expect(screen.playing.map((p) => [p.name, p.hasCountDraft])).toEqual([
      ['Bob', false],
      ['Cleo', true],
      ['Dan', false],
      ['Emma', false],
      ['Felix', false],
    ]);
    expect(screen.totalContributionsText).toBe('EUR 140.00 total contributions');
    // The returned chips are back in the bank; they do not replenish the consumed reserve.
    expect(app.play.getView(gameId)!.reserve).toMatchObject({ consumed: 1, unconsumed: 2 });
    expect(rebuyProposal(gameId, 'Cleo').popup.newTotalText).toBe('EUR 40.00');
  });

  it('rejects unknown players and games that are not In progress', async () => {
    const gameId = await started(STANDARD, 3);
    expect(app.play.proposeRebuy(gameId, 'nobody')).toMatchObject({ reason: { code: 'participantNotFound' } });
    expect(app.play.proposeRebuy('missing', 'x')).toMatchObject({ reason: { code: 'gameNotFound' } });
    const { acceptance } = rebuyProposal(gameId, 'Bob');
    expectStatus(await app.play.returnToPlanning(gameId, { confirmed: true }), 'accepted');
    expect(await app.play.issueRebuy(gameId, acceptance)).toMatchObject({ reason: { code: 'notInProgress' } });
    expect(app.play.getPlayScreen(gameId)).toBeNull();
  });
});

describe('late entry', () => {
  it('admits a saved player with a fully qualifying stack, at the end of the roster', async () => {
    const gameId = await started(STANDARD, 3);
    const gina = await savedPlayer('Gina');
    const bankBefore = bank(gameId);

    const candidates = app.play.getAddPlayer(gameId)!.candidates;
    expect(candidates.map((c) => [c.name, c.inGame])).toEqual([
      ['Alice', true],
      ['Bob', true],
      ['Cleo', true],
      ['Dan', true],
      ['Emma', true],
      ['Felix', true],
      ['Gina', false],
    ]);
    expect(app.play.getAddPlayer(gameId)!.terms).toEqual({ buyInText: 'EUR 20.00', stackText: '200 chip units', blindsText: '1 / 2' });

    const proposal = await expectNothingChanged(gameId, () => entryProposal(gameId, gina));
    expect(proposal.popup).toMatchObject({
      kind: 'proposal',
      name: 'Gina',
      reserveAfter: { value: '2', unit: 'stacks left' },
      initialContributionText: 'EUR 20.00',
      reserveNote: null,
    });
    expect(proposal.declinedNotice).toBe('Gina has not joined.');
    expect(counts(proposal.popup.stack.chips)).toEqual([15, 2, 3, 1]);

    const joined = expectStatus(await app.play.addLatePlayer(gameId, proposal.acceptance), 'accepted');
    expect(joined.feedback).toEqual({ title: 'Gina joined', message: '+EUR 20.00 contribution · 200 chip units issued.' });

    // Renaming the saved player later never changes the captured participant.
    expectStatus(await app.savedPlayers.rename(gina, 'Georgina'), 'accepted');
    app = await harness.restart(app);
    const view = app.play.getView(gameId)!;
    expect(view.players.map((p) => [p.name, p.joinOrder, p.entry])).toEqual([
      ...NAMES.map((name, i) => [name, i + 1, 'initial']),
      ['Gina', 7, 'lateEntry'],
    ]);
    expect(view.players[6]).toMatchObject({ id: joined.participantId, contribution: { cents: 2000, rebuys: 0, text: 'EUR 20.00 contribution' } });
    expect(counts(view.bank.mix)).toEqual(bankBefore.map((c, i) => c - proposal.acceptance.mix[i]));
    expect(view.totals).toMatchObject({ buyIns: 7, rebuys: 0, contributions: { cents: 14000 } });
    expect(view.reserve).toMatchObject({ consumed: 1, unconsumed: 2 });
    expect(app.games.get(gameId)!.participantNames).toEqual([...NAMES, 'Gina']);
    expect(app.play.getGameDetails(gameId)!.players.at(-1)).toEqual({ id: joined.participantId, name: 'Gina', note: 'Joined late' });
    expect(app.play.getAddPlayer(gameId)!.candidates.find((c) => c.name === 'Georgina')!.inGame).toBe(true);

    // Joining again is refused.
    const again = await expectNothingChanged(gameId, () => app.play.addLatePlayer(gameId, proposal.acceptance));
    expect(again).toMatchObject({ status: 'rejected', reason: { code: 'alreadyInGame' } });
  });

  it('refuses a saved player whose name is already taken in the game', async () => {
    const gameId = await started(STANDARD, 3);
    const alice = app.savedPlayers.list().find((p) => p.name === 'Alice')!.id;
    expectStatus(await app.savedPlayers.delete(alice), 'accepted');
    const otherAlice = await savedPlayer('alice');
    expect(app.play.getAddPlayer(gameId)!.candidates.find((c) => c.savedPlayerId === otherAlice)!.inGame).toBe(true);
    expect(app.play.proposeEntry(gameId, otherAlice)).toMatchObject({ reason: { code: 'nameTakenInGame' } });
  });

  it('shares the reserve with rebuys and still admits a qualifying entry after it is used up', async () => {
    const gameId = await started(STANDARD, 3);
    await rebuy(gameId, 'Bob');
    await rebuy(gameId, 'Cleo');
    await rebuy(gameId, 'Dan');
    const gina = await savedPlayer('Gina');
    const proposal = entryProposal(gameId, gina);
    expect(proposal.popup).toMatchObject({
      reserveAfter: { value: '0', unit: 'stacks left' },
      reserveNote: 'More players can join when another fully qualifying stack is possible.',
    });
    expectStatus(await app.play.addLatePlayer(gameId, proposal.acceptance), 'accepted');
    expect(app.play.getView(gameId)!.reserve).toMatchObject({ startedTarget: 3, consumed: 4, unconsumed: 0 });
  });

  it('admits a late arrival with a zero target and after an early result, keeping the result', async () => {
    const gameId = await started({ ...STANDARD, reserve: '0' }, 0);
    const alice = playerId(gameId, 'Alice');
    app = await withSavedPlayRecords(harness, app, gameId, { results: [{ participantId: alice, counts: [10, 2, 3, 1] }] });
    const gina = await savedPlayer('Gina');
    const proposal = entryProposal(gameId, gina);
    expect(proposal.popup.reserveNote).toBe('More players can join when another fully qualifying stack is possible.');
    const finishedBefore = app.play.getPlayScreen(gameId)!.finished;
    expectStatus(await app.play.addLatePlayer(gameId, proposal.acceptance), 'accepted');
    const screen = app.play.getPlayScreen(gameId)!;
    expect(screen.finished).toEqual(finishedBefore);
    expect(screen.finished[0]).toMatchObject({ balanceText: '−EUR 0.50', direction: 'loss', balanceCaption: 'Lost' });
    expect(screen.playing.at(-1)).toMatchObject({ name: 'Gina', contributionText: 'EUR 20.00 contribution', hasCountDraft: false });
  });

  it('blocks reduced and zero coverage and a missing exact stack, admitting nobody', async () => {
    const gameId = await started(SMALL, 0);
    const nora = await savedPlayer('Nora');

    const reduced = await expectNothingChanged(gameId, () => app.play.proposeEntry(gameId, nora));
    expect(reduced).toMatchObject({
      status: 'rejected',
      reason: { code: 'coverageShortage' },
      blocked: { kind: 'blocked', name: 'Nora', reason: { kind: 'coverage', achieved: 3, required: 4, stackUnitsText: '200' } },
      declinedNotice: 'Nora has not joined.',
    });

    await rebuy(gameId, 'Alice');
    const zero = await expectNothingChanged(gameId, () => app.play.proposeEntry(gameId, nora));
    expect(zero).toMatchObject({ blocked: { reason: { kind: 'coverage', achieved: 0, required: 4 } } });

    await rebuy(gameId, 'Bob');
    const impossible = await expectNothingChanged(gameId, () => app.play.proposeEntry(gameId, nora));
    expect(impossible).toMatchObject({
      reason: { code: 'unsuitableDenominations' },
      blocked: { reason: { kind: 'allocation', message: expect.stringContaining('No exact 200-unit stack') } },
    });
    expect(app.play.getView(gameId)!.players).toHaveLength(2);
  });

  it('rejects an entry whose proposal changed', async () => {
    const gameId = await started(STANDARD, 3);
    const gina = await savedPlayer('Gina');
    const proposal = entryProposal(gameId, gina);
    const changed = await expectNothingChanged(gameId, () =>
      app.play.addLatePlayer(gameId, { ...proposal.acceptance, reserveAfter: proposal.acceptance.reserveAfter + 1 }),
    );
    expect(changed).toMatchObject({ status: 'rejected', reason: { code: 'proposalChanged' } });
    expectStatus(await app.savedPlayers.rename(gina, 'Gigi'), 'accepted');
    expect(await app.play.addLatePlayer(gameId, proposal.acceptance)).toMatchObject({ reason: { code: 'proposalChanged' } });
  });

  it('keeps the late arrival through Return to Planning, with the automatic reserve following the roster', async () => {
    const gameId = await started(STANDARD, 3);
    const gina = await savedPlayer('Gina');
    expectStatus(await app.play.addLatePlayer(gameId, entryProposal(gameId, gina).acceptance), 'accepted');
    await rebuy(gameId, 'Bob');
    const confirmation = expectStatus(await app.play.returnToPlanning(gameId), 'needsConfirmation').confirmation;
    expect(confirmation.clears.text).toBe('1 rebuy · all handed-out stacks');
    expect(confirmation.keeps.text).toBe('7 players · buy-ins · settings');
    expectStatus(await app.play.returnToPlanning(gameId, { confirmed: true }), 'accepted');
    app = await harness.restart(app);
    const plan = app.planning.getView(gameId)!;
    expect(plan.players.participants.map((p) => p.name)).toEqual([...NAMES, 'Gina']);
    expect(plan.settings.reserve).toMatchObject({ mode: 'automatic', automaticCount: 4 });
    const preview = app.planning.getDistributionPreview(gameId)!;
    expect(preview.distribution).toMatchObject({ kind: 'planned', plan: { players: 7, reserve: { target: 4 } } });
  });
});

describe('screen reads', () => {
  it('describes Bank & reserve and Game details of a cash game', async () => {
    const gameId = await started(STANDARD, 3);
    expect(app.play.getBankReserve(gameId)).toEqual({
      chipsText: '374 available chips',
      chips: [
        { value: 1, color: null, count: 110 },
        { value: 5, color: null, count: 138 },
        { value: 25, color: null, count: 82 },
        { value: 100, color: null, count: 44 },
      ],
      valueNote: '7,250 chip units in the bank. Total value alone does not prove a 200-unit stack is possible.',
      reserve: { startedTargetText: '3 stacks', consumedText: '0', unconsumedText: '3', achievableText: '3 of 3' },
    });
    expect(app.play.getPlayScreen(gameId)!.terms).toEqual({ blindsText: '1 / 2', rebuyText: '20.00', currency: 'EUR', stackText: '200' });
    expect(app.play.getGameDetails(gameId)).toMatchObject({
      mode: 'cash',
      phase: 'inProgress',
      buyInText: 'EUR 20.00',
      chipValueText: 'EUR 0.10 per chip unit',
      blindsText: '1 / 2 chip units',
      depthText: '100 BB',
      coverageText: '4 payments',
      preferenceText: 'Fewer',
      reserveText: '3 stacks',
      startingStack: { unitsText: '200' },
      payouts: null,
    });
    expect(counts(app.play.getGameDetails(gameId)!.chipSet)).toEqual([200, 150, 100, 50]);
  });

  it('describes a tournament: details with payouts, and the prize pool in its rebuy popup', async () => {
    const gameId = await plannedGame(app, 'tournament', STANDARD);
    expectStatus(await app.planning.start(gameId, { depthBb: 100, reserveStacks: 3 }), 'accepted');
    expect(app.play.getPlayScreen(gameId)).toBeNull();
    expect(app.play.getGameDetails(gameId)).toMatchObject({
      mode: 'tournament',
      chipValueText: 'No chip money value',
      payouts: {
        name: 'Top 2',
        places: [
          { id: 'place-1', placeLabel: '1st', shareText: '70%', amountText: 'EUR 84.00' },
          { id: 'place-2', placeLabel: '2nd', shareText: '30%', amountText: 'EUR 36.00' },
        ],
      },
    });
    const proposal = rebuyProposal(gameId, 'Bob');
    expect(proposal.popup.extraFacts).toEqual([{ label: 'Prize pool', value: 'EUR 120.00 → EUR 140.00' }]);
    expectStatus(await app.play.issueRebuy(gameId, proposal.acceptance), 'accepted');
    expect(app.play.getGameDetails(gameId)!.payouts!.note).toBe(
      'Prize pool EUR 140.00 · 6 buy-ins + 1 rebuy',
    );
  });
});
