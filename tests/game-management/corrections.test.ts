import type { GameManagement, MixWarning } from '@/game-management';

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

const NAMES = ['Alice', 'Bob', 'Cleo', 'Dan', 'Emma', 'Felix'];
const COLORS: PlanSetup['colors'] = ['white', 'red', 'blue', 'black', 'green'];

/** 1 White ×200, 5 Red ×150, 25 Blue ×100, 100 Black ×50, 500 Green ×1: a roomy bank with a reserve. */
const ROOMY: PlanSetup = {
  players: NAMES,
  chips: [
    ['1', '200'],
    ['5', '150'],
    ['25', '100'],
    ['100', '50'],
    ['500', '1'],
  ],
  colors: COLORS,
};

/**
 * Only 93 White chips: after six [15, 2, 3, 1, 0] stacks the bank keeps 3, so a rebuy needs White
 * chips somebody returned. That is the Alice / Bob case.
 */
const TIGHT: PlanSetup = {
  players: NAMES,
  chips: [
    ['1', '93'],
    ['5', '24'],
    ['25', '27'],
    ['100', '12'],
    ['500', '1'],
  ],
  colors: COLORS,
  reserve: '0',
};

const STACK = [15, 2, 3, 1, 0];
const counts = (mix: readonly { count: number }[]) => mix.map((c) => c.count);
const texts = (quantities: readonly number[]) => quantities.map(String);
const bank = (gameId: string) => counts(app.play.getView(gameId)!.bank.mix);

async function startedGame(setup: PlanSetup, mode: 'cash' | 'tournament' = 'cash') {
  const gameId = await plannedGame(app, mode, setup);
  const ids = await startPlannedGame(app, gameId);
  expect(counts(app.play.getPlayerBuyIns(gameId, ids[0])!.buyIns[0].mix)).toEqual(STACK);
  return { gameId, ids };
}

/** Proposes and issues an ordinary rebuy (accepting reduced coverage). Returns the issuance id. */
async function rebuy(gameId: string, participantId: string) {
  const proposal = expectStatus(app.play.proposeRebuy(gameId, participantId), 'needsConfirmation');
  return expectStatus(await app.play.issueRebuy(gameId, proposal.confirmation.acceptance), 'accepted').issuanceId;
}

async function typeCorrection(gameId: string, id: string, quantities: readonly number[]) {
  const values = [1, 5, 25, 100, 500];
  for (const [i, count] of quantities.entries()) {
    expectStatus(await app.play.setCorrectionText(gameId, id, values[i], String(count)), 'accepted');
  }
}

