import type { CashResultsView, GameManagement } from '@/game-management';

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
/** 1 White ×200, 5 Red ×150, 25 Blue ×100, 100 Black ×50. Every stack: [15, 2, 3, 1] = 200 units. */
const SETUP: PlanSetup = {
  players: NAMES,
  chips: [
    ['1', '200'],
    ['5', '150'],
    ['25', '100'],
    ['100', '50'],
  ],
  colors: ['white', 'red', 'blue', 'black'],
};
const ACCEPT = { depthBb: 100, reserveStacks: 3 };
const STACK = [15, 2, 3, 1];

async function startedGame(setup: PlanSetup = SETUP) {
  const gameId = await plannedGame(app, 'cash', setup);
  expectStatus(await app.planning.start(gameId, ACCEPT), 'accepted');
  const ids = app.play.getView(gameId)!.players.map((p) => p.id);
  return { gameId, ids };
}

const counts = (mix: readonly { count: number }[]) => mix.map((c) => c.count);
const bank = (gameId: string) => counts(app.play.getView(gameId)!.bank.mix);
const results = (gameId: string): CashResultsView => app.play.getResults(gameId)!;
const texts = (gameId: string, id: string) => app.play.getCountEditor(gameId, id)!.entries.map((e) => e.quantityText);

/** Everything observable about the game, including every participant's editor and player page. */
function observeResults(gameId: string, ids: readonly string[]) {
  return {
    ...observe(app, gameId),
    results: app.play.getResults(gameId),
    editors: ids.map((id) => app.play.getCountEditor(gameId, id, { showErrors: true })),
    players: ids.map((id) => app.play.getCashPlayer(gameId, id)),
  };
}

/** Fails unless nothing observable changed, now and after a restart. */
async function expectUnchanged<R extends { status: string }>(gameId: string, ids: readonly string[], run: () => Promise<R> | R) {
  const before = observeResults(gameId, ids);
  const result = await run();
  expect(observeResults(gameId, ids)).toEqual(before);
  app = await harness.restart(app);
  expect(observeResults(gameId, ids)).toEqual(before);
  return result;
}

async function typeCount(gameId: string, id: string, quantities: readonly string[]) {
  const values = [1, 5, 25, 100];
  for (const [i, text] of quantities.entries()) {
    expectStatus(await app.play.setCountText(gameId, id, values[i], text), 'accepted');
  }
}

/** Types, reviews and confirms a complete count. */
async function confirmCount(gameId: string, id: string, quantities: readonly number[]) {
  await typeCount(gameId, id, quantities.map(String));
  const review = expectStatus(app.play.reviewCount(gameId, id), 'needsConfirmation');
  expectStatus(await app.play.confirmResult(gameId, id, { counts: counts(review.confirmation.mix) }), 'accepted');
}

