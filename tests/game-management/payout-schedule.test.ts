import type { GameManagement, PayoutScheduleView, PlanningView, StepId } from '@/game-management';

import { addChipRows, createTestHarness, expectStatus, gameWithPlayers, type TestHarness } from '../support/game-management';

let harness: TestHarness;
let app: GameManagement;

beforeEach(async () => {
  harness = await createTestHarness();
  app = await harness.open();
});
afterEach(() => harness.cleanup());

const NAMES = ['Alice', 'Bob', 'Cleo', 'Dan', 'Emma', 'Felix', 'Gina', 'Hugo', 'Iris'];

const view = (gameId: string): PlanningView => app.planning.getView(gameId)!;
const payouts = (gameId: string): PayoutScheduleView => view(gameId).payoutSchedule;
const shares = (gameId: string) => payouts(gameId).places.map((p) => p.share.text);
const amounts = (gameId: string) => payouts(gameId).places.map((p) => p.amount.text);
const status = (gameId: string, step: StepId) => view(gameId).steps.find((s) => s.id === step)!.statusLabel;
const payoutBlocker = (gameId: string) => view(gameId).preview.blockers.find((b) => b.step === 'payouts');

async function continueTo(gameId: string, step: StepId) {
  return expectStatus(await app.planning.continueFromStep(gameId, step), 'accepted').nextStep;
}

/** A tournament with `players` players and the given buy-in, standing on the Payout schedule step. */
async function tournamentAtPayouts(players: number, buyIn = '20') {
  const gameId = await gameWithPlayers(app, 'tournament', NAMES.slice(0, players));
  await addChipRows(app, gameId, [
    ['25', '200'],
    ['100', '200'],
  ]);
  await app.planning.setSettingText(gameId, 'buyIn', buyIn);
  expect(await continueTo(gameId, 'players')).toBe('chipSet');
  expectStatus(await app.planning.completeChipSetStep(gameId, { kind: 'onlyThisGame' }), 'accepted');
  expect(await continueTo(gameId, 'settings')).toBe('payouts');
  return gameId;
}

/** Types every share of the schedule, adding or removing places to match. */
async function typeShares(gameId: string, texts: string[]) {
  while (payouts(gameId).places.length < texts.length) expectStatus(await app.planning.addPayoutPlace(gameId), 'accepted');
  while (payouts(gameId).places.length > texts.length) {
    const places = payouts(gameId).places;
    expectStatus(await app.planning.removePayoutPlace(gameId, places[places.length - 1].id), 'accepted');
  }
  const ids = payouts(gameId).places.map((p) => p.id);
  for (const [index, text] of texts.entries()) await app.planning.setPayoutShareText(gameId, ids[index], text);
}

async function removePlayers(gameId: string, count: number) {
  for (let i = 0; i < count; i++) {
    const participants = view(gameId).players.participants;
    expectStatus(await app.planning.removeParticipant(gameId, participants[participants.length - 1].id), 'accepted');
  }
}