/** Everything observable about the game, including every player's page, editors and the fix. */
function observeAll(gameId: string, ids: readonly string[]) {
  return {
    ...observe(app, gameId),
    playScreen: app.play.getPlayScreen(gameId),
    results: app.play.getResults(gameId),
    players: ids.map((id) => app.play.getCashPlayer(gameId, id)),
    buyIns: ids.map((id) => app.play.getPlayerBuyIns(gameId, id)),
    corrections: ids.map((id) => app.play.getCorrectionEditor(gameId, id)),
    fix: app.play.getFix(gameId),
    tournament: app.play.getTournamentPlay(gameId),
    tournamentPlayers: ids.map((id) => app.play.getTournamentPlayer(gameId, id)),
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

describe('replacing a confirmed result', () => {
  it('keeps the result in force while the correction is drafted and replaces the return exactly once', async () => {
    const { gameId, ids } = await startedGame(ROOMY);
    const alice = ids[0];
    await recordCount(app, gameId, alice, [15, 2, 5, 1, 0]);
    const afterResult = bank(gameId);

    // The editor starts from the confirmed counts; nothing is saved until something changes.
    const editor = app.play.getCorrectionEditor(gameId, alice)!;
    expect(editor).toMatchObject({ kind: 'correction', playerName: 'Alice', hasDraft: false });
    expect(editor.entries.map((e) => e.quantityText)).toEqual(['15', '2', '5', '1', '0']);
    expect(app.play.getCashPlayer(gameId, alice)!.result!.correctionDraft).toBe(false);

    await typeCorrection(gameId, alice, [10, 3, 5, 1, 0]);
    app = await harness.restart(app);
    // A correction draft: tagged on Results, Play and the player page; the result is unchanged.
    expect(app.play.getResults(gameId)!.players[0]).toMatchObject({ state: 'result', correctionDraft: true, result: { amountText: '+EUR 5.00' } });
    expect(app.play.getPlayScreen(gameId)!.finished[0]).toMatchObject({ hasCorrectionDraft: true, balanceText: '+EUR 5.00' });
    expect(app.play.getCashPlayer(gameId, alice)!.result).toMatchObject({ correctionDraft: true, unitsText: '250' });
    expect(bank(gameId)).toEqual(afterResult);

    const review = expectStatus(app.play.reviewCorrection(gameId, alice), 'needsConfirmation');
    expect(review.confirmation).toMatchObject({ kind: 'replace', playerName: 'Alice', unitsText: '250', winLossText: '+EUR 5.00' });
    expect(counts(review.confirmation.mix)).toEqual([10, 3, 5, 1, 0]);

    expectStatus(await app.play.replaceResult(gameId, alice, { counts: counts(review.confirmation.mix) }), 'accepted');
    app = await harness.restart(app);
    // The old return (15, 2, 5, 1) is reversed and the new one (10, 3, 5, 1) recorded once.
    expect(bank(gameId)).toEqual([afterResult[0] - 5, afterResult[1] + 1, afterResult[2], afterResult[3], afterResult[4]]);
    expect(counts(app.play.getCashPlayer(gameId, alice)!.result!.finalChips)).toEqual([10, 3, 5, 1, 0]);
    expect(app.play.getCashPlayer(gameId, alice)!.result!.correctionDraft).toBe(false);
    expect(app.play.getResults(gameId)!.accounting.countedUnits).toBe(250);
    // Replacing the same counts again does not add a second return.
    const again = expectStatus(app.play.reviewCorrection(gameId, alice), 'needsConfirmation');
    expectStatus(await app.play.replaceResult(gameId, alice, { counts: counts(again.confirmation.mix) }), 'accepted');
    expect(bank(gameId)).toEqual([afterResult[0] - 5, afterResult[1] + 1, afterResult[2], afterResult[3], afterResult[4]]);
  });

  it('discards a correction draft without touching the result, and rejects a stale or incomplete review', async () => {
    const { gameId, ids } = await startedGame(ROOMY);
    const alice = ids[0];
    await recordCount(app, gameId, alice, STACK);
    await typeCorrection(gameId, alice, [10, 3, 3, 1, 0]);
    const review = expectStatus(app.play.reviewCorrection(gameId, alice), 'needsConfirmation');
    await app.play.setCorrectionText(gameId, alice, 1, '');

    expect(app.play.reviewCorrection(gameId, alice)).toMatchObject({ status: 'needsCorrection', firstDenominationValue: 1 });
    expect(app.play.getCorrectionEditor(gameId, alice, { showErrors: true })!.entries[0].error).toBe('Enter a quantity, including zero.');
    const stale = await expectUnchanged(gameId, ids, () => app.play.replaceResult(gameId, alice, { counts: counts(review.confirmation.mix) }));
    expect(stale).toMatchObject({ status: 'rejected', reason: { code: 'countIncomplete' } });
    await app.play.setCorrectionText(gameId, alice, 1, '9');
    const changed = await expectUnchanged(gameId, ids, () => app.play.replaceResult(gameId, alice, { counts: counts(review.confirmation.mix) }));
    expect(changed).toMatchObject({ status: 'rejected', reason: { code: 'countChanged' } });

    const before = bank(gameId);
    expectStatus(await app.play.discardCorrection(gameId, alice), 'accepted');
    app = await harness.restart(app);
    expect(app.play.getResults(gameId)!.players[0].correctionDraft).toBe(false);
    expect(counts(app.play.getCashPlayer(gameId, alice)!.result!.finalChips)).toEqual(STACK);
    expect(bank(gameId)).toEqual(before);
  });

  it('blocks a correction returning more chips than the game has; nothing is saved', async () => {
    const { gameId, ids } = await startedGame(ROOMY);
    await recordCount(app, gameId, ids[0], STACK);
    // Every other player still holds a stack, so 6 × 15 White chips are out at the table.
    await typeCorrection(gameId, ids[0], [91, 2, 3, 1, 0]);
    const review = await expectUnchanged(gameId, ids, () => app.play.reviewCorrection(gameId, ids[0]));
    expect(review).toMatchObject({
      status: 'blocked',
      blocked: {
        title: 'More chips than the game has',
        chips: [{ value: 1, color: 'white', deltaText: '+1' }],
        message: 'That’s 1 White chip more than the game has. Check the quantities you entered.',
      },
    });
  });

  it('rejects corrections of a player without a result', async () => {
    const { gameId, ids } = await startedGame(ROOMY);
    expect(app.play.getCorrectionEditor(gameId, ids[1])).toBeNull();
    const edit = await expectUnchanged(gameId, ids, () => app.play.setCorrectionText(gameId, ids[1], 1, '3'));
    expect(edit).toMatchObject({ status: 'rejected', reason: { code: 'noResult', message: 'Bob has no confirmed result.' } });
    expect(app.play.reviewCorrection(gameId, ids[1])).toMatchObject({ reason: { code: 'noResult' } });
  });
});

describe('Return to play', () => {
  it('removes the result and its return, keeps every buy-in and lets the player rebuy and be counted again', async () => {
    const { gameId, ids } = await startedGame(ROOMY);
    const alice = ids[0];
    await rebuy(gameId, alice);
    await recordCount(app, gameId, alice, [15, 2, 5, 1, 0]);
    await typeCorrection(gameId, alice, [16, 2, 5, 1, 0]);
    const page = app.play.getCashPlayer(gameId, alice)!;
    expect(page.returnToPlay).toEqual({
      playerName: 'Alice',
      handBack: [
        { value: 1, color: 'white', count: 15 },
        { value: 5, color: 'red', count: 2 },
        { value: 25, color: 'blue', count: 5 },
        { value: 100, color: 'black', count: 1 },
        { value: 500, color: 'green', count: 0 },
      ],
      buyInsText: 'EUR 40.00',
    });
    const beforeBank = bank(gameId);
    const reserve = app.play.getView(gameId)!.reserve;

    expectStatus(await app.play.returnToPlay(gameId, alice), 'accepted');
    app = await harness.restart(app);

    const after = app.play.getCashPlayer(gameId, alice)!;
    expect(after).toMatchObject({ result: null, countDraft: false, returnToPlay: null, buyInsTotalText: 'EUR 40.00', actions: { countFinalChips: true } });
    expect(after.buyIns.map((b) => b.label)).toEqual(['Buy-in', 'Rebuy 1']);
    // The return is reversed; nothing is issued; reserve consumption is unchanged.
    expect(bank(gameId)).toEqual(beforeBank.map((c, i) => c - [15, 2, 5, 1, 0][i]));
    expect(app.play.getView(gameId)!.reserve.consumed).toBe(reserve.consumed);
    expect(app.play.getView(gameId)!.totals.stacks).toBe(7);
    expect(app.play.getResults(gameId)!.players[0]).toMatchObject({ state: 'uncounted', correctionDraft: false });
    expect(app.play.getPlayScreen(gameId)!.playing.map((p) => p.name)).toContain('Alice');
    expect(app.play.getPlayerBuyIns(gameId, alice)!.actions).toEqual({ addForgottenRebuy: true, rebuy: true });

    // Playing again: a new rebuy and a new count are possible.
    await rebuy(gameId, alice);
    await recordCount(app, gameId, alice, [0, 0, 0, 0, 0]);
    expect(app.play.getCashPlayer(gameId, alice)!.buyInsTotalText).toBe('EUR 60.00');
    expect(app.play.getResults(gameId)!.players[0].result).toEqual({ amountText: '−EUR 60.00', direction: 'loss' });
  });

  it('distinguishes removing a result from an explicit zero result', async () => {
    const { gameId, ids } = await startedGame(ROOMY);
    await recordCount(app, gameId, ids[0], [0, 0, 0, 0, 0]);
    expect(app.play.getResults(gameId)!.status).toMatchObject({ kind: 'toCount', counted: 1 });
    expect(app.play.getCashPlayer(gameId, ids[0])!.returnToPlay!.handBack.every((c) => c.count === 0)).toBe(true);
    expectStatus(await app.play.returnToPlay(gameId, ids[0]), 'accepted');
    expect(app.play.getResults(gameId)!.status).toMatchObject({ kind: 'toCount', counted: 0 });
    expect(app.play.getResults(gameId)!.players[0].state).toBe('uncounted');
  });

  it('leaves the game In progress with setup locked once the last play record is gone', async () => {
    const { gameId, ids } = await startedGame(ROOMY);
    const extra = await rebuy(gameId, ids[1]);
    await recordCount(app, gameId, ids[0], STACK);
    expectStatus(await app.play.returnToPlay(gameId, ids[0]), 'accepted');
    expectStatus(await app.play.undoRebuy(gameId, extra), 'accepted');
    app = await harness.restart(app);
    expect(app.games.get(gameId)!.phase).toBe('inProgress');
    expect(app.play.getView(gameId)!.totals.stacks).toBe(6);
    expect(await app.planning.setSettingText(gameId, 'buyIn', '50')).toMatchObject({ status: 'rejected', reason: { code: 'setupLocked' } });
  });
});

describe('undoing a rebuy', () => {
  it('removes its contribution, issuance and reserve consumption using its actual mix', async () => {
    const { gameId, ids } = await startedGame(ROOMY);
    const bob = ids[1];
    const before = app.play.getView(gameId)!;
    const first = await rebuy(gameId, bob);
    const second = await rebuy(gameId, bob);
    const afterTwo = app.play.getView(gameId)!;
    expect(afterTwo.reserve.consumed).toBe(before.reserve.consumed + 2);
    const secondMix = counts(app.play.getPlayerBuyIns(gameId, bob)!.buyIns[2].mix);

    const undo = app.play.getCashPlayer(gameId, bob)!.buyIns[2].undo!;
    expect(undo).toMatchObject({
      rebuyId: second,
      playerName: 'Bob',
      rebuyNumber: 2,
      contributionsBeforeText: 'EUR 60.00',
      contributionsAfterText: 'EUR 40.00',
      context: 'page',
    });
    expect(app.play.getCashPlayer(gameId, bob)!.buyIns[0].undo).toBeNull();

    const result = expectStatus(await app.play.undoRebuy(gameId, second), 'accepted');
    expect(result).toMatchObject({ participantId: bob, feedback: { title: 'Rebuy undone' } });
    app = await harness.restart(app);
    const view = app.play.getView(gameId)!;
    expect(view.reserve.consumed).toBe(before.reserve.consumed + 1);
    expect(bank(gameId)).toEqual(counts(afterTwo.bank.mix).map((c, i) => c + secondMix[i]));
    expect(app.play.getCashPlayer(gameId, bob)!.buyIns.map((b) => b.id)).toEqual([expect.any(String), first]);
    expect(app.play.getCashPlayer(gameId, bob)!.buyInsTotalText).toBe('EUR 40.00');
    // Unrelated players are untouched.
    expect(app.play.getCashPlayer(gameId, ids[0])).toEqual(app.play.getCashPlayer(gameId, ids[0]));
    expect(view.players[0]).toEqual(before.players[0]);
  });

  it('cannot undo the first stack or an unknown rebuy', async () => {
    const { gameId, ids } = await startedGame(ROOMY);
    const buyIn = app.play.getPlayerBuyIns(gameId, ids[0])!.buyIns[0].id;
    const first = await expectUnchanged(gameId, ids, () => app.play.undoRebuy(gameId, buyIn));
    expect(first).toMatchObject({ status: 'rejected', reason: { code: 'notARebuy' } });
    const unknown = await expectUnchanged(gameId, ids, () => app.play.undoRebuy(gameId, 'nope'));
    expect(unknown).toMatchObject({ status: 'rejected', reason: { code: 'rebuyNotFound' } });
  });

  it('is blocked when a later result returned its chips', async () => {
    const { gameId, ids } = await startedGame(TIGHT);
    // Bob's rebuy takes White chips Alice returned; then every chip comes back with Bob's count.
    await recordCount(app, gameId, ids[0], [15, 2, 5, 1, 0]);
    const bobRebuy = await rebuy(gameId, ids[1]);
    const inPlayWhite = 93 - bank(gameId)[0];
    expect(inPlayWhite).toBeGreaterThan(0);
    await recordCount(app, gameId, ids[1], [inPlayWhite, 0, 0, 0, 0]);
    const blocked = await expectUnchanged(gameId, ids, () => app.play.undoRebuy(gameId, bobRebuy));
    expect(blocked).toMatchObject({
      status: 'blocked',
      blocked: { title: 'Can’t undo this rebuy', chips: [{ value: 1, color: 'white' }] },
    });
  });
});

describe('a correction a later rebuy depends on (Alice and Bob)', () => {
  /** Alice returns [15, 2, 5, 1, 0]; Bob's rebuy 1 uses those White chips. */
  async function aliceAndBob() {
    const { gameId, ids } = await startedGame(TIGHT);
    const [alice, bob] = ids;
    await recordCount(app, gameId, alice, [15, 2, 5, 1, 0]);
    const bobRebuy = await rebuy(gameId, bob);
    expect(counts(app.play.getPlayerBuyIns(gameId, bob)!.buyIns[1].mix)).toEqual(STACK);
    return { gameId, ids, alice, bob, bobRebuy };
  }

  it('answers with the fix flow, changes nothing at step 1, and walks undo → save → new rebuy with restarts in between', async () => {
    const { gameId, ids, alice, bob, bobRebuy } = await aliceAndBob();
    const others = ids.slice(2).map((id) => app.play.getCashPlayer(gameId, id));
    await typeCorrection(gameId, alice, [10, 3, 5, 1, 0]);

    // Reviewing and replacing both answer `dependent`; nothing is saved.
    expect(app.play.reviewCorrection(gameId, alice)).toEqual({ status: 'dependent', fix: { participantId: alice, target: 'count' } });
    const replace = await expectUnchanged(gameId, ids, () => app.play.replaceResult(gameId, alice, { counts: [10, 3, 5, 1, 0] }));
    expect(replace).toEqual({ status: 'dependent', fix: { participantId: alice, target: 'count' } });

    // Step 1 is derived from the records; nothing is recorded and Play shows no fix line yet.
    const start = { participantId: alice, target: 'count' as const };
    const step1 = app.play.getFix(gameId, start)!;
    expect(step1).toMatchObject({
      playerName: 'Alice',
      target: 'count',
      step: 1,
      blocker: {
        ownerName: 'Bob',
        rebuyNumber: 1,
        amountText: 'EUR 20.00',
        chip: { value: 1, color: 'white', deltaText: '−2' },
        usageText: 'Bob’s rebuy 1 is using 2 of these White chips',
      },
      undo: { rebuyId: bobRebuy, playerName: 'Bob', rebuyNumber: 1, contributionsBeforeText: 'EUR 40.00', contributionsAfterText: 'EUR 20.00', context: 'fix' },
      newRebuy: { participantId: bob, note: 'Swap Bob’s chips so they match this stack.' },
      start,
    });
    expect(counts(step1.correction!.mix)).toEqual([10, 3, 5, 1, 0]);
    expect(app.play.getFix(gameId)).toBeNull();
    expect(app.play.getPlayScreen(gameId)!.fixText).toBeNull();

    // Step 1: undo Bob's rebuy (exactly the one shown).
    const wrong = await expectUnchanged(gameId, ids, () => app.play.undoFixBlocker(gameId, start, 'other'));
    expect(wrong).toMatchObject({ status: 'rejected', reason: { code: 'fixChanged' } });
    expectStatus(await app.play.undoFixBlocker(gameId, start, bobRebuy), 'accepted');
    app = await harness.restart(app);
    expect(app.play.getPlayScreen(gameId)!.fixText).toBe('Fixing Alice’s count · Step 2 of 3');
    const step2 = app.play.getFix(gameId)!;
    expect(step2).toMatchObject({ step: 2, start: null, blocker: { ownerName: 'Bob', rebuyNumber: 1 } });
    expect(step2.correction!.confirmation).toMatchObject({ kind: 'replace', playerName: 'Alice', unitsText: '250' });
    expect(app.play.getCashPlayer(gameId, bob)!.buyIns).toHaveLength(1);
    // Alice's result is still the old one until step 2 is accepted.
    expect(counts(app.play.getCashPlayer(gameId, alice)!.result!.finalChips)).toEqual([15, 2, 5, 1, 0]);

    // Step 2: save Alice's corrected count (Replace result).
    expectStatus(await app.play.saveFixStep(gameId, { counts: counts(step2.correction!.mix) }), 'accepted');
    app = await harness.restart(app);
    expect(counts(app.play.getCashPlayer(gameId, alice)!.result!.finalChips)).toEqual([10, 3, 5, 1, 0]);
    expect(app.play.getCashPlayer(gameId, alice)!.result!.correctionDraft).toBe(false);
    expect(app.play.getPlayScreen(gameId)!.fixText).toBe('Fixing Alice’s count · Step 3 of 3');
    expect(app.play.getFix(gameId)!.step).toBe(3);

    // Step 3: Bob's new rebuy is computed from the corrected bank and needs Accept & issue.
    const proposal = expectStatus(app.play.proposeRebuy(gameId, bob), 'needsConfirmation');
    expect(counts(proposal.confirmation.popup.stack.chips)).toEqual([10, 3, 3, 1, 0]);
    expect(proposal.confirmation.popup.reducedCoverage).toEqual({ achieved: 3, required: 4 });
    expect(
      await app.play.issueRebuy(gameId, { ...proposal.confirmation.acceptance, acceptedCoverage: null }),
    ).toMatchObject({ status: 'rejected', reason: { code: 'reducedCoverageNotAccepted' } });
    expect(app.play.getFix(gameId)!.step).toBe(3);
    expectStatus(await app.play.issueRebuy(gameId, proposal.confirmation.acceptance), 'accepted');
    app = await harness.restart(app);
    expect(app.play.getFix(gameId)!.step).toBe('done');
    expect(app.play.getPlayScreen(gameId)!.fixText).toBeNull();
    expect(app.play.getCashPlayer(gameId, bob)!.buyIns[1]).toMatchObject({ label: 'Rebuy 1', coverageText: '3 of 4 coverage' });

    expectStatus(await app.play.finishFix(gameId), 'accepted');
    expect(app.play.getFix(gameId)).toBeNull();
    // Unrelated players are unchanged; the bank stays within bounds.
    expect(ids.slice(2).map((id) => app.play.getCashPlayer(gameId, id))).toEqual(others);
    expect(bank(gameId).every((c) => c >= 0)).toBe(true);
  });

  it('also fixes a result removal (Return to play) one step at a time', async () => {
    const { gameId, ids, alice, bob, bobRebuy } = await aliceAndBob();
    const blocked = await expectUnchanged(gameId, ids, () => app.play.returnToPlay(gameId, alice));
    expect(blocked).toEqual({ status: 'dependent', fix: { participantId: alice, target: 'result' } });
    const start = { participantId: alice, target: 'result' as const };
    expect(app.play.getFix(gameId, start)).toMatchObject({ step: 1, target: 'result', correction: null, removal: { playerName: 'Alice' } });

    expectStatus(await app.play.undoFixBlocker(gameId, start, bobRebuy), 'accepted');
    expect(app.play.getPlayScreen(gameId)!.fixText).toBe('Fixing Alice’s result · Step 2 of 3');
    // Removing the result through the player page counts as step 2 as well.
    expectStatus(await app.play.returnToPlay(gameId, alice), 'accepted');
    expect(app.play.getFix(gameId)!.step).toBe(3);
    expect(app.play.getCashPlayer(gameId, alice)!.result).toBeNull();
    await rebuy(gameId, bob);
    expect(app.play.getFix(gameId)!.step).toBe('done');
  });

  it('lets the host leave at step 2, edit the count first and save it from the count editor', async () => {
    const { gameId, alice } = await aliceAndBob();
    await typeCorrection(gameId, alice, [10, 3, 5, 1, 0]);
    const start = { participantId: alice, target: 'count' as const };
    const step1 = app.play.getFix(gameId, start)!;
    expectStatus(await app.play.undoFixBlocker(gameId, start, step1.undo.rebuyId), 'accepted');
    app = await harness.restart(app);
    await typeCorrection(gameId, alice, [5, 4, 5, 1, 0]);
    expect(counts(app.play.getFix(gameId)!.correction!.mix)).toEqual([5, 4, 5, 1, 0]);
    const review = expectStatus(app.play.reviewCorrection(gameId, alice), 'needsConfirmation');
    expectStatus(await app.play.replaceResult(gameId, alice, { counts: counts(review.confirmation.mix) }), 'accepted');
    expect(app.play.getFix(gameId)!.step).toBe(3);
  });

  it('blocks a correction without a single dependent rebuy with the compact explanation', async () => {
    const { gameId, ids } = await startedGame(TIGHT);
    // Alice's returned White chips go into a late arrival's stack, which cannot be undone.
    await recordCount(app, gameId, ids[0], [15, 2, 5, 1, 0]);
    const saved = expectStatus(await app.savedPlayers.create('Nora'), 'accepted');
    const entry = expectStatus(app.play.proposeEntry(gameId, saved.savedPlayerId), 'needsConfirmation');
    expectStatus(await app.play.addLatePlayer(gameId, entry.confirmation.acceptance), 'accepted');
    await typeCorrection(gameId, ids[0], [10, 3, 5, 1, 0]);
    const review = await expectUnchanged(gameId, ids, () => app.play.reviewCorrection(gameId, ids[0]));
    expect(review).toMatchObject({
      status: 'blocked',
      blocked: {
        title: 'Those chips were handed out again',
        chips: [{ value: 1, color: 'white', deltaText: '−2' }],
        message: 'Later stacks use 2 White chips of this return. Undo or correct those records on their player pages first.',
      },
    });
    expect(app.play.getFix(gameId, { participantId: ids[0], target: 'count' })).toBeNull();
  });
});

describe('forgotten rebuys and Correct mix', () => {
  async function aliceWithResult() {
    const started = await startedGame(ROOMY);
    await recordCount(app, started.gameId, started.ids[0], [15, 2, 5, 1, 0]);
    return started;
  }

  it('adds the actual mix, unlike the recommendation, and keeps the recorded result', async () => {
    const { gameId, ids } = await aliceWithResult();
    const alice = ids[0];
    const editor = app.play.getRebuyMixEditor(gameId, alice)!;
    expect(editor).toMatchObject({ playerName: 'Alice', kind: 'forgotten', rebuyNumber: null, stackUnitsText: '200', resultStays: true, problem: null });
    expect(editor.entries.map((e) => e.quantityText)).toEqual(['', '', '', '', '']);
    expect(editor.goal).toMatchObject({ unitsText: '0', status: 'toGo', statusText: '200 to go' });
    expect(app.play.getRebuyMixEditor(gameId, alice, { texts: ['15', '2', '3', '1', ''] })!.goal.statusText).toBe('200 so far · enter the rest, even if 0');
    expect(app.play.getRebuyMixEditor(gameId, alice, { texts: ['40', '2', '3', '1', '0'] })!.goal).toMatchObject({ status: 'over', statusText: '25 over' });

    const exact = [20, 6, 2, 1, 0]; // 20 + 30 + 50 + 100: a mix the solver would not propose.
    const review = expectStatus(app.play.reviewRebuyMix(gameId, alice, { texts: texts(exact) }), 'needsConfirmation');
    expect(review.confirmation).toEqual({
      kind: 'forgotten',
      playerName: 'Alice',
      rebuyNumber: null,
      mix: expect.any(Array),
      buyInsChange: { beforeText: 'EUR 20.00', afterText: 'EUR 40.00' },
      extraFacts: [],
      warnings: [],
      notes: ['Alice’s result stays.'],
    });
    const bankBefore = bank(gameId);
    const consumed = app.play.getView(gameId)!.reserve.consumed;
    const added = expectStatus(await app.play.recordRebuyMix(gameId, alice, { counts: exact, acceptedWarnings: [] }), 'accepted');
    expect(added.feedback).toEqual({ title: 'Forgotten rebuy added' });
    app = await harness.restart(app);

    const page = app.play.getCashPlayer(gameId, alice)!;
    expect(page.result).toMatchObject({ unitsText: '250', winLoss: { amountText: '−EUR 15.00', direction: 'loss' } });
    expect(page.buyInsTotalText).toBe('EUR 40.00');
    expect(page.buyIns[1]).toMatchObject({ id: added.issuanceId, label: 'Rebuy 1', addedLater: true, corrected: false, coverageText: null });
    expect(counts(page.buyIns[1].mix)).toEqual(exact);
    expect(bank(gameId)).toEqual(bankBefore.map((c, i) => c - exact[i]));
    expect(app.play.getView(gameId)!.reserve.consumed).toBe(consumed + 1);
  });

  it('warns about reduced and zero coverage and records nothing until accepted', async () => {
    const { gameId, ids } = await aliceWithResult();
    const alice = ids[0];
    const reduced = expectStatus(app.play.reviewRebuyMix(gameId, alice, { texts: texts([10, 3, 3, 1, 0]) }), 'needsConfirmation');
    expect(reduced.confirmation.warnings).toEqual([{ code: 'reducedCoverage', text: 'Covers only 3 of 4 blind payments with separate chips.' }]);
    const zero = expectStatus(app.play.reviewRebuyMix(gameId, alice, { texts: texts([0, 0, 0, 2, 0]) }), 'needsConfirmation');
    expect(zero.confirmation.warnings).toEqual([{ code: 'reducedCoverage', text: 'Covers only 0 of 4 blind payments with separate chips.' }]);

    const declined = await expectUnchanged(gameId, ids, () => app.play.recordRebuyMix(gameId, alice, { counts: [0, 0, 0, 2, 0], acceptedWarnings: [] }));
    expect(declined).toMatchObject({ status: 'rejected', reason: { code: 'warningsNotAccepted' } });

    expectStatus(await app.play.recordRebuyMix(gameId, alice, { counts: [0, 0, 0, 2, 0], acceptedWarnings: ['reducedCoverage'] }), 'accepted');
    expect(app.play.getCashPlayer(gameId, alice)!.buyIns[1]).toMatchObject({ addedLater: true, coverageText: '0 of 4 coverage' });
  });

  it('warns when it leaves fewer reserve stacks formable, and later rebuys protect what is achievable', async () => {
    const { gameId, ids } = await startedGame(ROOMY);
    const reserve = app.play.getView(gameId)!.reserve;
    expect(reserve).toMatchObject({ unconsumed: 3, achievable: 3 });
    // 100 White chips: the bank keeps 10, too few for any 200-unit stack with 4 blind payments.
    const weaken = [100, 20, 0, 0, 0];
    const review = expectStatus(app.play.reviewRebuyMix(gameId, ids[1], { texts: texts(weaken) }), 'needsConfirmation');
    const warning: MixWarning = { code: 'weakenedReserve', text: 'Leaves chips for only 0 of 2 reserve stacks (was 3).' };
    expect(review.confirmation.warnings).toEqual([warning]);
    await expectUnchanged(gameId, ids, () => app.play.recordRebuyMix(gameId, ids[1], { counts: weaken, acceptedWarnings: [] }));

    expectStatus(await app.play.recordRebuyMix(gameId, ids[1], { counts: weaken, acceptedWarnings: ['weakenedReserve'] }), 'accepted');
    app = await harness.restart(app);
    expect(app.play.getView(gameId)!.reserve).toMatchObject({ unconsumed: 2, achievable: 0, weakened: true });
    // Chip returns restore capacity without resetting consumption.
    await recordCount(app, gameId, ids[1], [115, 22, 3, 1, 0]);
    expect(app.play.getView(gameId)!.reserve).toMatchObject({ consumed: 1, unconsumed: 2, achievable: 2 });
    // A later rebuy protects the still-targeted stack it can.
    const next = expectStatus(app.play.proposeRebuy(gameId, ids[2]), 'needsConfirmation');
    expect(next.confirmation.acceptance.reserveAfter).toBe(1);
  });

  it('rejects a wrong total and an impossible mix even with the warnings accepted', async () => {
    const { gameId, ids } = await aliceWithResult();
    const alice = ids[0];
    expect(app.play.reviewRebuyMix(gameId, alice, { texts: texts([15, 2, 3, 2, 0]) })).toEqual({
      status: 'needsCorrection',
      firstDenominationValue: null,
      problem: { title: '300 chip units, not 200.', message: 'Check the quantities you entered.' },
    });
    expect(app.play.getRebuyMixEditor(gameId, alice, { texts: texts([15, 2, 3, 2, 0]), showErrors: true })!.problem).toEqual({
      title: '300 chip units, not 200.',
      message: 'Check the quantities you entered.',
    });
    expect(app.play.reviewRebuyMix(gameId, alice, { texts: ['15', '', '3', '1', '0'] })).toMatchObject({
      status: 'needsCorrection',
      firstDenominationValue: 5,
      problem: { title: 'Quantities missing.' },
    });
    const wrong = await expectUnchanged(gameId, ids, () =>
      app.play.recordRebuyMix(gameId, alice, { counts: [15, 2, 3, 2, 0], acceptedWarnings: ['reducedCoverage', 'weakenedReserve'] }),
    );
    expect(wrong).toMatchObject({ status: 'rejected', reason: { code: 'wrongMix' } });

    // The bank holds 110 + 15 White chips (Alice's return); 200 cannot have come from it.
    expect(app.play.reviewRebuyMix(gameId, alice, { texts: texts([200, 0, 0, 0, 0]) })).toEqual({
      status: 'blocked',
      blocked: {
        title: 'Not enough chips for this mix',
        chips: [{ value: 1, color: 'white', deltaText: '−75' }],
        message: 'The bank is 75 White chips short. Check the quantities you entered.',
      },
    });
    const impossible = await expectUnchanged(gameId, ids, () =>
      app.play.recordRebuyMix(gameId, alice, { counts: [200, 0, 0, 0, 0], acceptedWarnings: ['reducedCoverage', 'weakenedReserve'] }),
    );
    expect(impossible).toMatchObject({ status: 'blocked' });
  });

  it('corrects a rebuy mix in place without a second issuance or contribution', async () => {
    const { gameId, ids } = await startedGame(ROOMY);
    const bob = ids[1];
    const rebuyId = await rebuy(gameId, bob);
    const before = app.play.getView(gameId)!;
    const oldMix = counts(app.play.getPlayerBuyIns(gameId, bob)!.buyIns[1].mix);
    const editor = app.play.getRebuyMixEditor(gameId, bob, { rebuyId })!;
    expect(editor).toMatchObject({ kind: 'correct', rebuyNumber: 1, resultStays: false });
    expect(editor.entries.map((e) => e.quantityText)).toEqual(oldMix.map(String));

    const corrected = [10, 3, 3, 1, 0];
    const review = expectStatus(app.play.reviewRebuyMix(gameId, bob, { rebuyId, texts: texts(corrected) }), 'needsConfirmation');
    expect(review.confirmation).toMatchObject({ kind: 'correct', rebuyNumber: 1, buyInsChange: null, warnings: [{ code: 'reducedCoverage' }] });
    const saved = expectStatus(
      await app.play.recordRebuyMix(gameId, bob, { rebuyId, counts: corrected, acceptedWarnings: ['reducedCoverage'] }),
      'accepted',
    );
    expect(saved).toMatchObject({ issuanceId: rebuyId, feedback: { title: 'Rebuy corrected' } });
    app = await harness.restart(app);
    const view = app.play.getView(gameId)!;
    expect(view.totals.stacks).toBe(before.totals.stacks);
    expect(view.totals.contributions.cents).toBe(before.totals.contributions.cents);
    expect(view.reserve.consumed).toBe(before.reserve.consumed);
    expect(counts(view.bank.mix)).toEqual(counts(before.bank.mix).map((c, i) => c + oldMix[i] - corrected[i]));
    expect(app.play.getCashPlayer(gameId, bob)!.buyIns[1]).toMatchObject({ id: rebuyId, corrected: true, addedLater: false, coverageText: '3 of 4 coverage' });

    // Correcting back to a fully covered mix drops the coverage tag.
    expectStatus(await app.play.recordRebuyMix(gameId, bob, { rebuyId, counts: STACK, acceptedWarnings: [] }), 'accepted');
    expect(app.play.getCashPlayer(gameId, bob)!.buyIns[1]).toMatchObject({ corrected: true, coverageText: null });
  });

  it('rejects Correct mix of the first stack', async () => {
    const { gameId, ids } = await startedGame(ROOMY);
    const buyIn = app.play.getPlayerBuyIns(gameId, ids[0])!.buyIns[0].id;
    expect(app.play.getRebuyMixEditor(gameId, ids[0], { rebuyId: buyIn })).toBeNull();
    expect(app.play.reviewRebuyMix(gameId, ids[0], { rebuyId: buyIn, texts: texts(STACK) })).toMatchObject({ reason: { code: 'notARebuy' } });
  });
});

describe('tournaments', () => {
  it('adds a forgotten rebuy for an eliminated player: order and schedule stay, the pool grows', async () => {
    const { gameId, ids } = await startedGame({ ...ROOMY }, 'tournament');
    const [alice, bob] = ids;
    expectStatus(await app.play.recordElimination(gameId, bob), 'accepted');
    const before = app.play.getTournamentPlay(gameId)!;
    expect(app.play.getPlayerBuyIns(gameId, bob)!.actions).toEqual({ addForgottenRebuy: true, rebuy: false });
    expect(app.play.getRebuyMixEditor(gameId, bob)!.resultStays).toBe(true);

    const review = expectStatus(app.play.reviewRebuyMix(gameId, bob, { texts: texts(STACK) }), 'needsConfirmation');
    expect(review.confirmation).toMatchObject({
      buyInsChange: { beforeText: 'EUR 20.00', afterText: 'EUR 40.00' },
      extraFacts: [{ label: 'Prize pool', value: 'EUR 120.00 → EUR 140.00' }],
      notes: ['Bob · Stays out · 6th'],
    });
    expectStatus(await app.play.recordRebuyMix(gameId, bob, { counts: STACK, acceptedWarnings: [] }), 'accepted');
    app = await harness.restart(app);
    const after = app.play.getTournamentPlay(gameId)!;
    expect(after.prizePool.amountText).toBe('EUR 140.00');
    expect(after.prizePool.rungs.map((r) => r.shareText)).toEqual(before.prizePool.rungs.map((r) => r.shareText));
    expect(app.play.getTournamentResults(gameId)!.finishers.map((f) => [f.name, f.placeLabel])).toEqual([['Bob', '6th']]);
    const page = app.play.getTournamentPlayer(gameId, bob)!;
    expect(page).toMatchObject({ status: 'out', buyInsTotalText: 'EUR 40.00' });
    expect(page.buyIns[1]).toMatchObject({ addedLater: true });

    // Undoing a tournament rebuy reverses the pool and keeps the elimination.
    const rebuyId = app.play.getPlayerBuyIns(gameId, bob)!.buyIns[1].id;
    expect(app.play.getPlayerBuyIns(gameId, bob)!.buyIns[1].undo).toMatchObject({ playerName: 'Bob', rebuyNumber: 1 });
    expectStatus(await app.play.undoRebuy(gameId, rebuyId), 'accepted');
    expect(app.play.getTournamentPlay(gameId)!.prizePool.amountText).toBe('EUR 120.00');
    expect(app.play.getTournamentPlayer(gameId, bob)!.status).toBe('out');
    // A still-playing player can rebuy from their page; Return to play is cash only.
    expect(app.play.getPlayerBuyIns(gameId, alice)!.actions.rebuy).toBe(true);
    expect(await app.play.returnToPlay(gameId, alice)).toMatchObject({ status: 'rejected', reason: { code: 'notCashGame' } });
  });
});

describe('Completed games', () => {
  it('reject every correction until reopened', async () => {
    const { gameId, ids } = await startedGame(ROOMY);
    const rebuyId = await rebuy(gameId, ids[0]);
    await recordCount(app, gameId, ids[0], [30, 4, 6, 2, 0]);
    for (const id of ids.slice(1)) await recordCount(app, gameId, id, STACK);
    expectStatus(await app.play.calculatePayments(gameId, { confirmed: true }), 'accepted');

    const operations: (() => Promise<{ status: string }>)[] = [
      () => app.play.setCorrectionText(gameId, ids[0], 1, '3'),
      () => app.play.replaceResult(gameId, ids[0], { counts: STACK }),
      () => app.play.returnToPlay(gameId, ids[0]),
      () => app.play.undoRebuy(gameId, rebuyId),
      () => app.play.recordRebuyMix(gameId, ids[1], { counts: STACK, acceptedWarnings: [] }),
      () => app.play.finishFix(gameId),
    ];
    for (const operation of operations) {
      expect(await expectUnchanged(gameId, ids, operation)).toMatchObject({ status: 'rejected', reason: { code: 'gameCompleted' } });
    }
    expect(app.play.reviewCorrection(gameId, ids[0])).toMatchObject({ reason: { code: 'gameCompleted' } });
    expect(app.play.getPlayerBuyIns(gameId, ids[0])!.actions).toEqual({ addForgottenRebuy: false, rebuy: false });
    expect(app.play.getPlayerBuyIns(gameId, ids[0])!.buyIns[1].undo).toBeNull();
    expect(app.play.getCashPlayer(gameId, ids[0])!.returnToPlay).toBeNull();

    expectStatus(await app.play.reopen(gameId, { confirmed: true }), 'accepted');
    // The ordinary rules apply again: every chip is back in the bank, so the rebuy's chips came back
    // with a result, while a result can be removed.
    expect(await app.play.undoRebuy(gameId, rebuyId)).toMatchObject({ status: 'blocked', blocked: { title: 'Can’t undo this rebuy' } });
    expectStatus(await app.play.returnToPlay(gameId, ids[1]), 'accepted');
    expect(app.play.getResults(gameId)!.players[1].state).toBe('uncounted');
  });
});