describe('count drafts', () => {
  it('keeps the raw text exactly, moves no chips and survives a restart', async () => {
    const { gameId, ids } = await startedGame();
    const alice = ids[0];
    const bankBefore = bank(gameId);

    await typeCount(gameId, alice, ['12', '', 'x3', ' 007 ']);
    app = await harness.restart(app);

    const editor = app.play.getCountEditor(gameId, alice)!;
    expect(editor).toMatchObject({ playerName: 'Alice', kind: 'count', problem: null, hasDraft: true });
    expect(editor.entries.map(({ value, color, quantityText, state, count }) => [value, color, quantityText, state, count])).toEqual([
      [1, 'white', '12', 'entered', 12],
      [5, 'red', '', 'notEntered', null],
      [25, 'blue', 'x3', 'invalid', null],
      [100, 'black', ' 007 ', 'entered', 7],
    ]);
    expect(editor.entries.every((e) => e.error === undefined)).toBe(true);
    // Partial totals: blanks and invalid text count as nothing; no win / loss until complete.
    expect(editor.totals).toEqual({
      unitsText: '712',
      complete: false,
      chipValueText: 'EUR 71.20',
      contributionsText: 'EUR 20.00',
      winLoss: null,
    });
    expect(bank(gameId)).toEqual(bankBefore);
    expect(results(gameId).players[0]).toMatchObject({ state: 'countDraft', result: null });
    expect(results(gameId).status).toMatchObject({ kind: 'toCount', counted: 0, total: 6 });
    expect(app.play.getCashPlayer(gameId, alice)).toMatchObject({ countDraft: true, result: null });
  });

  it('treats empty as not entered: clearing every quantity makes the player uncounted again', async () => {
    const { gameId, ids } = await startedGame();
    await typeCount(gameId, ids[1], ['3', '0']);
    expect(results(gameId).players[1].state).toBe('countDraft');
    await typeCount(gameId, ids[1], ['', '']);
    expect(results(gameId).players[1].state).toBe('uncounted');
    expect(app.play.getCountEditor(gameId, ids[1])!.hasDraft).toBe(false);
  });

  it('sets only the remaining blanks to zero and discards a draft on request', async () => {
    const { gameId, ids } = await startedGame();
    await typeCount(gameId, ids[0], ['12', '', 'x3', '']);
    expectStatus(await app.play.setRemainingCountToZero(gameId, ids[0]), 'accepted');
    expect(texts(gameId, ids[0])).toEqual(['12', '0', 'x3', '0']);

    expectStatus(await app.play.discardCountDraft(gameId, ids[0]), 'accepted');
    app = await harness.restart(app);
    expect(texts(gameId, ids[0])).toEqual(['', '', '', '']);
    expect(results(gameId).players[0].state).toBe('uncounted');
  });

  it('keeps one draft per participant', async () => {
    const { gameId, ids } = await startedGame();
    await typeCount(gameId, ids[0], ['1']);
    await typeCount(gameId, ids[2], ['2']);
    await typeCount(gameId, ids[0], ['3']);
    app = await harness.restart(app);
    expect(texts(gameId, ids[0])).toEqual(['3', '', '', '']);
    expect(texts(gameId, ids[2])).toEqual(['2', '', '', '']);
    expect(results(gameId).players.map((p) => p.state)).toEqual(['countDraft', 'uncounted', 'countDraft', 'uncounted', 'uncounted', 'uncounted']);
  });

  it('rejects edits for unknown games, players and chips without changing anything', async () => {
    const { gameId, ids } = await startedGame();
    await typeCount(gameId, ids[0], ['5']);
    const missingGame = await expectUnchanged(gameId, ids, () => app.play.setCountText('nope', ids[0], 1, '1'));
    expect(missingGame).toMatchObject({ status: 'rejected', reason: { code: 'gameNotFound' } });
    const missingPlayer = await expectUnchanged(gameId, ids, () => app.play.setCountText(gameId, 'nobody', 1, '1'));
    expect(missingPlayer).toMatchObject({ status: 'rejected', reason: { code: 'participantNotFound' } });
    const missingChip = await expectUnchanged(gameId, ids, () => app.play.setCountText(gameId, ids[0], 2, '1'));
    expect(missingChip).toMatchObject({ status: 'rejected', reason: { code: 'denominationNotFound' } });
  });

  it('is for In progress cash games only', async () => {
    const planned = await plannedGame(app, 'cash', SETUP);
    const participant = app.planning.getView(planned)!.players.participants[0].id;
    expect(await app.play.setCountText(planned, participant, 1, '1')).toMatchObject({ reason: { code: 'notInProgress' } });
    expect(app.play.getResults(planned)).toBeNull();
    expect(app.play.getCountEditor(planned, participant)).toBeNull();

    const tournament = await plannedGame(app, 'tournament', SETUP);
    expectStatus(await app.planning.start(tournament, ACCEPT), 'accepted');
    const player = app.play.getView(tournament)!.players[0].id;
    expect(await app.play.setCountText(tournament, player, 1, '1')).toMatchObject({ reason: { code: 'notCashGame' } });
    expect(app.play.getResults(tournament)).toBeNull();
    expect(app.play.getCashPlayer(tournament, player)).toBeNull();
  });
});

