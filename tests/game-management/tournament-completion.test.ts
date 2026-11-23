import type { GameManagement, OrderDraft, PaymentsView, RebuyConfirmation } from '@/game-management';

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
const CHIPS: PlanSetup['chips'] = [
  ['1', '200'],
  ['5', '150'],
  ['25', '100'],
  ['100', '50'],
];

/** A started tournament (suggested preset unless `preset`) on its recommended plan: 200-unit stacks, automatic reserve. */
async function tournament(
  players: string[] = SIX,
  { buyIn = '20', preset }: { buyIn?: string; preset?: 'winnerTakesAll' | 'top2' | 'top3' } = {},
) {
  const gameId = await plannedGame(app, 'tournament', { players, chips: CHIPS, buyIn });
  if (preset) expectStatus(await app.planning.choosePayoutPreset(gameId, preset), 'accepted');
  await startPlannedGame(app, gameId);
  return gameId;
}

const idOf = (gameId: string, name: string) => app.play.getView(gameId)!.players.find((p) => p.name === name)!.id;
const tPlay = (gameId: string) => app.play.getTournamentPlay(gameId)!;
const tResults = (gameId: string) => app.play.getTournamentResults(gameId)!;

async function out(gameId: string, ...names: string[]) {
  for (const name of names) expectStatus(await app.play.recordElimination(gameId, idOf(gameId, name)), 'accepted');
}

async function backIn(gameId: string, name: string) {
  expectStatus(await app.play.backInTheGame(gameId, idOf(gameId, name), { confirmed: true }), 'accepted');
}

function rebuyProposal(gameId: string, name: string): RebuyConfirmation {
  return expectStatus(app.play.proposeRebuy(gameId, idOf(gameId, name)), 'needsConfirmation').confirmation;
}

async function rebuy(gameId: string, name: string) {
  return expectStatus(await app.play.issueRebuy(gameId, rebuyProposal(gameId, name).acceptance), 'accepted');
}

async function savedPlayer(name: string) {
  return expectStatus(await app.savedPlayers.create(name), 'accepted').savedPlayerId;
}

async function lateEntry(gameId: string, savedPlayerId: string) {
  const proposal = expectStatus(app.play.proposeEntry(gameId, savedPlayerId), 'needsConfirmation').confirmation;
  return expectStatus(await app.play.addLatePlayer(gameId, proposal.acceptance), 'accepted');
}

async function calculate(gameId: string) {
  return expectStatus(await app.play.calculatePayments(gameId, { confirmed: true }), 'accepted');
}

/** Everything a host can observe about the game, every tab and page, lists and the location. */
function observeAll(gameId: string) {
  const players = app.games.get(gameId)?.participantNames ?? [];
  const view = app.play.getView(gameId);
  const ids = view?.players.map((p) => p.id) ?? app.play.getPayments(gameId)?.balances.map((b) => b.participantId) ?? [];
  return {
    ...observe(app, gameId),
    players,
    list: app.games.list(),
    history: app.games.history(),
    tournamentPlay: app.play.getTournamentPlay(gameId),
    results: app.play.getTournamentResults(gameId),
    pages: ids.map((id) => app.play.getTournamentPlayer(gameId, id)),
    payments: app.play.getPayments(gameId),
    details: app.play.getGameDetails(gameId),
    bankReserve: app.play.getBankReserve(gameId),
    addPlayer: app.play.getAddPlayer(gameId),
    savedPlayers: app.savedPlayers.list(),
  };
}

/** Fails unless nothing observable changed, now and after a restart. */
async function expectUnchanged<R>(gameId: string, run: () => Promise<R> | R): Promise<R> {
  const before = observeAll(gameId);
  const result = await run();
  expect(observeAll(gameId)).toEqual(before);
  app = await harness.restart(app);
  expect(observeAll(gameId)).toEqual(before);
  return result;
}

const balances = (payments: PaymentsView | null) =>
  payments!.balances.map((b) => [b.name, b.placeLabel, ...b.lines, b.balanceText, b.direction].join(' | '));

const paymentLines = (payments: PaymentsView | null) =>
  payments?.summary.kind === 'payments' ? payments.summary.payments.map((p) => `${p.fromName} → ${p.toName} ${p.amountText}`) : [];