describe('first visit', () => {
  it('has no schedule before the step opens; the whole-plan check says it is not filled in', async () => {
    const gameId = await gameWithPlayers(app, 'tournament', NAMES.slice(0, 6));
    expect(payouts(gameId).places).toEqual([]);
    expect(payouts(gameId).total).toBeNull();
    expect(status(gameId, 'payouts')).toBe('Not filled in');
    expect(payoutBlocker(gameId)?.problems[0]).toMatchObject({ code: 'payoutScheduleMissing', message: 'Not filled in yet.' });
  });

  it('preselects and saves the suggested preset once, and it survives restart', async () => {
    const gameId = await tournamentAtPayouts(6);
    expect(view(gameId).currentStep).toBe('payouts');
    let p = payouts(gameId);
    expect(p.needsPlayers).toBe(false);
    expect(p.preset).toEqual({ id: 'top2', name: 'Top 2', suggestionLine: 'Suggested' });
    expect(shares(gameId)).toEqual(['70', '30']);
    expect(p.places.map((place) => [place.placeLabel, place.shareLabel, place.share.edited, place.share.revealed])).toEqual([
      ['1st', '1st place share', false, false],
      ['2nd', '2nd place share', false, false],
    ]);
    expect(status(gameId, 'payouts')).toBe('Complete');

    app = await harness.restart(app);
    p = payouts(gameId);
    expect(p.preset.name).toBe('Top 2');
    expect(shares(gameId)).toEqual(['70', '30']);
    const ids = p.places.map((place) => place.id);

    // Leaving and opening the step again does not preselect again.
    await app.planning.goBack(gameId);
    expect(await continueTo(gameId, 'settings')).toBe('payouts');
    expect(payouts(gameId).places.map((place) => place.id)).toEqual(ids);
  });

  it('suggests by player count: 2 → Winner takes all, 3–6 → Top 2, 7+ → Top 3', async () => {
    const picked: Record<number, string> = {};
    for (const players of [2, 3, 6, 7, 9]) {
      const gameId = await tournamentAtPayouts(players);
      picked[players] = payouts(gameId).preset.name;
    }
    expect(picked).toEqual({ 2: 'Winner takes all', 3: 'Top 2', 6: 'Top 2', 7: 'Top 3', 9: 'Top 3' });
  });

  it('with fewer than two players reports that players are needed, then preselects once they are there', async () => {
    const gameId = await tournamentAtPayouts(2);
    // A game whose step opens with one player and no schedule: reach it from the preview.
    const other = await gameWithPlayers(app, 'cash', ['Alice', 'Bob']);
    await addChipRows(app, other, [['1', '100']]);
    await app.planning.setSettingText(other, 'buyIn', '10');
    await continueTo(other, 'players');
    await app.planning.completeChipSetStep(other, { kind: 'onlyThisGame' });
    expect(await continueTo(other, 'settings')).toBe('preview');
    await removePlayers(other, 1);
    await app.planning.changeMode(other, 'tournament');
    expectStatus(await app.planning.goToStep(other, 'payouts', { fromPreview: true }), 'accepted');
    expect(payouts(other)).toMatchObject({ needsPlayers: true, places: [], suggested: null, total: null });
    expect(status(other, 'payouts')).toBe('Not filled in');

    await app.planning.goToStep(other, 'players');
    await app.planning.createSavedPlayerAndAdd(other, 'Zoe');
    expect(await continueTo(other, 'players')).toBe('preview'); // still a correction from the preview
    await app.planning.goToStep(other, 'payouts', { fromPreview: true });
    expect(payouts(other)).toMatchObject({ needsPlayers: false, preset: { name: 'Winner takes all' } });
    expect(shares(other)).toEqual(['100']);
    expect(payouts(gameId).preset.name).toBe('Winner takes all');
  });
});

describe('roster changes', () => {
  it('never change the schedule; only the suggestion line follows the roster', async () => {
    const gameId = await tournamentAtPayouts(6);
    await app.planning.goToStep(gameId, 'players');
    await app.planning.createSavedPlayerAndAdd(gameId, 'Gina');
    expect(payouts(gameId).preset).toEqual({ id: 'top2', name: 'Top 2', suggestionLine: 'Suggested for 7 players: Top 3' });
    expect(payouts(gameId).suggested).toEqual({ id: 'top3', name: 'Top 3' });
    await continueTo(gameId, 'players');
    await app.planning.goToStep(gameId, 'payouts');
    expect(shares(gameId)).toEqual(['70', '30']);

    await removePlayers(gameId, 5);
    app = await harness.restart(app);
    expect(payouts(gameId).preset).toEqual({
      id: 'top2',
      name: 'Top 2',
      suggestionLine: 'Suggested for 2 players: Winner takes all',
    });
    expect(shares(gameId)).toEqual(['70', '30']);
    expect(status(gameId, 'payouts')).toBe('Complete');
  });

  it('keep a custom schedule as typed', async () => {
    const gameId = await tournamentAtPayouts(6);
    await typeShares(gameId, ['60', '40']);
    await app.planning.createSavedPlayerAndAdd(gameId, 'Gina');
    expect(payouts(gameId).preset).toMatchObject({ id: null, name: 'Custom', suggestionLine: 'Suggested for 7 players: Top 3' });
    expect(shares(gameId)).toEqual(['60', '40']);
  });
});

