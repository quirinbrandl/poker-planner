import type { GameManagement, OrderDraft } from '@/game-management';

import {
  createTestHarness,
  expectStatus,
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

const NAMES = ['Alice', 'Bob', 'Cleo', 'Dan', 'Emma', 'Felix'];
const SETUP: PlanSetup = {
  players: NAMES,
  chips: [
    ['1', '200'],
    ['5', '150'],
    ['25', '100'],
    ['100', '50'],
  ],
};
const ACCEPT = { depthBb: 100, reserveStacks: 3 };

async function startedTournament(setup: PlanSetup = SETUP) {
  const gameId = await plannedGame(app, 'tournament', setup);
  expectStatus(await app.planning.start(gameId, ACCEPT), 'accepted');
  return gameId;
}

/** Participant ids by name. */
function ids(gameId: string): Record<string, string> {
  return Object.fromEntries(app.play.getView(gameId)!.players.map((p) => [p.name, p.id]));
}

/** Everything a host can observe about the tournament. */
function observeTournament(gameId: string) {
  const players = app.play.getView(gameId)?.players ?? [];
  return {
    ...observe(app, gameId),
    tournamentPlay: app.play.getTournamentPlay(gameId),
    results: app.play.getTournamentResults(gameId),
    pages: players.map((p) => app.play.getTournamentPlayer(gameId, p.id)),
  };
}

/** Fails unless nothing observable changed, now and after a restart. */
async function expectUnchanged<R extends { status: string }>(gameId: string, run: () => Promise<R>, status = 'rejected') {
  const before = observeTournament(gameId);
  const result = await run();
  expect(result.status).toBe(status);
  expect(observeTournament(gameId)).toEqual(before);
  app = await harness.restart(app);
  expect(observeTournament(gameId)).toEqual(before);
  return result;
}

async function out(gameId: string, ...names: string[]) {
  const id = ids(gameId);
  for (const name of names) expectStatus(await app.play.recordElimination(gameId, id[name]), 'accepted');
}

const tPlay = (gameId: string) => app.play.getTournamentPlay(gameId)!;
const results = (gameId: string) => app.play.getTournamentResults(gameId)!;
const finishers = (gameId: string) => results(gameId).finishers.map((f) => [f.placeLabel, f.name, f.payoutText]);

describe('recording eliminations', () => {
  it('gives places from the bottom up with payouts from the locked schedule, and closes late entry', async () => {
    const gameId = await startedTournament();
    const id = ids(gameId);
    const start = tPlay(gameId);
    expect(start.terms).toEqual([
      { label: 'Blinds', value: '1 / 2', unit: 'chip units' },
      { label: 'Rebuy', value: '20.00', unit: 'EUR' },
      { label: 'Stack', value: '200', unit: 'chip units' },
    ]);
    expect(start.prizePool).toEqual({
      amountText: 'EUR 120.00',
      detail: '6 buy-ins',
      rungs: [
        { place: 1, placeLabel: '1st', shareText: '70%', sharePercent: 70, amountText: 'EUR 84.00', holder: null },
        { place: 2, placeLabel: '2nd', shareText: '30%', sharePercent: 30, amountText: 'EUR 36.00', holder: null },
      ],
    });
    expect(start.lateEntry).toEqual({ status: 'open' });
    expect(start.stillIn).toMatchObject({
      count: 6,
      summary: 'Playing for 1st–6th · next out 6th · no payout',
      sameHandAvailable: true,
      nextPlaceLabels: ['2nd', '3rd', '4th', '5th', '6th'],
    });
    expect(start.stillIn!.players[0]).toEqual({
      playerId: id.Alice,
      name: 'Alice',
      contributionText: 'EUR 20.00',
      elimination: { placeLabel: '6th', payoutText: 'No payout', closesLateEntry: true, winner: null },
    });
    const bankBefore = app.play.getView(gameId)!.bank;

    expect(await app.play.recordElimination(gameId, id.Felix)).toEqual({ status: 'accepted', place: 6 });
    app = await harness.restart(app);
    let view = tPlay(gameId);
    expect(view.lateEntry).toEqual({
      status: 'closed',
      eliminationsText: '1 elimination',
      message:
        'Late entry closes once anyone is out (1 elimination recorded). It opens again only if every elimination is undone.',
    });
    expect(view.unpaidFinishers).toEqual([
      { playerId: id.Felix, name: 'Felix', placeLabel: '6th', contributionText: 'EUR 20.00', payoutText: 'No payout' },
    ]);
    expect(view.stillIn!.players.map((p) => p.name)).toEqual(['Alice', 'Bob', 'Cleo', 'Dan', 'Emma']);
    expect(view.stillIn!.players[0].elimination).toEqual({
      placeLabel: '5th',
      payoutText: 'No payout',
      closesLateEntry: false,
      winner: null,
    });

    await out(gameId, 'Dan', 'Emma', 'Bob');
    view = tPlay(gameId);
    expect(view.stillIn).toMatchObject({
      count: 2,
      summary: 'Playing for 1st–2nd · next out 2nd · EUR 36.00',
      sameHandAvailable: false,
    });
    expect(view.stillIn!.players.map((p) => [p.name, p.elimination])).toEqual([
      ['Alice', { placeLabel: '2nd', payoutText: 'EUR 36.00', closesLateEntry: false, winner: { name: 'Cleo', payoutText: 'EUR 84.00' } }],
      ['Cleo', { placeLabel: '2nd', payoutText: 'EUR 36.00', closesLateEntry: false, winner: { name: 'Alice', payoutText: 'EUR 84.00' } }],
    ]);
    expect(view.unpaidFinishers.map((f) => [f.placeLabel, f.name])).toEqual([
      ['3rd', 'Bob'],
      ['4th', 'Emma'],
      ['5th', 'Dan'],
      ['6th', 'Felix'],
    ]);
    expect(finishers(gameId)).toEqual([
      ['3rd', 'Bob', 'No payout'],
      ['4th', 'Emma', 'No payout'],
      ['5th', 'Dan', 'No payout'],
      ['6th', 'Felix', 'No payout'],
    ]);
    // Eliminations move no chips and never change contributions.
    expect(app.play.getView(gameId)!.bank).toEqual(bankBefore);
    expect(app.play.getView(gameId)!.totals.contributions.cents).toBe(12000);
  });

  it('derives the winner with one player left without completing the game, and Results allow Calculate', async () => {
    const gameId = await startedTournament();
    const id = ids(gameId);
    expect(results(gameId)).toMatchObject({
      status: {
        kind: 'incomplete',
        ringText: '0/5',
        recorded: 0,
        needed: 5,
        title: '6 still playing',
        names: 'Alice, Bob, Cleo, Dan, Emma, Felix',
        progressLabel: '0 of 5 eliminations recorded',
      },
      openPlaces: { rangeLabel: '1st–6th', description: 'Still playing · 1st 84.00 · 2nd 36.00 open' },
      canEditOrder: false,
      calculate: { kind: 'blocked', stillPlayingText: '6 players', message: 'Record eliminations until one player is left.' },
    });
    await out(gameId, 'Felix', 'Dan', 'Emma', 'Bob', 'Alice');
    app = await harness.restart(app);

    const view = tPlay(gameId);
    expect(view.stillIn).toBeNull();
    expect(view.winner).toEqual({ playerId: id.Cleo, name: 'Cleo' });
    expect(view.prizePool.rungs.map((r) => r.holder)).toEqual([
      { playerId: id.Cleo, name: 'Cleo', isWinner: true },
      { playerId: id.Alice, name: 'Alice', isWinner: false },
    ]);
    expect(results(gameId)).toMatchObject({
      phase: 'inProgress',
      status: { kind: 'winner', title: 'Cleo wins', description: 'All 5 eliminations recorded · 6 players' },
      openPlaces: null,
      canEditOrder: true,
      calculate: { kind: 'ready' },
    });
    expect(results(gameId).finishers[0]).toEqual({
      playerId: id.Cleo,
      name: 'Cleo',
      placeLabel: '1st',
      paid: true,
      isWinner: true,
      contributionText: 'EUR 20.00',
      payoutText: 'EUR 84.00',
    });
    expect(finishers(gameId).slice(1, 3)).toEqual([
      ['2nd', 'Alice', 'EUR 36.00'],
      ['3rd', 'Bob', 'No payout'],
    ]);
    expect(app.games.get(gameId)!.phase).toBe('inProgress');
  });

  it('records several out in the same hand in the host’s order, in one step', async () => {
    const gameId = await startedTournament();
    const id = ids(gameId);
    await out(gameId, 'Felix');
    const stillIn = tPlay(gameId).stillIn!.players.map((p) => p.playerId);
    // The host puts Emma above Bob: Emma 4th, Bob 5th.
    expectStatus(await app.play.recordSameHand(gameId, { bestFirst: [id.Emma, id.Bob], stillIn }), 'accepted');
    app = await harness.restart(app);
    expect(finishers(gameId)).toEqual([
      ['4th', 'Emma', 'No payout'],
      ['5th', 'Bob', 'No payout'],
      ['6th', 'Felix', 'No payout'],
    ]);
  });

  it('gives leftover cents to 1st first', async () => {
    const gameId = await startedTournament({ ...SETUP, buyIn: '20.01' });
    expect(tPlay(gameId).prizePool.rungs.map((r) => r.amountText)).toEqual(['EUR 84.05', 'EUR 36.01']);
    expect(tPlay(gameId).prizePool.amountText).toBe('EUR 120.06');
  });

  it('rejects an elimination of someone already out, the last player or a stranger, changing nothing', async () => {
    const gameId = await startedTournament();
    const id = ids(gameId);
    await out(gameId, 'Felix');
    const already = await expectUnchanged(gameId, () => app.play.recordElimination(gameId, id.Felix));
    expect(already).toMatchObject({ reason: { code: 'alreadyOut', message: 'Felix is already out.' } });
    const stranger = await expectUnchanged(gameId, () => app.play.recordElimination(gameId, 'nobody'));
    expect(stranger).toMatchObject({ reason: { code: 'notPlaying' } });

    await out(gameId, 'Dan', 'Emma', 'Bob', 'Alice');
    const last = await expectUnchanged(gameId, () => app.play.recordElimination(gameId, id.Cleo));
    expect(last).toMatchObject({
      reason: { code: 'lastPlayer', message: 'Cleo is the last player left. One player has to stay in.' },
    });
  });

  it('rejects a same-hand set that is stale, too small or leaves nobody in', async () => {
    const gameId = await startedTournament();
    const id = ids(gameId);
    const stillIn = tPlay(gameId).stillIn!.players.map((p) => p.playerId);
    await out(gameId, 'Felix');
    const stale = await expectUnchanged(gameId, () =>
      app.play.recordSameHand(gameId, { bestFirst: [id.Emma, id.Bob], stillIn }),
    );
    expect(stale).toMatchObject({
      reason: { code: 'stillInChanged', message: 'The players still in changed. Check them and try again.' },
    });
    const current = tPlay(gameId).stillIn!.players.map((p) => p.playerId);
    expect(await expectUnchanged(gameId, () => app.play.recordSameHand(gameId, { bestFirst: [id.Emma], stillIn: current }))).toMatchObject({
      reason: { code: 'tooFewPlayers' },
    });
    expect(
      await expectUnchanged(gameId, () => app.play.recordSameHand(gameId, { bestFirst: current, stillIn: current })),
    ).toMatchObject({ reason: { code: 'lastPlayer' } });
    expect(
      await expectUnchanged(gameId, () => app.play.recordSameHand(gameId, { bestFirst: [id.Emma, id.Felix], stillIn: current })),
    ).toMatchObject({ reason: { code: 'alreadyOut' } });
  });

  it('is only for In progress tournaments', async () => {
    const cash = await plannedGame(app, 'cash', SETUP);
    expectStatus(await app.planning.start(cash, ACCEPT), 'accepted');
    const someone = app.play.getView(cash)!.players[0].id;
    expect(await app.play.recordElimination(cash, someone)).toMatchObject({ reason: { code: 'notTournament' } });
    expect(app.play.getTournamentPlay(cash)).toBeNull();
    const planning = await plannedGame(app, 'tournament', SETUP);
    expect(await app.play.recordElimination(planning, 'x')).toMatchObject({ reason: { code: 'notInProgress' } });
    expect(app.play.getTournamentResults(planning)).toBeNull();
  });
});

describe('the finishing order editor', () => {
  async function midway() {
    const gameId = await startedTournament();
    await out(gameId, 'Felix', 'Dan');
    return { gameId, id: ids(gameId) };
  }

  it('describes the saved order with no changes and every missed slot', async () => {
    const { gameId, id } = await midway();
    const draft = app.play.startOrderDraft(gameId)!;
    const view = app.play.describeOrderDraft(draft)!;
    expect(view).toEqual({
      gameId,
      hasChanges: false,
      top: { kind: 'stillPlaying', rangeLabel: '1st–4th', names: 'Alice, Bob, Cleo, Emma' },
      rows: [
        {
          playerId: id.Dan,
          name: 'Dan',
          placeLabel: '5th',
          marker: null,
          payoutText: 'No payout',
          canMoveUp: false,
          canMoveDown: true,
          moveUpLabel: 'Move Dan up to 4th',
          moveDownLabel: 'Move Dan down to 6th',
        },
        {
          playerId: id.Felix,
          name: 'Felix',
          placeLabel: '6th',
          marker: null,
          payoutText: 'No payout',
          canMoveUp: true,
          canMoveDown: false,
          moveUpLabel: 'Move Felix up to 5th',
          moveDownLabel: 'Move Felix down to 7th',
        },
      ],
      missed: {
        candidates: ['Alice', 'Bob', 'Cleo', 'Emma'].map((name) => ({ playerId: id[name], name })),
        slots: [
          { slotId: '2', placeLabel: '4th', description: 'out after Dan (most recent)' },
          { slotId: '1', placeLabel: '5th', description: 'between Felix and Dan' },
          { slotId: '0', placeLabel: '6th', description: 'out before Felix' },
        ],
        defaultSlotId: '2',
      },
      changes: [],
    });
  });

  it('moves, adds a missed elimination and lists only what changes; saving applies it', async () => {
    const { gameId, id } = await midway();
    let draft = app.play.startOrderDraft(gameId)!;
    draft = app.play.addMissedToOrderDraft(draft, { playerId: id.Emma, slotId: '1' });
    // Emma between Felix and Dan: Felix 6th, Emma 5th, Dan 4th.
    let view = app.play.describeOrderDraft(draft)!;
    expect(view.rows.map((r) => [r.placeLabel, r.name, r.marker])).toEqual([
      ['4th', 'Dan', { kind: 'was', text: 'was 5th' }],
      ['5th', 'Emma', { kind: 'missed' }],
      ['6th', 'Felix', null],
    ]);
    expect(view.changes).toEqual([
      { key: id.Dan, label: 'Dan', value: '5th → 4th' },
      { key: id.Emma, label: 'Emma', value: 'Out · 5th · no payout' },
    ]);
    draft = app.play.moveUpInOrderDraft(draft, id.Felix);
    view = app.play.describeOrderDraft(draft)!;
    expect(view.rows.map((r) => [r.placeLabel, r.name, r.marker])).toEqual([
      ['4th', 'Dan', { kind: 'was', text: 'was 5th' }],
      ['5th', 'Felix', { kind: 'was', text: 'was 6th' }],
      ['6th', 'Emma', { kind: 'missed' }],
    ]);
    expect(view.hasChanges).toBe(true);

    // Nothing is saved while the host edits.
    app = await harness.restart(app);
    expect(finishers(gameId).map((f) => f[1])).toEqual(['Dan', 'Felix']);

    expectStatus(await app.play.saveOrder(draft), 'accepted');
    app = await harness.restart(app);
    expect(finishers(gameId)).toEqual([
      ['4th', 'Dan', 'No payout'],
      ['5th', 'Felix', 'No payout'],
      ['6th', 'Emma', 'No payout'],
    ]);
    expect(app.play.getView(gameId)!.totals.contributions.cents).toBe(12000);
  });

  it('describes a winner made or withdrawn by the draft, payouts and late entry', async () => {
    const gameId = await startedTournament();
    const id = ids(gameId);
    await out(gameId, 'Felix', 'Dan', 'Emma', 'Bob', 'Alice');
    let draft = app.play.startOrderDraft(gameId)!;
    expect(app.play.describeOrderDraft(draft)!.top).toEqual({ kind: 'winner', placeLabel: '1st', name: 'Cleo' });
    expect(app.play.describeOrderDraft(draft)!.missed).toBeNull();

    // Swap Bob and Alice: Bob 2nd (paid), Alice 3rd.
    draft = app.play.moveUpInOrderDraft(draft, id.Bob);
    expect(app.play.describeOrderDraft(draft)!.changes).toEqual([
      { key: id.Alice, label: 'Alice', value: '2nd → 3rd · no payout' },
      { key: id.Bob, label: 'Bob', value: '3rd → 2nd · EUR 36.00' },
    ]);
    // Undo Alice: Bob is back on 3rd and Cleo is no longer the winner.
    draft = app.play.undoInOrderDraft(draft, id.Alice);
    const view = app.play.describeOrderDraft(draft)!;
    expect(view.top).toEqual({ kind: 'stillPlaying', rangeLabel: '1st–2nd', names: 'Alice, Cleo' });
    expect(view.changes).toEqual([
      { key: id.Alice, label: 'Alice', value: 'Back in (was 2nd)' },
      { key: 'winner', label: 'Winner', struck: 'Cleo', value: '· none yet', spokenValue: 'Cleo withdrawn, none yet' },
    ]);

    // Undo everything: late entry opens again.
    let all = app.play.startOrderDraft(gameId)!;
    for (const name of ['Felix', 'Dan', 'Emma', 'Bob', 'Alice']) all = app.play.undoInOrderDraft(all, id[name]);
    const undone = app.play.describeOrderDraft(all)!;
    expect(undone.rows).toEqual([]);
    expect(undone.changes.slice(-2)).toEqual([
      { key: 'winner', label: 'Winner', struck: 'Cleo', value: '· none yet', spokenValue: 'Cleo withdrawn, none yet' },
      { key: 'entry', label: 'Late entry', value: 'Opens again' },
    ]);
    expect(undone.missed!.slots).toEqual([{ slotId: '0', placeLabel: '6th', description: 'first one out' }]);
    expectStatus(await app.play.saveOrder(all), 'accepted');
    app = await harness.restart(app);
    expect(tPlay(gameId).lateEntry).toEqual({ status: 'open' });
    expect(app.games.get(gameId)!.phase).toBe('inProgress');
  });

  it('names a new winner and closing late entry when missed eliminations are added', async () => {
    const gameId = await startedTournament({ ...SETUP, players: NAMES.slice(0, 3), reserve: '3' });
    const id = ids(gameId);
    await out(gameId, 'Cleo');
    let draft = app.play.startOrderDraft(gameId)!;
    draft = app.play.addMissedToOrderDraft(draft, { playerId: id.Bob, slotId: '1' });
    expect(app.play.describeOrderDraft(draft)!.changes).toEqual([
      { key: id.Bob, label: 'Bob', value: 'Out · 2nd · EUR 18.00' },
      { key: 'winner', label: 'Winner', value: 'Alice · EUR 42.00' },
    ]);
    // A full draft offers no further missed elimination and ignores one.
    expect(app.play.describeOrderDraft(draft)!.missed).toBeNull();
    expect(app.play.addMissedToOrderDraft(draft, { playerId: id.Alice, slotId: '0' })).toBe(draft);

    let fresh = app.play.startOrderDraft(gameId)!;
    fresh = app.play.undoInOrderDraft(fresh, id.Cleo);
    fresh = app.play.addMissedToOrderDraft(fresh, { playerId: id.Alice, slotId: '0' });
    expect(app.play.describeOrderDraft(fresh)!.changes).toEqual([
      { key: id.Alice, label: 'Alice', value: 'Out · 3rd · no payout' },
      { key: id.Cleo, label: 'Cleo', value: 'Back in (was 3rd)' },
    ]);
  });

  it('rejects saving a draft started from an order that changed since, changing nothing', async () => {
    const { gameId, id } = await midway();
    const draft = app.play.moveUpInOrderDraft(app.play.startOrderDraft(gameId)!, id.Felix);
    await out(gameId, 'Emma');
    const result = await expectUnchanged(gameId, () => app.play.saveOrder(draft));
    expect(result).toMatchObject({ reason: { code: 'orderChanged', message: 'The order changed meanwhile. Nothing was saved.' } });
  });

  it('rejects an impossible order', async () => {
    const { gameId, id } = await midway();
    const draft: OrderDraft = { ...app.play.startOrderDraft(gameId)!, order: [id.Felix, id.Felix] };
    expect(await expectUnchanged(gameId, () => app.play.saveOrder(draft))).toMatchObject({ reason: { code: 'invalidOrder' } });
  });
});

describe('Back in the game', () => {
  it('asks first, then removes one elimination only; late entry stays closed until all are undone', async () => {
    const gameId = await startedTournament();
    const id = ids(gameId);
    await out(gameId, 'Felix', 'Dan', 'Emma');

    const asked = await expectUnchanged(gameId, () => app.play.backInTheGame(gameId, id.Dan), 'needsConfirmation');
    expect(asked).toEqual({
      status: 'needsConfirmation',
      confirmation: {
        kind: 'backInTheGame',
        name: 'Dan',
        changes: [
          { key: id.Dan, label: 'Dan', value: 'Back in (was 5th)' },
          { key: id.Emma, label: 'Emma', value: '4th → 5th' },
          { key: 'buyIns', label: 'Buy-ins', value: 'EUR 20.00 · unchanged' },
        ],
      },
    });
    expect(app.play.getTournamentPlayer(gameId, id.Dan)!.backIn).toEqual({
      name: 'Dan',
      changes: (asked as { confirmation: { changes: unknown } }).confirmation.changes,
    });

    expectStatus(await app.play.backInTheGame(gameId, id.Dan, { confirmed: true }), 'accepted');
    app = await harness.restart(app);
    expect(finishers(gameId).map((f) => [f[0], f[1]])).toEqual([
      ['5th', 'Emma'],
      ['6th', 'Felix'],
    ]);
    expect(tPlay(gameId).stillIn!.players.map((p) => p.name)).toContain('Dan');
    expect(tPlay(gameId).lateEntry.status).toBe('closed');
    expect(app.play.getView(gameId)!.totals.contributions.cents).toBe(12000);

    await app.play.backInTheGame(gameId, id.Emma, { confirmed: true });
    const last = expectStatus(await app.play.backInTheGame(gameId, id.Felix), 'needsConfirmation');
    expect(last.confirmation.changes).toEqual([
      { key: id.Felix, label: 'Felix', value: 'Back in (was 6th)' },
      { key: 'entry', label: 'Late entry', value: 'Opens again' },
      { key: 'buyIns', label: 'Buy-ins', value: 'EUR 20.00 · unchanged' },
    ]);
    await app.play.backInTheGame(gameId, id.Felix, { confirmed: true });
    expect(tPlay(gameId).lateEntry).toEqual({ status: 'open' });
    expect(app.games.get(gameId)!.phase).toBe('inProgress');
  });

  it('withdraws the winner', async () => {
    const gameId = await startedTournament();
    const id = ids(gameId);
    await out(gameId, 'Felix', 'Dan', 'Emma', 'Bob', 'Alice');
    const asked = expectStatus(await app.play.backInTheGame(gameId, id.Bob), 'needsConfirmation');
    expect(asked.confirmation.changes).toEqual([
      { key: id.Alice, label: 'Alice', value: '2nd → 3rd · no payout' },
      { key: id.Bob, label: 'Bob', value: 'Back in (was 3rd)' },
      { key: 'winner', label: 'Winner', struck: 'Cleo', value: '· none yet', spokenValue: 'Cleo withdrawn, none yet' },
      { key: 'buyIns', label: 'Buy-ins', value: 'EUR 20.00 · unchanged' },
    ]);
    await app.play.backInTheGame(gameId, id.Bob, { confirmed: true });
    expect(tPlay(gameId).winner).toBeNull();
    expect(results(gameId).calculate.kind).toBe('blocked');
  });

  it('is rejected for a player who is not out', async () => {
    const gameId = await startedTournament();
    const id = ids(gameId);
    expect(await expectUnchanged(gameId, () => app.play.backInTheGame(gameId, id.Alice, { confirmed: true }))).toMatchObject({
      reason: { code: 'notOut', message: 'Alice is not out.' },
    });
  });
});

describe('the tournament player page', () => {
  it('shows buy-ins with their mixes, and the place and balance once finished', async () => {
    const gameId = await startedTournament();
    const id = ids(gameId);
    const still = app.play.getTournamentPlayer(gameId, id.Alice)!;
    expect(still).toMatchObject({ name: 'Alice', status: 'stillIn', result: null, backIn: null, buyInsTotalText: 'EUR 20.00' });
    expect(still.buyIns).toHaveLength(1);
    expect(still.buyIns[0]).toMatchObject({ kind: 'buyIn', label: 'Buy-in', amountText: 'EUR 20.00', coverageText: null, undo: null });
    expect(still.buyIns[0].mix.map((c) => [c.value, c.count])).toEqual([
      [1, 15],
      [5, 2],
      [25, 3],
      [100, 1],
    ]);

    await out(gameId, 'Felix', 'Dan', 'Emma', 'Bob', 'Alice');
    expect(app.play.getTournamentPlayer(gameId, id.Alice)).toMatchObject({
      status: 'out',
      result: {
        placeLabel: '2nd',
        paid: true,
        statusText: 'Out · 2nd place',
        balanceText: '+EUR 16.00',
        direction: 'gain',
        balanceCaption: 'Won',
        payoutText: 'EUR 36.00',
        contributionsText: 'EUR 20.00',
      },
    });
    expect(app.play.getTournamentPlayer(gameId, id.Felix)!.result).toMatchObject({
      balanceText: '−EUR 20.00',
      direction: 'loss',
      balanceCaption: 'Lost',
      payoutText: 'No payout',
      paid: false,
    });
    expect(app.play.getTournamentPlayer(gameId, id.Cleo)).toMatchObject({
      status: 'winner',
      backIn: null,
      result: { placeLabel: '1st', statusText: 'Winner · last player left', balanceText: '+EUR 64.00' },
    });
    expect(app.play.getTournamentPlayer(gameId, 'nobody')).toBeNull();
  });
});

describe('Return to Planning', () => {
  it('counts the eliminations it clears and clears them', async () => {
    const gameId = await startedTournament();
    await out(gameId, 'Felix', 'Dan');
    const asked = expectStatus(await app.play.returnToPlanning(gameId), 'needsConfirmation');
    expect(asked.confirmation.clears).toMatchObject({ eliminations: 2, text: '2 eliminations · all handed-out stacks' });
    expectStatus(await app.play.returnToPlanning(gameId, { confirmed: true }), 'accepted');
    expectStatus(await app.planning.start(gameId, ACCEPT), 'accepted');
    app = await harness.restart(app);
    expect(results(gameId).finishers).toEqual([]);
    expect(tPlay(gameId).lateEntry).toEqual({ status: 'open' });
  });
});