const cents = (text: string) => {
  const match = /([+−-]?)EUR (\d+)\.(\d\d)/.exec(text)!;
  return (match[1] === '' || match[1] === '+' ? 1 : -1) * (Number(match[2]) * 100 + Number(match[3]));
};

/** Every player's balance is exactly what the payments move for them. */
function expectPaymentsSettleBalances(payments: PaymentsView) {
  const net = new Map(payments.balances.map((b) => [b.name, 0]));
  if (payments.summary.kind === 'payments') {
    for (const p of payments.summary.payments) {
      net.set(p.fromName, net.get(p.fromName)! - cents(p.amountText));
      net.set(p.toName, net.get(p.toName)! + cents(p.amountText));
    }
  }
  expect(payments.balances.map((b) => cents(b.balanceText))).toEqual(payments.balances.map((b) => net.get(b.name)));
  expect(payments.balances.reduce((sum, b) => sum + cents(b.balanceText), 0)).toBe(0);
}

describe('tournament late entry', () => {
  it('is open before anyone is out and after rebuys alone; any elimination closes it until all are undone', async () => {
    const gameId = await tournament();
    const nora = await savedPlayer('Nora');
    const omar = await savedPlayer('Omar');

    await rebuy(gameId, 'Bob');
    expect(tPlay(gameId).lateEntry).toEqual({ status: 'open' });
    const proposal = expectStatus(app.play.proposeEntry(gameId, nora), 'needsConfirmation').confirmation;
    expect(proposal.popup.extraFacts).toEqual([{ label: 'Prize pool', value: 'EUR 140.00 → EUR 160.00' }]);
    expect(proposal.popup.reducedCoverage).toBeUndefined();
    const joined = expectStatus(await app.play.addLatePlayer(gameId, proposal.acceptance), 'accepted');
    expect(joined.feedback).toEqual({ title: 'Nora joined', message: '+EUR 20.00 contribution · 200 chip units issued.' });
    app = await harness.restart(app);

    // One more participant and contribution; the same two paid places at the same percentages.
    expect(tPlay(gameId).prizePool).toEqual({
      amountText: 'EUR 160.00',
      detail: '7 buy-ins + 1 rebuy',
      rungs: [
        { place: 1, placeLabel: '1st', shareText: '70%', sharePercent: 70, amountText: 'EUR 112.00', holder: null },
        { place: 2, placeLabel: '2nd', shareText: '30%', sharePercent: 30, amountText: 'EUR 48.00', holder: null },
      ],
    });
    expect(tPlay(gameId).stillIn).toMatchObject({ count: 7, summary: 'Playing for 1st–7th · next out 7th · no payout' });
    expect(tResults(gameId).status).toMatchObject({ kind: 'incomplete', ringText: '0/6' });
    // The late arrival consumed the shared target without enlarging it.
    expect(app.play.getBankReserve(gameId)!.reserve).toMatchObject({ startedTargetText: '3 stacks', consumedText: '2', unconsumedText: '1' });
    expect(app.play.getGameDetails(gameId)!.players.at(-1)).toEqual({ id: idOf(gameId, 'Nora'), name: 'Nora', note: 'Joined late' });

    const stale = expectStatus(app.play.proposeEntry(gameId, omar), 'needsConfirmation').confirmation.acceptance;
    await out(gameId, 'Felix', 'Dan');
    expect(tPlay(gameId).lateEntry).toEqual({
      status: 'closed',
      eliminationsText: '2 eliminations',
      message: 'Late entry closes once anyone is out (2 eliminations recorded). It opens again only if every elimination is undone.',
    });
    const closed = { status: 'rejected', reason: { code: 'eliminationsRecorded', message: 'Late entry is closed while an elimination is recorded.' } };
    expect(await expectUnchanged(gameId, () => app.play.proposeEntry(gameId, omar))).toEqual(closed);
    expect(await expectUnchanged(gameId, () => app.play.addLatePlayer(gameId, stale))).toEqual(closed);

    await backIn(gameId, 'Dan');
    expect(tPlay(gameId).lateEntry).toMatchObject({ status: 'closed', eliminationsText: '1 elimination' });
    expect(await expectUnchanged(gameId, () => app.play.proposeEntry(gameId, omar))).toEqual(closed);

    await backIn(gameId, 'Felix');
    expect(tPlay(gameId).lateEntry).toEqual({ status: 'open' });
    await lateEntry(gameId, omar);
    app = await harness.restart(app);
    expect(app.play.getView(gameId)!.players.map((p) => p.name)).toEqual([...SIX, 'Nora', 'Omar']);
    expect(tPlay(gameId).prizePool.rungs.map((r) => r.amountText)).toEqual(['EUR 126.00', 'EUR 54.00']);
  });
});