describe('presets', () => {
  it('lists every preset for the sheet with split, suggestion, current and availability', async () => {
    const gameId = await tournamentAtPayouts(3);
    expect(payouts(gameId).presets.map((p) => [p.name, p.splitText, p.suggested, p.current, p.available, p.unavailableReason])).toEqual([
      ['Winner takes all', '100%', false, false, true, null],
      ['Top 2', '70 / 30%', true, true, true, null],
      ['Top 3', '50 / 30 / 20%', false, false, true, null],
      ['Top 4', '50 / 25 / 15 / 10%', false, false, false, 'Needs 4 players'],
      ['Top 5', '40 / 25 / 20 / 10 / 5%', false, false, false, 'Needs 5 players'],
    ]);
  });

  it('picking a preset replaces every percentage, and each preset is valid and pays the whole pool', async () => {
    const gameId = await tournamentAtPayouts(8, '25');
    await typeShares(gameId, ['abc', '', '12.345']);
    const expected = {
      winnerTakesAll: [['100'], ['EUR 200.00']],
      top2: [['70', '30'], ['EUR 140.00', 'EUR 60.00']],
      top3: [['50', '30', '20'], ['EUR 100.00', 'EUR 60.00', 'EUR 40.00']],
      top4: [['50', '25', '15', '10'], ['EUR 100.00', 'EUR 50.00', 'EUR 30.00', 'EUR 20.00']],
      top5: [['40', '25', '20', '10', '5'], ['EUR 80.00', 'EUR 50.00', 'EUR 40.00', 'EUR 20.00', 'EUR 10.00']],
    } as const;
    for (const [id, [texts, prizes]] of Object.entries(expected)) {
      expectStatus(await app.planning.choosePayoutPreset(gameId, id as keyof typeof expected), 'accepted');
      const p = payouts(gameId);
      expect(shares(gameId)).toEqual(texts);
      expect(amounts(gameId)).toEqual(prizes);
      expect(p.preset.id).toBe(id);
      expect(p.presets.filter((option) => option.current).map((option) => option.id)).toEqual([id]);
      expect(p.problems).toEqual([]);
      expect(p.total).toEqual({ kind: 'exact', text: 'Total 100%', icon: 'check', tone: 'ok' });
      expect(p.places.every((place) => !place.share.edited)).toBe(true);
    }
  });

  it('rejects a preset with more places than players and changes nothing', async () => {
    const gameId = await tournamentAtPayouts(3);
    const before = view(gameId);
    const result = expectStatus(await app.planning.choosePayoutPreset(gameId, 'top4'), 'rejected');
    expect(result.reason).toEqual({ code: 'presetUnavailable', message: 'Top 4 needs at least 4 players.' });
    expect(view(gameId)).toBe(before);
    app = await harness.restart(app);
    expect(shares(gameId)).toEqual(['70', '30']);
  });
});