describe('review', () => {
  it('names the first denomination to correct and marks every missing or invalid quantity, changing nothing', async () => {
    const { gameId, ids } = await startedGame();
    await typeCount(gameId, ids[2], ['12', '', 'x3', '99999999']);
    const review = await expectUnchanged(gameId, ids, () => app.play.reviewCount(gameId, ids[2]));
    expect(review).toEqual({
      status: 'needsCorrection',
      firstDenominationValue: 5,
      problem: { title: 'Count incomplete.', message: 'Your entries are kept. Fix the marked quantities.' },
    });
    const editor = app.play.getCountEditor(gameId, ids[2], { showErrors: true })!;
    expect(editor.problem).toEqual({ title: 'Count incomplete.', message: 'Your entries are kept. Fix the marked quantities.' });
    expect(editor.entries.map((e) => [e.quantityText, e.error])).toEqual([
      ['12', undefined],
      ['', 'Enter a quantity, including zero.'],
      ['x3', 'Use a whole number, digits only.'],
      ['99999999', 'Enter a smaller number.'],
    ]);
  });

  it('reviews an untouched player as missing every quantity without creating a draft', async () => {
    const { gameId, ids } = await startedGame();
    const review = await expectUnchanged(gameId, ids, () => app.play.reviewCount(gameId, ids[3]));
    expect(review).toMatchObject({ status: 'needsCorrection', firstDenominationValue: 1 });
    expect(results(gameId).players[3].state).toBe('uncounted');
  });

  it('shows the confirmation with the counted mix, units, exact chip value, contributions and win / loss', async () => {
    const { gameId, ids } = await startedGame();
    await typeCount(gameId, ids[2], ['15', '2', '5', '1']);
    const review = await expectUnchanged(gameId, ids, () => app.play.reviewCount(gameId, ids[2]));
    expect(review).toEqual({
      status: 'needsConfirmation',
      confirmation: {
        kind: 'confirm',
        playerName: 'Cleo',
        mix: [
          { value: 1, color: 'white', count: 15 },
          { value: 5, color: 'red', count: 2 },
          { value: 25, color: 'blue', count: 5 },
          { value: 100, color: 'black', count: 1 },
        ],
        unitsText: '250',
        chipValueText: 'EUR 25.00',
        contributionsText: 'EUR 20.00',
        winLossText: '+EUR 5.00',
        zeroChips: false,
      },
    });
    expect(app.play.getCountEditor(gameId, ids[2])!.totals.winLoss).toEqual({ amountText: '+EUR 5.00', direction: 'gain' });
  });

  it('blocks a count that returns more chips of a denomination than the table has out', async () => {
    const { gameId, ids } = await startedGame();
    // 6 × 15 White chips are out; 91 is one more than the whole table has.
    await typeCount(gameId, ids[5], ['91', '0', '0', '0']);
    const review = await expectUnchanged(gameId, ids, () => app.play.reviewCount(gameId, ids[5]));
    expect(review).toEqual({
      status: 'blocked',
      blocked: {
        title: 'More chips than the game has',
        chips: [{ value: 1, color: 'white', deltaText: '+1' }],
        message: 'That’s 1 White chip more than the game has. Check the quantities you entered.',
      },
    });
    // The draft is kept as typed.
    expect(texts(gameId, ids[5])).toEqual(['91', '0', '0', '0']);
  });

  it('names every denomination over the table and blocks confirming it too', async () => {
    const { gameId, ids } = await startedGame();
    await typeCount(gameId, ids[5], ['92', '13', '0', '7']);
    const review = app.play.reviewCount(gameId, ids[5]);
    expect(review).toMatchObject({
      status: 'blocked',
      blocked: {
        chips: [
          { value: 1, deltaText: '+2' },
          { value: 5, deltaText: '+1' },
          { value: 100, deltaText: '+1' },
        ],
        message: 'That’s 2 White chips and 1 Red chip and 1 Black chip more than the game has. Check the quantities you entered.',
      },
    });
    const confirm = await expectUnchanged(gameId, ids, () => app.play.confirmResult(gameId, ids[5], { counts: [92, 13, 0, 7] }));
    expect(confirm.status).toBe('blocked');
  });

  it('accepts table winnings beyond the player’s own stack while the table has the chips out', async () => {
    const { gameId, ids } = await startedGame();
    // Alice won most of the table's White and Black chips: 90 White, 6 Black = 690 units.
    await typeCount(gameId, ids[0], ['90', '0', '0', '6']);
    const review = expectStatus(app.play.reviewCount(gameId, ids[0]), 'needsConfirmation');
    expect(review.confirmation).toMatchObject({ unitsText: '690', chipValueText: 'EUR 69.00', winLossText: '+EUR 49.00' });
  });
});