describe('tournament rebuys', () => {
  it('lets a player still in rebuy without limit; each raises the pool and payouts but adds no player or place', async () => {
    const gameId = await tournament();
    const issued = await rebuy(gameId, 'Bob');
    expect(issued.feedback).toEqual({ title: 'Rebuy issued for Bob', message: '+EUR 20.00 contribution · 200 chip units issued.' });
    await rebuy(gameId, 'Bob');
    await rebuy(gameId, 'Bob');
    await rebuy(gameId, 'Cleo');
    app = await harness.restart(app);

    const play = tPlay(gameId);
    expect(play.prizePool.amountText).toBe('EUR 200.00');
    expect(play.prizePool.detail).toBe('6 buy-ins + 4 rebuys');
    expect(play.prizePool.rungs.map((r) => r.amountText)).toEqual(['EUR 140.00', 'EUR 60.00']);
    expect(play.stillIn!.count).toBe(6);
    expect(play.stillIn!.players.find((p) => p.name === 'Bob')!.contributionText).toBe('EUR 80.00 · 3 rebuys');
    // The reserve target is used up; further qualifying rebuys stay allowed.
    expect(rebuyProposal(gameId, 'Bob').popup.reserveNote).toBe('More rebuys are still allowed when another stack is possible.');
    expect(tResults(gameId).status).toMatchObject({ ringText: '0/5', needed: 5 });
    expect(app.play.getGameDetails(gameId)!.payouts!.places.map((p) => p.shareText)).toEqual(['70%', '30%']);
  });

  it('refuses an eliminated player until Back in the game; a rebuy never erases the elimination', async () => {
    const gameId = await tournament();
    const stale = rebuyProposal(gameId, 'Felix').acceptance;
    await out(gameId, 'Felix');
    const refused = {
      status: 'rejected',
      reason: { code: 'eliminated', message: 'Felix is eliminated. To play again, undo the elimination first.' },
    };
    expect(await expectUnchanged(gameId, () => app.play.proposeRebuy(gameId, idOf(gameId, 'Felix')))).toEqual(refused);
    expect(await expectUnchanged(gameId, () => app.play.issueRebuy(gameId, stale))).toEqual(refused);
    expect(tResults(gameId).finishers.map((f) => f.name)).toEqual(['Felix']);

    await backIn(gameId, 'Felix');
    await rebuy(gameId, 'Felix');
    app = await harness.restart(app);
    expect(tResults(gameId).finishers).toEqual([]);
    expect(tPlay(gameId).stillIn!.players.find((p) => p.name === 'Felix')!.contributionText).toBe('EUR 40.00 · 1 rebuy');
    expect(tPlay(gameId).prizePool.amountText).toBe('EUR 140.00');
  });

  it('issues a reduced-coverage rebuy only with explicit acceptance, raising the prize pool', async () => {
    const gameId = await plannedGame(app, 'tournament', {
      players: ['Alice', 'Bob'],
      chips: [
        ['1', '40'],
        ['5', '10'],
        ['25', '10'],
        ['100', '5'],
        ['500', '1'],
      ],
      reserve: '0',
    });
    expectStatus(await app.planning.start(gameId, { depthBb: 100, reserveStacks: 0 }), 'accepted');
    const proposal = await expectUnchanged(gameId, () => rebuyProposal(gameId, 'Alice'));
    expect(proposal.popup).toMatchObject({
      reducedCoverage: { achieved: 3, required: 4 },
      extraFacts: [{ label: 'Prize pool', value: 'EUR 40.00 → EUR 60.00' }],
    });
    const unaccepted = await expectUnchanged(gameId, () =>
      app.play.issueRebuy(gameId, { ...proposal.acceptance, acceptedCoverage: null }),
    );
    expect(unaccepted).toMatchObject({ status: 'rejected', reason: { code: 'reducedCoverageNotAccepted' } });

    expectStatus(await app.play.issueRebuy(gameId, proposal.acceptance), 'accepted');
    app = await harness.restart(app);
    expect(tPlay(gameId).prizePool).toMatchObject({ amountText: 'EUR 60.00', detail: '2 buy-ins + 1 rebuy' });
    expect(app.play.getTournamentPlayer(gameId, idOf(gameId, 'Alice'))!.buyIns[1].coverageText).toBe('3 of 4 coverage');
  });
});