describe('custom edits', () => {
  it('typing makes the schedule Custom and keeps the raw text', async () => {
    const gameId = await tournamentAtPayouts(6);
    const [first, second] = payouts(gameId).places;
    expectStatus(await app.planning.setPayoutShareText(gameId, first.id, '70'), 'accepted'); // typing the same number
    expect(payouts(gameId).preset).toMatchObject({ id: null, name: 'Custom', suggestionLine: 'Suggested for 6 players: Top 2' });
    expectStatus(await app.planning.setPayoutShareText(gameId, first.id, ' 62,5 '), 'accepted');
    expectStatus(await app.planning.setPayoutShareText(gameId, second.id, '37.50'), 'accepted');
    expect(shares(gameId)).toEqual([' 62,5 ', '37.50']);
    expect(payouts(gameId).problems).toEqual([]);
    expect(amounts(gameId)).toEqual(['EUR 75.00', 'EUR 45.00']);
    expect(payouts(gameId).places.map((p) => p.barPercent)).toEqual([62.5, 37.5]);
  });

  it.each([
    ['', 'shareMissing', 'Enter a percentage.'],
    ['abc', 'shareMalformed', 'Enter a number, like 30 or 12.5.'],
    ['1.2.3', 'shareMalformed', 'Enter a number, like 30 or 12.5.'],
    ['12.345', 'shareTooManyDecimals', 'Use at most 2 decimals, like 12.5.'],
    ['0', 'shareNotPositive', 'Must be more than 0%.'],
    ['-5', 'shareNotPositive', 'Must be more than 0%.'],
    ['100.01', 'shareOverHundred', 'Can’t be more than 100%.'],
  ])('reports %j as %s', async (text, code, message) => {
    const gameId = await tournamentAtPayouts(6);
    const first = payouts(gameId).places[0];
    const result = expectStatus(await app.planning.setPayoutShareText(gameId, first.id, text), 'savedInvalid');
    expect(result.problems).toEqual([{ code, field: `payoutShare:${first.id}`, message }]);
    expect(payouts(gameId).places[0].share).toEqual({
      text,
      problem: { code, field: `payoutShare:${first.id}`, message },
      edited: true,
      revealed: true,
    });
  });

  it('reports a share higher than the place above, and invalid raw text survives Back, leaving and restart', async () => {
    const gameId = await tournamentAtPayouts(6);
    await app.planning.choosePayoutPreset(gameId, 'top3');
    const ids = payouts(gameId).places.map((p) => p.id);
    await app.planning.setPayoutShareText(gameId, ids[1], '20');
    const result = expectStatus(await app.planning.setPayoutShareText(gameId, ids[2], '25'), 'savedInvalid');
    expect(result.problems.map((p) => p.message)).toEqual(['Can’t be more than 2nd place (20%).']);
    expect(payouts(gameId).places[0].share.revealed).toBe(false);

    await app.planning.goBack(gameId);
    await app.location.set({ kind: 'games' });
    app = await harness.restart(app);
    await app.games.open(gameId);
    const p = payouts(gameId);
    expect(shares(gameId)).toEqual(['50', '20', '25']);
    expect(p.places.map((place) => [place.share.edited, place.share.problem?.code ?? null])).toEqual([
      [false, null],
      [true, null],
      [true, 'shareAboveHigherPlace'],
    ]);
    expect(p.preset.name).toBe('Custom');
    expect(status(gameId, 'payouts')).toBe('Needs attention');
  });
});