describe('confirm', () => {
  it('records one result, removes the draft and returns exactly the counted mix to the bank in one commit', async () => {
    const { gameId, ids } = await startedGame();
    const bankBefore = bank(gameId);
    const reserveBefore = app.play.getView(gameId)!.reserve;
    await typeCount(gameId, ids[0], ['15', '2', '5', '1']);
    const review = expectStatus(app.play.reviewCount(gameId, ids[0]), 'needsConfirmation');
    expect(bank(gameId)).toEqual(bankBefore);

    expectStatus(await app.play.confirmResult(gameId, ids[0], { counts: counts(review.confirmation.mix) }), 'accepted');
    app = await harness.restart(app);

    expect(bank(gameId)).toEqual([bankBefore[0] + 15, bankBefore[1] + 2, bankBefore[2] + 5, bankBefore[3] + 1]);
    const view = app.play.getView(gameId)!;
    // Returning chips does not replenish the started reserve target or its consumption.
    expect(view.reserve.startedTarget).toBe(reserveBefore.startedTarget);
    expect(view.reserve.consumed).toBe(reserveBefore.consumed);
    expect(view.reserve.unconsumed).toBe(reserveBefore.unconsumed);
    // Contributions are untouched; the game stays In progress.
    expect(view.totals.contributions.text).toBe('EUR 120.00');
    expect(app.games.get(gameId)!.phase).toBe('inProgress');

    expect(results(gameId).players[0]).toEqual({
      id: ids[0],
      name: 'Alice',
      contributionText: 'EUR 20.00',
      state: 'result',
      correctionDraft: false,
      result: { amountText: '+EUR 5.00', direction: 'gain' },
    });
    expect(app.play.getCountEditor(gameId, ids[0])).toBeNull();
    expect(app.play.getCashPlayer(gameId, ids[0])).toMatchObject({
      result: {
        winLoss: { amountText: '+EUR 5.00', direction: 'gain' },
        chipValueText: 'EUR 25.00',
        contributionsText: '−EUR 20.00',
        unitsText: '250',
        finalChips: [
          { value: 1, color: 'white', count: 15 },
          { value: 5, color: 'red', count: 2 },
          { value: 25, color: 'blue', count: 5 },
          { value: 100, color: 'black', count: 1 },
        ],
        correctionDraft: false,
      },
      countDraft: false,
      actions: { countFinalChips: false },
    });
  });

  it('confirms a result only once', async () => {
    const { gameId, ids } = await startedGame();
    await confirmCount(gameId, ids[0], [15, 2, 5, 1]);
    const again = await expectUnchanged(gameId, ids, () => app.play.confirmResult(gameId, ids[0], { counts: [15, 2, 5, 1] }));
    expect(again).toMatchObject({ status: 'rejected', reason: { code: 'resultExists', message: 'Alice’s result is already confirmed.' } });
    const edit = await expectUnchanged(gameId, ids, () => app.play.setCountText(gameId, ids[0], 1, '3'));
    expect(edit).toMatchObject({ reason: { code: 'resultExists' } });
    const review = await expectUnchanged(gameId, ids, () => app.play.reviewCount(gameId, ids[0]));
    expect(review).toMatchObject({ reason: { code: 'resultExists' } });
  });

  it('is rejected when the draft changed after the review', async () => {
    const { gameId, ids } = await startedGame();
    await typeCount(gameId, ids[1], ['15', '2', '3', '1']);
    const review = expectStatus(app.play.reviewCount(gameId, ids[1]), 'needsConfirmation');
    await typeCount(gameId, ids[1], ['16']);
    const result = await expectUnchanged(gameId, ids, () =>
      app.play.confirmResult(gameId, ids[1], { counts: counts(review.confirmation.mix) }),
    );
    expect(result).toMatchObject({ status: 'rejected', reason: { code: 'countChanged', message: 'The count changed. Review it again.' } });
    expect(texts(gameId, ids[1])).toEqual(['16', '2', '3', '1']);
  });

  it('is rejected for an incomplete count', async () => {
    const { gameId, ids } = await startedGame();
    await typeCount(gameId, ids[1], ['15', '2', '', '1']);
    const result = await expectUnchanged(gameId, ids, () => app.play.confirmResult(gameId, ids[1], { counts: [15, 2, 0, 1] }));
    expect(result).toMatchObject({ reason: { code: 'countIncomplete' } });
  });

  it('records an explicit zero result, which is not an uncounted player', async () => {
    const { gameId, ids } = await startedGame();
    const bankBefore = bank(gameId);
    expectStatus(await app.play.setRemainingCountToZero(gameId, ids[4]), 'accepted');
    const review = expectStatus(app.play.reviewCount(gameId, ids[4]), 'needsConfirmation');
    expect(review.confirmation).toMatchObject({ unitsText: '0', chipValueText: 'EUR 0.00', winLossText: '−EUR 20.00', zeroChips: true });
    expectStatus(await app.play.confirmResult(gameId, ids[4], { counts: [0, 0, 0, 0] }), 'accepted');
    app = await harness.restart(app);
    expect(bank(gameId)).toEqual(bankBefore);
    expect(results(gameId).players[4]).toMatchObject({ state: 'result', result: { amountText: '−EUR 20.00', direction: 'loss' } });
    expect(results(gameId).players[3]).toMatchObject({ state: 'uncounted', result: null });
    expect(results(gameId).status).toMatchObject({ kind: 'toCount', title: '5 still to count', counted: 1 });
  });

  it('lets early leavers return chips that later results can no longer claim', async () => {
    const { gameId, ids } = await startedGame();
    // Alice leaves early with 60 of the 90 White chips out at the table.
    await confirmCount(gameId, ids[0], [60, 0, 0, 0]);
    // Only 30 White chips are still out.
    await typeCount(gameId, ids[1], ['31', '0', '0', '0']);
    expect(app.play.reviewCount(gameId, ids[1])).toMatchObject({
      status: 'blocked',
      blocked: { message: 'That’s 1 White chip more than the game has. Check the quantities you entered.' },
    });
    await typeCount(gameId, ids[1], ['30']);
    expectStatus(app.play.reviewCount(gameId, ids[1]), 'needsConfirmation');
  });
});