describe('Calculate Payments for a tournament', () => {
  it('is blocked until exactly N − 1 eliminations leave one winner; the winner alone completes nothing', async () => {
    const gameId = await tournament();
    await out(gameId, 'Felix', 'Emma', 'Dan', 'Cleo');
    for (const confirmed of [false, true]) {
      const result = await expectUnchanged(gameId, () => app.play.calculatePayments(gameId, { confirmed }));
      expect(result).toEqual({
        status: 'rejected',
        reason: { code: 'notReady', message: 'Record eliminations until one player is left.' },
      });
    }

    await out(gameId, 'Bob');
    app = await harness.restart(app);
    expect(app.games.get(gameId)!.phase).toBe('inProgress');
    expect(app.games.history()).toEqual([]);
    const asked = await expectUnchanged(gameId, () => app.play.calculatePayments(gameId));
    expect(asked).toEqual({
      status: 'needsConfirmation',
      confirmation: {
        kind: 'calculatePayments',
        readyLine: 'Alice wins · all 5 eliminations recorded',
        facts: [
          { label: 'Prize pool', value: 'EUR 120.00' },
          { label: '1st · Alice', value: 'EUR 84.00' },
          { label: '2nd · Bob', value: 'EUR 36.00' },
        ],
      },
    });
  });

  it('runs the buy-ins-only path from Start to Payments and keeps it across restarts', async () => {
    const gameId = await tournament();
    await out(gameId, 'Felix', 'Emma', 'Dan', 'Cleo', 'Bob');
    expect(await app.play.calculatePayments(gameId, { confirmed: true })).toEqual({
      status: 'accepted',
      location: { kind: 'payments', gameId },
    });
    app = await harness.restart(app);

    expect(app.games.get(gameId)).toMatchObject({ phase: 'completed', reopened: false });
    expect(app.location.get()).toEqual({ kind: 'payments', gameId });
    const payments = app.play.getPayments(gameId)!;
    expect(payments.mode).toBe('tournament');
    expect(balances(payments)).toEqual([
      'Alice | 1st | Payout EUR 84.00 | Buy-ins EUR 20.00 | +EUR 64.00 | gain',
      'Bob | 2nd | Payout EUR 36.00 | Buy-ins EUR 20.00 | +EUR 16.00 | gain',
      'Cleo | 3rd | No payout | Buy-ins EUR 20.00 | −EUR 20.00 | loss',
      'Dan | 4th | No payout | Buy-ins EUR 20.00 | −EUR 20.00 | loss',
      'Emma | 5th | No payout | Buy-ins EUR 20.00 | −EUR 20.00 | loss',
      'Felix | 6th | No payout | Buy-ins EUR 20.00 | −EUR 20.00 | loss',
    ]);
    expect(payments.balances.map((b) => b.placeHighlight)).toEqual([true, false, false, false, false, false]);
    expect(payments.summary).toMatchObject({ kind: 'payments', countText: '5 payments', totalText: 'EUR 80.00 in total' });
    expectPaymentsSettleBalances(payments);

    expect(app.games.history()).toEqual([
      {
        gameId,
        mode: 'tournament',
        participantNames: SIX,
        createdAt: expect.any(String),
        finishedAt: payments.finishedAt,
        facts: [{ label: 'Prize pool', value: 'EUR 120.00' }, { value: '5 payments' }, { label: 'Winner', value: 'Alice' }],
      },
    ]);
  });

  it('allocates EUR 20.01 at 50 / 30 / 20 as EUR 10.01, 6.00 and 4.00', async () => {
    const gameId = await tournament(['Alice', 'Bob', 'Cleo'], { buyIn: '6.67', preset: 'top3' });
    await out(gameId, 'Cleo', 'Bob');
    const asked = expectStatus(await app.play.calculatePayments(gameId), 'needsConfirmation');
    expect(asked.confirmation.facts).toEqual([
      { label: 'Prize pool', value: 'EUR 20.01' },
      { label: '1st · Alice', value: 'EUR 10.01' },
      { label: '2nd · Bob', value: 'EUR 6.00' },
      { label: '3rd · Cleo', value: 'EUR 4.00' },
    ]);
    await calculate(gameId);
    app = await harness.restart(app);
    expect(balances(app.play.getPayments(gameId))).toEqual([
      'Alice | 1st | Payout EUR 10.01 | Buy-ins EUR 6.67 | +EUR 3.34 | gain',
      'Bob | 2nd | Payout EUR 6.00 | Buy-ins EUR 6.67 | −EUR 0.67 | loss',
      'Cleo | 3rd | Payout EUR 4.00 | Buy-ins EUR 6.67 | −EUR 2.67 | loss',
    ]);
    expectPaymentsSettleBalances(app.play.getPayments(gameId)!);
  });

  it('gives leftover cents from 1st place down, not by largest remainder as in cash games', async () => {
    // EUR 15.03 at 50 / 30 / 20: exact 7.515 / 4.509 / 3.006. Largest remainder would give
    // 7.51 / 4.51 / 3.01; floors then leftover cents from 1st place give 7.52 / 4.51 / 3.00.
    const gameId = await tournament(['Alice', 'Bob', 'Cleo'], { buyIn: '5.01', preset: 'top3' });
    await out(gameId, 'Alice', 'Bob');
    await calculate(gameId);
    expect(balances(app.play.getPayments(gameId))).toEqual([
      'Alice | 3rd | Payout EUR 3.00 | Buy-ins EUR 5.01 | −EUR 2.01 | loss',
      'Bob | 2nd | Payout EUR 4.51 | Buy-ins EUR 5.01 | −EUR 0.50 | loss',
      'Cleo | 1st | Payout EUR 7.52 | Buy-ins EUR 5.01 | +EUR 2.51 | gain',
    ]);
  });

  it('conserves every cent of buy-ins, late entries and rebuys; the winner may be a late arrival', async () => {
    // 9 × EUR 20.01 = EUR 180.09 at 70 / 30: 126.063 / 54.027 → 126.06 + 1 leftover cent / 54.02.
    const gameId = await tournament(SIX, { buyIn: '20.01' });
    await rebuy(gameId, 'Bob');
    await lateEntry(gameId, await savedPlayer('Nora'));
    await rebuy(gameId, 'Bob');
    await out(gameId, 'Felix', 'Emma', 'Dan', 'Cleo', 'Bob', 'Alice');
    await calculate(gameId);
    app = await harness.restart(app);
    const payments = app.play.getPayments(gameId)!;
    expect(balances(payments)).toEqual([
      'Alice | 2nd | Payout EUR 54.02 | Buy-ins EUR 20.01 | +EUR 34.01 | gain',
      'Bob | 3rd | No payout | Buy-ins EUR 60.03 | −EUR 60.03 | loss',
      'Cleo | 4th | No payout | Buy-ins EUR 20.01 | −EUR 20.01 | loss',
      'Dan | 5th | No payout | Buy-ins EUR 20.01 | −EUR 20.01 | loss',
      'Emma | 6th | No payout | Buy-ins EUR 20.01 | −EUR 20.01 | loss',
      'Felix | 7th | No payout | Buy-ins EUR 20.01 | −EUR 20.01 | loss',
      'Nora | 1st | Payout EUR 126.07 | Buy-ins EUR 20.01 | +EUR 106.06 | gain',
    ]);
    expectPaymentsSettleBalances(payments);
    expect(app.games.history()[0].facts).toEqual([
      { label: 'Prize pool', value: 'EUR 180.09' },
      { value: payments.summary.kind === 'payments' ? payments.summary.countText : '' },
      { label: 'Winner', value: 'Nora' },
    ]);
  });

  it('completes with no payments when every payout equals the contributions', async () => {
    const gameId = await plannedGame(app, 'tournament', { players: ['Alice', 'Bob'], chips: CHIPS });
    expectStatus(await app.planning.choosePayoutPreset(gameId, 'top2'), 'accepted');
    for (const place of app.planning.getView(gameId)!.payoutSchedule.places) {
      await app.planning.setPayoutShareText(gameId, place.id, '50');
    }
    await startPlannedGame(app, gameId);
    await out(gameId, 'Bob');
    await calculate(gameId);
    app = await harness.restart(app);
    const payments = app.play.getPayments(gameId)!;
    expect(payments.summary).toEqual({ kind: 'noPayments' });
    expect(balances(payments)).toEqual([
      'Alice | 1st | Payout EUR 20.00 | Buy-ins EUR 20.00 | EUR 0.00 | even',
      'Bob | 2nd | Payout EUR 20.00 | Buy-ins EUR 20.00 | EUR 0.00 | even',
    ]);
    expect(app.games.history()[0].facts).toEqual([
      { label: 'Prize pool', value: 'EUR 40.00' },
      { value: 'No payments needed' },
      { label: 'Winner', value: 'Alice' },
    ]);
  });
});