describe('total line', () => {
  it.each([
    [['50', '30', '20'], { kind: 'exact', text: 'Total 100%', icon: 'check', tone: 'ok' }],
    [['50', '30', '15'], { kind: 'under', text: 'Total 95% · 5% left', icon: null, tone: 'warning' }],
    [['55', '30', '20'], { kind: 'over', text: 'Total 105% · 5% too much', icon: null, tone: 'warning' }],
    [['60', '45', ''], { kind: 'over', text: 'Total 105% · 5% too much', icon: null, tone: 'warning' }],
    [['50', '20', ''], { kind: 'incomplete', text: 'Total 70% so far', icon: null, tone: 'warning' }],
    [['33.33', '33.33', '33.33'], { kind: 'under', text: 'Total 99.99% · 0.01% left', icon: null, tone: 'warning' }],
  ])('%j → %j', async (texts, total) => {
    const gameId = await tournamentAtPayouts(6);
    await typeShares(gameId, texts);
    expect(payouts(gameId).total).toEqual(total);
  });

  it('turns red after Continue was tried; Continue stays on the step with problems revealed in screen order', async () => {
    const gameId = await tournamentAtPayouts(6);
    await app.planning.choosePayoutPreset(gameId, 'top3');
    const ids = payouts(gameId).places.map((p) => p.id);
    await app.planning.setPayoutShareText(gameId, ids[0], '50');
    await app.planning.setPayoutShareText(gameId, ids[2], '15');
    const blocked = expectStatus(await app.planning.continueFromStep(gameId, 'payouts'), 'stepInvalid');
    expect(blocked.problems.map((p) => [p.code, p.field, p.message])).toEqual([
      ['payoutTotalNotHundred', 'payoutSchedule', 'Total is 95%, needs 100%.'],
    ]);
    await app.planning.setPayoutShareText(gameId, ids[1], '');
    const again = expectStatus(await app.planning.continueFromStep(gameId, 'payouts'), 'stepInvalid');
    expect(again.problems.map((p) => p.field)).toEqual([`payoutShare:${ids[1]}`]);

    app = await harness.restart(app);
    const p = payouts(gameId);
    expect(view(gameId).currentStep).toBe('payouts');
    expect(p.continueAttempted).toBe(true);
    expect(p.total).toEqual({ kind: 'incomplete', text: 'Total 65% so far', icon: null, tone: 'error' });
    expect(p.places.every((place) => place.share.revealed)).toBe(true);

    await app.planning.setPayoutShareText(gameId, ids[1], '35');
    expect(payouts(gameId).total?.tone).toBe('ok');
    expect(await continueTo(gameId, 'payouts')).toBe('preview');
  });
});

describe('equal shares', () => {
  it('are valid and show the note', async () => {
    const gameId = await tournamentAtPayouts(6, '10');
    expect(payouts(gameId).equalSharesNote).toBeNull();
    await typeShares(gameId, ['40', '30', '30']);
    const p = payouts(gameId);
    expect(p.problems).toEqual([]);
    expect(p.equalSharesNote).toBe('Equal shares are fine. Places still come from the elimination order.');
    expect(amounts(gameId)).toEqual(['EUR 24.00', 'EUR 18.00', 'EUR 18.00']);
    expect(status(gameId, 'payouts')).toBe('Complete');
  });
});