describe('accounting status', () => {
  it('names who is still to count, in joining order; drafts never count', async () => {
    const { gameId, ids } = await startedGame();
    expect(results(gameId).status).toEqual({
      kind: 'toCount',
      title: '6 still to count',
      namesText: 'Alice, Bob, Cleo, Dan, Emma, Felix',
      counted: 0,
      total: 6,
    });
    await confirmCount(gameId, ids[0], [15, 2, 5, 1]);
    await typeCount(gameId, ids[2], ['12']);
    const view = results(gameId);
    expect(view.status).toEqual({
      kind: 'toCount',
      title: '5 still to count',
      namesText: 'Bob, Cleo, Dan, Emma, Felix',
      counted: 1,
      total: 6,
    });
    expect(view.accounting).toEqual({ counted: 1, total: 6, countedUnits: 250, issuedUnits: 1200, difference: null });
    expect(view.calculatePayments).toEqual({ available: false, reason: 'Count everyone first.' });
    expect(view.players.map((p) => p.state)).toEqual(['result', 'uncounted', 'countDraft', 'uncounted', 'uncounted', 'uncounted']);
  });

  it('reports the exact shortage once everyone is counted, without rewriting any count', async () => {
    const { gameId, ids } = await startedGame();
    for (const id of ids.slice(0, 5)) await confirmCount(gameId, id, STACK);
    // Felix is one White chip short.
    await confirmCount(gameId, ids[5], [14, 2, 3, 1]);
    app = await harness.restart(app);
    const view = results(gameId);
    expect(view.status).toEqual({
      kind: 'missing',
      title: '1 chip unit missing',
      description: 'EUR 0.10 · 1,199 of 1,200 counted. Recount, or correct a result.',
    });
    expect(view.accounting).toMatchObject({ countedUnits: 1199, issuedUnits: 1200, difference: -1 });
    expect(view.calculatePayments).toEqual({ available: false, reason: 'Find the missing chips first.' });
    expect(view.players[5].result).toEqual({ amountText: '−EUR 0.10', direction: 'loss' });
    // The last result does not complete the game.
    expect(app.games.get(gameId)!.phase).toBe('inProgress');
  });

  it('adds up when every count matches cumulative issuance', async () => {
    const { gameId, ids } = await startedGame();
    // Chips changed hands: Alice won 50 units from Bob; everyone else broke even.
    await confirmCount(gameId, ids[0], [15, 2, 5, 1]);
    await confirmCount(gameId, ids[1], [15, 2, 1, 1]);
    for (const id of ids.slice(2)) await confirmCount(gameId, id, STACK);
    app = await harness.restart(app);
    const view = results(gameId);
    expect(view.status).toEqual({ kind: 'addsUp', description: 'All 6 counted · 1,200 chip units' });
    expect(view.calculatePayments).toEqual({ available: true, reason: null });
    expect(view.players.map((p) => p.result)).toEqual([
      { amountText: '+EUR 5.00', direction: 'gain' },
      { amountText: '−EUR 5.00', direction: 'loss' },
      ...Array.from({ length: 4 }, () => ({ amountText: 'EUR 0.00', direction: 'even' })),
    ]);
    // Every chip handed out is back in the bank.
    expect(bank(gameId)).toEqual([200, 150, 100, 50]);
    expect(app.games.get(gameId)!.phase).toBe('inProgress');
  });

  it('counts recycled chips: issue → return → reissue → return beyond the chip set’s own quantities', async () => {
    // Exactly two stacks' worth of chips and no reserve: Bob's rebuy can only come from Alice's return.
    const id = await plannedGame(app, 'cash', {
      players: ['Alice', 'Bob'],
      chips: [
        ['1', '30'],
        ['5', '4'],
        ['25', '6'],
        ['100', '2'],
      ],
      reserve: '0',
    });
    expectStatus(await app.planning.start(id, { depthBb: 100, reserveStacks: 0 }), 'accepted');
    const [alice, bob] = app.play.getView(id)!.players.map((p) => p.id);
    expect(bank(id)).toEqual([0, 0, 0, 0]);
    expect(app.play.proposeRebuy(id, bob)).toMatchObject({ status: 'rejected', reason: { code: 'insufficientValue' } });

    // Alice leaves with her own stack; Bob rebuys with exactly those chips.
    const aliceStack = counts(app.play.getCashPlayer(id, alice)!.buyIns[0].mix);
    await confirmCount(id, alice, aliceStack);
    expect(bank(id)).toEqual(aliceStack);
    const proposal = expectStatus(app.play.proposeRebuy(id, bob), 'needsConfirmation');
    expect(proposal.confirmation.acceptance.mix).toEqual(aliceStack);
    expectStatus(await app.play.issueRebuy(id, proposal.confirmation.acceptance), 'accepted');
    expect(bank(id)).toEqual([0, 0, 0, 0]);

    // Bob ends with every chip at the table: more White chips than the set has were issued in total.
    await confirmCount(id, bob, [30, 4, 6, 2]);
    app = await harness.restart(app);
    const view = results(id);
    expect(view.accounting).toEqual({ counted: 2, total: 2, countedUnits: 600, issuedUnits: 600, difference: 0 });
    expect(view.status).toEqual({ kind: 'addsUp', description: 'All 2 counted · 600 chip units' });
    expect(bank(id)).toEqual([30, 4, 6, 2]);
    // The return does not give back the rebuy's reserve consumption.
    expect(app.play.getView(id)!.reserve).toMatchObject({ startedTarget: 0, consumed: 1, unconsumed: 0 });
  });

  it('keeps exact sub-cent amounts while In progress', async () => {
    const { gameId, ids } = await startedGame({ ...SETUP, buyIn: '20.01' });
    await typeCount(gameId, ids[0], ['15', '2', '5', '1']);
    expect(app.play.getCountEditor(gameId, ids[0])!.totals).toEqual({
      unitsText: '250',
      complete: true,
      chipValueText: 'EUR 25.0125',
      contributionsText: 'EUR 20.01',
      winLoss: { amountText: '+EUR 5.0025', direction: 'gain' },
    });
    const review = expectStatus(app.play.reviewCount(gameId, ids[0]), 'needsConfirmation');
    expect(review.confirmation).toMatchObject({ chipValueText: 'EUR 25.0125', winLossText: '+EUR 5.0025' });
    expectStatus(await app.play.confirmResult(gameId, ids[0], { counts: [15, 2, 5, 1] }), 'accepted');
    for (const id of ids.slice(1, 5)) await confirmCount(gameId, id, STACK);
    await confirmCount(gameId, ids[5], [14, 2, 1, 1]);

    const view = results(gameId);
    expect(view.players[0].result).toEqual({ amountText: '+EUR 5.0025', direction: 'gain' });
    expect(view.players[5].result).toEqual({ amountText: '−EUR 5.1026', direction: 'loss' });
    expect(view.status).toEqual({
      kind: 'missing',
      title: '1 chip unit missing',
      description: 'EUR 0.1001 · 1,199 of 1,200 counted. Recount, or correct a result.',
    });
    expect(app.play.getCashPlayer(gameId, ids[0])!.result).toMatchObject({ chipValueText: 'EUR 25.0125', winLoss: { amountText: '+EUR 5.0025' } });
  });
});