describe('a Completed tournament', () => {
  async function completedTournament() {
    const gameId = await tournament();
    await rebuy(gameId, 'Bob');
    await lateEntry(gameId, await savedPlayer('Nora'));
    await out(gameId, 'Felix', 'Emma', 'Nora', 'Dan', 'Cleo', 'Bob');
    await calculate(gameId);
    return gameId;
  }

  it('shows read-only Results and player pages, and no Play', async () => {
    const gameId = await completedTournament();
    app = await harness.restart(app);
    expect(app.play.getTournamentPlay(gameId)).toBeNull();
    expect(app.play.getBankReserve(gameId)).toBeNull();
    expect(app.play.getAddPlayer(gameId)).toBeNull();
    expect(app.play.startOrderDraft(gameId)).toBeNull();

    const results = tResults(gameId);
    expect(results).toMatchObject({
      phase: 'completed',
      status: { kind: 'winner', title: 'Alice wins', description: 'All 6 eliminations recorded · 7 players' },
      openPlaces: null,
      canEditOrder: false,
      calculate: { kind: 'readOnly' },
      reopened: false,
    });
    expect(results.finishers.map((f) => [f.placeLabel, f.name, f.payoutText])).toEqual([
      ['1st', 'Alice', 'EUR 112.00'],
      ['2nd', 'Bob', 'EUR 48.00'],
      ['3rd', 'Cleo', 'No payout'],
      ['4th', 'Dan', 'No payout'],
      ['5th', 'Nora', 'No payout'],
      ['6th', 'Emma', 'No payout'],
      ['7th', 'Felix', 'No payout'],
    ]);

    const bob = app.play.getTournamentPlayer(gameId, idOf2(gameId, 'Bob'))!;
    expect(bob).toMatchObject({
      phase: 'completed',
      status: 'out',
      backIn: null,
      buyInsTotalText: 'EUR 40.00',
      result: { placeLabel: '2nd', payoutText: 'EUR 48.00', balanceText: '+EUR 8.00', direction: 'gain' },
    });
    expect(app.play.getTournamentPlayer(gameId, idOf2(gameId, 'Alice'))).toMatchObject({ phase: 'completed', status: 'winner' });
  });

  it('rejects every tournament play operation, changing nothing', async () => {
    const gameId = await completedTournament();
    const id = (name: string) => idOf2(gameId, name);
    const ids = app.play.getPayments(gameId)!.balances.map((b) => b.participantId);
    const order = [id('Felix'), id('Emma'), id('Nora'), id('Dan'), id('Cleo'), id('Bob')];
    const draft: OrderDraft = { gameId, savedOrder: order, roster: ids, order: [...order].reverse(), added: [] };
    const rebuyAcceptance = { participantId: id('Alice'), mix: [15, 2, 3, 1], newTotalCents: 4000, reserveAfter: 0, acceptedCoverage: null };
    const omar = await savedPlayer('Omar');
    const operations: [string, () => unknown][] = [
      ['recordElimination', () => app.play.recordElimination(gameId, id('Alice'))],
      ['recordSameHand', () => app.play.recordSameHand(gameId, { bestFirst: [id('Alice'), id('Bob')], stillIn: [id('Alice')] })],
      ['saveOrder', () => app.play.saveOrder(draft)],
      ['backInTheGame', () => app.play.backInTheGame(gameId, id('Bob'), { confirmed: true })],
      ['backInTheGame (ask)', () => app.play.backInTheGame(gameId, id('Bob'))],
      ['proposeRebuy', () => app.play.proposeRebuy(gameId, id('Alice'))],
      ['issueRebuy', () => app.play.issueRebuy(gameId, rebuyAcceptance)],
      ['proposeEntry', () => app.play.proposeEntry(gameId, omar)],
      ['addLatePlayer', () => app.play.addLatePlayer(gameId, { savedPlayerId: omar, name: 'Omar', mix: [15, 2, 3, 1], reserveAfter: 0 })],
      ['returnToPlanning', () => app.play.returnToPlanning(gameId, { confirmed: true })],
      ['calculatePayments', () => app.play.calculatePayments(gameId, { confirmed: true })],
    ];
    for (const [name, operation] of operations) {
      const result = await expectUnchanged(gameId, () => operation());
      expect([name, result]).toEqual([name, { status: 'rejected', reason: expect.objectContaining({ code: 'gameCompleted' }) }]);
    }
  });

  it('reopens on Results with every record kept; recalculating unchanged gives identical Payments', async () => {
    const gameId = await completedTournament();
    const payments = app.play.getPayments(gameId)!;
    const resultsBefore = tResults(gameId);

    const asked = await expectUnchanged(gameId, () => app.play.reopen(gameId));
    expect(asked).toEqual({ status: 'needsConfirmation', confirmation: { kind: 'reopen', mode: 'tournament' } });
    expect(await app.play.reopen(gameId, { confirmed: true })).toEqual({
      status: 'accepted',
      location: { kind: 'results', gameId },
    });
    app = await harness.restart(app);

    expect(app.games.get(gameId)).toMatchObject({ phase: 'inProgress', reopened: true, finishedAt: null });
    expect(app.location.get()).toEqual({ kind: 'results', gameId });
    expect(app.play.getPayments(gameId)).toBeNull();
    expect(app.games.history()).toEqual([]);
    expect(app.play.getGameDetails(gameId)).toMatchObject({ phase: 'inProgress', finishedAt: null });
    expect(tResults(gameId)).toEqual({
      ...resultsBefore,
      phase: 'inProgress',
      canEditOrder: true,
      calculate: { kind: 'ready' },
      reopened: true,
    });
    expect(tPlay(gameId)).toMatchObject({ winner: { name: 'Alice' }, prizePool: { amountText: 'EUR 160.00' } });
    // Reopening does not unlock setup.
    expect(app.planning.getView(gameId)).toBeNull();

    await calculate(gameId);
    app = await harness.restart(app);
    expect({ ...app.play.getPayments(gameId)!, finishedAt: '' }).toEqual({ ...payments, finishedAt: '' });
    expect(tResults(gameId).reopened).toBe(false);
    expect(app.games.get(gameId)!.reopened).toBe(false);
  });

  it('updates its results from corrected records after a reopen', async () => {
    const gameId = await completedTournament();
    expectStatus(await app.play.reopen(gameId, { confirmed: true }), 'accepted');
    await backIn(gameId, 'Bob');
    expect(await app.play.calculatePayments(gameId)).toMatchObject({ status: 'rejected', reason: { code: 'notReady' } });
    await out(gameId, 'Alice');
    await calculate(gameId);
    expect(app.play.getPayments(gameId)!.balances.find((b) => b.name === 'Bob')).toMatchObject({
      placeLabel: '1st',
      lines: ['Payout EUR 112.00', 'Buy-ins EUR 40.00'],
      balanceText: '+EUR 72.00',
    });
  });

  it('restores its working locations like a cash game', async () => {
    const gameId = await completedTournament();
    expect(app.location.get()).toEqual({ kind: 'payments', gameId });
    expectStatus(await app.location.set({ kind: 'results', gameId, from: 'history' }), 'accepted');
    expect(await app.location.set({ kind: 'play', gameId })).toMatchObject({ status: 'rejected', reason: { code: 'wrongPhase' } });
    app = await harness.restart(app);
    expect(app.location.get()).toEqual({ kind: 'results', gameId, from: 'history' });
    expectStatus(await app.location.set({ kind: 'details', gameId }), 'accepted');
    app = await harness.restart(app);
    expect(app.location.get()).toEqual({ kind: 'details', gameId });

    expectStatus(await app.location.set({ kind: 'payments', gameId, from: 'history' }), 'accepted');
    expectStatus(await app.play.reopen(gameId, { confirmed: true }), 'accepted');
    expectStatus(await app.location.set({ kind: 'payments', gameId, from: 'history' }), 'rejected');
    app = await harness.restart(app);
    expect(app.location.get()).toEqual({ kind: 'results', gameId });
  });
});