describe('paid places and players', () => {
  it('keeps a schedule with too many places after players leave, and offers the suggestion as the fix', async () => {
    const gameId = await tournamentAtPayouts(5);
    await app.planning.choosePayoutPreset(gameId, 'top4');
    await removePlayers(gameId, 2);
    app = await harness.restart(app);

    let p = payouts(gameId);
    expect(shares(gameId)).toEqual(['50', '25', '15', '10']);
    expect(p.preset.name).toBe('Top 4');
    expect(p.tooManyPlaces).toEqual({
      problem: { code: 'tooManyPaidPlaces', field: 'payoutSchedule', message: '4 paid places, but only 3 players.' },
      fix: { presetId: 'top2', label: 'Use Top 2' },
    });
    expect(p.addPlace).toEqual({ available: false, reason: 'Can’t pay more places than players (3).' });
    expect(amounts(gameId)).toEqual(['—', '—', '—', '—']);
    expect(status(gameId, 'payouts')).toBe('Needs attention');
    expect(payoutBlocker(gameId)?.problems[0].message).toBe('4 paid places, but only 3 players.');
    expect(expectStatus(await app.planning.continueFromStep(gameId, 'payouts'), 'stepInvalid').problems[0].code).toBe(
      'tooManyPaidPlaces',
    );

    expectStatus(await app.planning.choosePayoutPreset(gameId, p.tooManyPlaces!.fix!.presetId), 'accepted');
    p = payouts(gameId);
    expect(p.tooManyPlaces).toBeNull();
    expect(p.preset).toMatchObject({ name: 'Top 2', suggestionLine: 'Suggested' });
    expect(status(gameId, 'payouts')).toBe('Complete');
  });

  it('can also be fixed by removing places', async () => {
    const gameId = await tournamentAtPayouts(4);
    await app.planning.choosePayoutPreset(gameId, 'top4');
    await removePlayers(gameId, 1);
    await typeShares(gameId, ['50', '30', '20']);
    expect(payouts(gameId).tooManyPlaces).toBeNull();
    expect(payouts(gameId).problems).toEqual([]);
  });

  it('adds empty places up to the player count, then rejects without changing anything', async () => {
    const gameId = await tournamentAtPayouts(3);
    expect(payouts(gameId).addPlace).toEqual({ available: true, reason: null });
    const { rowId } = expectStatus(await app.planning.addPayoutPlace(gameId), 'accepted');
    let p = payouts(gameId);
    expect(p.preset.name).toBe('Custom');
    expect(p.places[2]).toMatchObject({ id: rowId, place: 3, placeLabel: '3rd', share: { text: '', edited: false } });
    expect(p.places[2].amount).toEqual({ kind: 'none', text: '—' });
    expect(p.addPlace).toEqual({ available: false, reason: 'Can’t pay more places than players (3).' });

    const before = view(gameId);
    const rejected = expectStatus(await app.planning.addPayoutPlace(gameId), 'rejected');
    expect(rejected.reason).toEqual({ code: 'tooManyPlaces', message: 'Can’t pay more places than players (3).' });
    expect(view(gameId)).toBe(before);
    app = await harness.restart(app);
    p = payouts(gameId);
    expect(p.places).toHaveLength(3);
  });

  it('removes only the last place, and never the only one', async () => {
    const gameId = await tournamentAtPayouts(6);
    await app.planning.choosePayoutPreset(gameId, 'top3');
    const places = payouts(gameId).places;
    expect(places.map((p) => [p.removable, p.removeLabel])).toEqual([
      [false, 'Remove 1st place'],
      [false, 'Remove 2nd place'],
      [true, 'Remove 3rd place'],
    ]);
    expect(expectStatus(await app.planning.removePayoutPlace(gameId, places[1].id), 'rejected').reason.code).toBe('notLastPlace');
    expect(expectStatus(await app.planning.removePayoutPlace(gameId, 'nope'), 'rejected').reason.code).toBe('rowNotFound');
    expectStatus(await app.planning.removePayoutPlace(gameId, places[2].id), 'accepted');
    expectStatus(await app.planning.removePayoutPlace(gameId, places[1].id), 'accepted');
    expect(payouts(gameId)).toMatchObject({ preset: { name: 'Custom' }, total: { kind: 'under', text: 'Total 50% · 50% left' } });
    expect(payouts(gameId).places[0].removable).toBe(false);
    const only = expectStatus(await app.planning.removePayoutPlace(gameId, places[0].id), 'rejected');
    expect(only.reason).toEqual({ code: 'onlyPlace', message: 'Keep at least one paid place.' });
    expect(shares(gameId)).toEqual(['50']);
  });
});

describe('prize pool and amounts', () => {
  it('shows the pool and the tournament cent rule: EUR 20.01 at 50 / 30 / 20 → 10.01 / 6.00 / 4.00', async () => {
    const gameId = await tournamentAtPayouts(3, '6.67');
    expect(payouts(gameId).prizePool).toEqual({
      kind: 'amount',
      cents: 2001,
      amountText: 'EUR 20.01',
      detail: '3 × EUR 6.67',
    });
    await app.planning.choosePayoutPreset(gameId, 'top3');
    expect(amounts(gameId)).toEqual(['EUR 10.01', 'EUR 6.00', 'EUR 4.00']);
    expect(payouts(gameId).places.map((p) => (p.amount.kind === 'amount' ? p.amount.cents : null))).toEqual([1001, 600, 400]);
  });

  it('gives leftover cents from 1st place down, not by largest remainder', async () => {
    const gameId = await tournamentAtPayouts(2, '0.01');
    await app.planning.choosePayoutPreset(gameId, 'top2');
    // Exact shares 1.4 and 0.6 cents: the cash rule would give 0.01 / 0.01.
    expect(amounts(gameId)).toEqual(['EUR 0.02', 'EUR 0.00']);
  });

  it('shows “—” without a buy-in or while the schedule is invalid', async () => {
    const gameId = await tournamentAtPayouts(6);
    await app.planning.setSettingText(gameId, 'buyIn', '');
    const p = payouts(gameId);
    expect(p.prizePool).toEqual({ kind: 'noBuyIn', label: 'Add a buy-in' });
    expect(p.preset.name).toBe('Top 2');
    expect(amounts(gameId)).toEqual(['—', '—']);

    await app.planning.setSettingText(gameId, 'buyIn', '20');
    expect(amounts(gameId)).toEqual(['EUR 84.00', 'EUR 36.00']);
    await typeShares(gameId, ['70', '20']);
    expect(amounts(gameId)).toEqual(['—', '—']);
    expect(payouts(gameId).places.map((place) => place.barPercent)).toEqual([70, 20]);
  });
});