describe('player page and Return to Planning', () => {
  it('lists the buy-in with its actual mix and offers Count final chips until a result exists', async () => {
    const { gameId, ids } = await startedGame();
    const page = app.play.getCashPlayer(gameId, ids[1])!;
    expect(page).toMatchObject({
      playerId: ids[1],
      name: 'Bob',
      result: null,
      countDraft: false,
      buyInsTotalText: 'EUR 20.00',
      returnToPlay: null,
      actions: { countFinalChips: true },
    });
    expect(page.buyIns).toEqual([
      {
        id: expect.any(String),
        kind: 'buyIn',
        label: 'Buy-in',
        amountText: 'EUR 20.00',
        mix: [
          { value: 1, color: 'white', count: 15 },
          { value: 5, color: 'red', count: 2 },
          { value: 25, color: 'blue', count: 3 },
          { value: 100, color: 'black', count: 1 },
        ],
        addedLater: false,
        corrected: false,
        coverageText: null,
        undo: null,
      },
    ]);
    expect(app.play.getCashPlayer(gameId, 'nobody')).toBeNull();
  });

  it('counts confirmed results in Return to Planning and clears them with every draft', async () => {
    const { gameId, ids } = await startedGame();
    await confirmCount(gameId, ids[0], [15, 2, 5, 1]);
    await confirmCount(gameId, ids[1], STACK);
    await typeCount(gameId, ids[2], ['4']);
    const ask = expectStatus(await app.play.returnToPlanning(gameId), 'needsConfirmation');
    expect(ask.confirmation.clears).toMatchObject({ results: 2, text: '2 results · all handed-out stacks' });

    expectStatus(await app.play.returnToPlanning(gameId, { confirmed: true }), 'accepted');
    expectStatus(await app.planning.start(gameId, ACCEPT), 'accepted');
    app = await harness.restart(app);
    const view = results(gameId);
    expect(view.players.map((p) => p.state)).toEqual(Array.from({ length: 6 }, () => 'uncounted'));
    expect(bank(gameId)).toEqual([110, 138, 82, 44]);
  });
});