/** Participant ids from the Payments of a Completed game (Play's view is gone then). */
function idOf2(gameId: string, name: string): string {
  const view = app.play.getView(gameId);
  if (view) return view.players.find((p) => p.name === name)!.id;
  return app.play.getPayments(gameId)!.balances.find((b) => b.name === name)!.participantId;
}

describe('History and Game details with both modes', () => {
  /** Alice and Bob in a cash game, counted at EUR 30 / EUR 10, completed. */
  async function completedCashGame() {
    const gameId = await plannedGame(app, 'cash', {
      players: ['Alice', 'Bob'],
      chips: CHIPS,
      colors: ['white', 'red', 'blue', 'black'],
    });
    const ids = await startPlannedGame(app, gameId);
    await recordCount(app, gameId, ids[0], [30, 4, 6, 1]);
    await recordCount(app, gameId, ids[1], [0, 0, 0, 1]);
    await calculate(gameId);
    return gameId;
  }

  async function completedHeadsUp() {
    const gameId = await tournament(['Cleo', 'Dan']);
    await out(gameId, 'Dan');
    await calculate(gameId);
    return gameId;
  }

  it('lists cash games and tournaments together, most recently finished first', async () => {
    const cash = await completedCashGame();
    const heads = await completedHeadsUp();
    app = await harness.restart(app);
    expect(app.games.history().map((h) => [h.mode, h.participantNames.join(', '), h.facts])).toEqual([
      ['tournament', 'Cleo, Dan', [{ label: 'Prize pool', value: 'EUR 40.00' }, { value: '1 payment' }, { label: 'Winner', value: 'Cleo' }]],
      [
        'cash',
        'Alice, Bob',
        [{ label: 'Buy-ins', value: 'EUR 40.00' }, { value: '1 payment' }, { label: 'Top', value: 'Alice +EUR 10.00' }],
      ],
    ]);

    expectStatus(await app.play.reopen(cash, { confirmed: true }), 'accepted');
    expect(app.games.history().map((h) => h.gameId)).toEqual([heads]);
    await calculate(cash);
    expect(app.games.history().map((h) => h.gameId)).toEqual([cash, heads]);
  });

  it('shows Completed Game details for both modes: the locked facts, created and finished times', async () => {
    const cash = await completedCashGame();
    const heads = await completedHeadsUp();
    app = await harness.restart(app);

    const cashDetails = app.play.getGameDetails(cash)!;
    expect(cashDetails).toMatchObject({
      mode: 'cash',
      phase: 'completed',
      createdAt: app.games.get(cash)!.createdAt,
      finishedAt: app.play.getPayments(cash)!.finishedAt,
      buyInText: 'EUR 20.00',
      chipValueText: 'EUR 0.10 per chip unit',
      blindsText: '1 / 2 chip units',
      payouts: null,
      players: [
        { name: 'Alice', note: null },
        { name: 'Bob', note: null },
      ],
    });
    expect(cashDetails.startingStack.unitsText).toBe('200');

    const tournamentDetails = app.play.getGameDetails(heads)!;
    expect(tournamentDetails).toMatchObject({
      mode: 'tournament',
      phase: 'completed',
      finishedAt: app.play.getPayments(heads)!.finishedAt,
      chipValueText: 'No chip money value',
      payouts: {
        name: 'Winner takes all',
        places: [{ id: 'place-1', placeLabel: '1st', shareText: '100%', amountText: 'EUR 40.00' }],
        note: 'Prize pool EUR 40.00 · 2 buy-ins. Rebuys raise every prize; the percentages stay.',
      },
    });
    expect(app.play.getGameDetails(heads)).toBe(tournamentDetails);
  });
});