describe('mode switch', () => {
  it('hides the step in Cash game and keeps the schedule for when it comes back', async () => {
    const gameId = await tournamentAtPayouts(6);
    await typeShares(gameId, ['60', '25', '']);
    expectStatus(await app.planning.changeMode(gameId, 'cash'), 'accepted');
    let v = view(gameId);
    expect(v.steps.map((s) => s.id)).not.toContain('payouts');
    expect(v.preview.blockers).toEqual([]);
    expect(expectStatus(await app.planning.continueFromStep(gameId, 'payouts'), 'rejected').reason.code).toBe('stepNotInMode');

    await removePlayers(gameId, 4);
    app = await harness.restart(app);
    expectStatus(await app.planning.changeMode(gameId, 'tournament'), 'accepted');
    await app.planning.goToStep(gameId, 'payouts');
    v = view(gameId);
    expect(shares(gameId)).toEqual(['60', '25', '']);
    expect(v.payoutSchedule.preset.name).toBe('Custom');
    expect(v.payoutSchedule.tooManyPlaces?.problem.message).toBe('3 paid places, but only 2 players.');
  });
});

describe('Distribution preview', () => {
  it('lists a missing or invalid schedule with the approved reasons', async () => {
    const gameId = await tournamentAtPayouts(3);
    const reason = () => payoutBlocker(gameId)?.problems[0].message ?? null;
    expect(reason()).toBeNull();
    expect(view(gameId).preview.setupComplete).toBe(true);

    await typeShares(gameId, ['50', '30', '15']);
    expect(reason()).toBe('Total is 95%, needs 100%.');
    await typeShares(gameId, ['50', '', '20']);
    expect(reason()).toBe('2nd place: Enter a percentage.');
    expect(payoutBlocker(gameId)?.title).toBe('Payout schedule');
    await app.planning.choosePayoutPreset(gameId, 'top3');
    await app.planning.createSavedPlayerAndAdd(gameId, 'Dan');
    await app.planning.choosePayoutPreset(gameId, 'top4');
    await removePlayers(gameId, 1);
    expect(reason()).toBe('4 paid places, but only 3 players.');
    expect(view(gameId).preview.setupComplete).toBe(false);
  });

  it('opens the step from the preview and returns there once valid', async () => {
    const gameId = await tournamentAtPayouts(6);
    expect(await continueTo(gameId, 'payouts')).toBe('preview');
    expectStatus(await app.planning.goToStep(gameId, 'payouts', { fromPreview: true }), 'accepted');
    expect(view(gameId).returnToPreview).toBe(true);
    await typeShares(gameId, ['50', '30']);
    expectStatus(await app.planning.continueFromStep(gameId, 'payouts'), 'stepInvalid');

    app = await harness.restart(app);
    expect(view(gameId).returnToPreview).toBe(true);
    await app.planning.choosePayoutPreset(gameId, 'top2');
    expect(await continueTo(gameId, 'payouts')).toBe('preview');
    expect(view(gameId).returnToPreview).toBe(false);
    expect(shares(gameId)).toEqual(['70', '30']);
  });
});
