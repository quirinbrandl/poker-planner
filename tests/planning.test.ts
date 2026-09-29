import { afterEach, expect, test } from 'vitest';
import { isolatedStore } from './support/local-store';

const stores: ReturnType<typeof isolatedStore>[] = [];
function openStore() {
  const store = isolatedStore();
  stores.push(store);
  return store;
}
afterEach(() => {
  for (const store of stores.splice(0)) store.dispose();
});

test('raw invalid setup and its field-level feedback survive restart without affecting another game', () => {
  const store = openStore();
  const games = store.open();
  const cash = games.createPlan('cash').game;
  const other = games.createPlan('tournament').game;
  const changes = {
    title: 'Friday at home',
    mode: 'tournament' as const,
    buyInCents: '20.005',
    requestedStackDepth: '99.5',
    blindPaymentCoverage: '0',
    distributionPreference: 'maximize' as const,
    reserve: { mode: 'explicit' as const, stacks: '-1' },
  };

  expect(
    games.editPlan(cash.id, { type: 'set-details', changes }),
  ).toMatchObject({
    status: 'saved-invalid',
    game: {
      ...changes,
      reserveTarget: null,
      fieldErrors: {
        buyInCents: expect.any(String),
        requestedStackDepth: expect.any(String),
        blindPaymentCoverage: expect.any(String),
        reserve: expect.any(String),
      },
    },
  });
  const saved = games.getPlan(cash.id);
  games.close();
  const restarted = store.open();
  expect(restarted.getPlan(cash.id)).toEqual(saved);
  expect(restarted.getPlan(other.id)).toEqual(other);
});

test('participants retain identity and joining order through renaming, removal, and restart', () => {
  const store = openStore();
  const games = store.open();
  const id = games.createPlan('cash').game.id;
  games.editPlan(id, { type: 'add-participant', name: 'Alice' });
  games.editPlan(id, { type: 'add-participant', name: 'Bob' });
  games.editPlan(id, { type: 'add-participant', name: 'Carol' });
  const [alice, bob, carol] = games.getPlan(id)!.participants;
  expect(new Set([alice!.id, bob!.id, carol!.id]).size).toBe(3);
  expect(games.getPlan(id)?.reserveTarget).toBe(2);

  games.editPlan(id, {
    type: 'rename-participant',
    participantId: alice!.id,
    name: 'Zoe',
  });
  games.editPlan(id, { type: 'remove-participant', participantId: carol!.id });
  expect(games.getPlan(id)?.reserveTarget).toBe(1);
  games.editPlan(id, { type: 'add-participant', name: 'Aaron' });
  expect(games.getPlan(id)?.participants).toEqual([
    { ...alice, name: 'Zoe' },
    bob,
    { id: expect.any(String), name: 'Aaron', joiningOrder: 3 },
  ]);
  expect(games.getPlan(id)?.reserveTarget).toBe(2);
  const saved = games.getPlan(id);
  games.close();
  expect(store.open().getPlan(id)).toEqual(saved);
});

test('blank and duplicate display names remain saved drafts with errors on the affected participants', () => {
  const store = openStore();
  const games = store.open();
  const id = games.createPlan('tournament').game.id;
  games.editPlan(id, { type: 'add-participant', name: 'Alice' });
  games.editPlan(id, { type: 'add-participant', name: ' alice ' });
  games.editPlan(id, { type: 'add-participant', name: '' });
  const [first, duplicate, blank] = games.getPlan(id)!.participants;
  expect(games.getPlan(id)?.fieldErrors).toMatchObject({
    [`participants.${first!.id}.name`]: expect.stringContaining('unique'),
    [`participants.${duplicate!.id}.name`]: expect.stringContaining('unique'),
    [`participants.${blank!.id}.name`]: expect.stringContaining('name'),
  });
  games.close();
  const restarted = store.open();
  expect(restarted.getPlan(id)?.participants[1]?.name).toBe(' alice ');
  expect(
    restarted.getPlan(id)?.fieldErrors[`participants.${duplicate!.id}.name`],
  ).toBeDefined();
  restarted.editPlan(id, {
    type: 'rename-participant',
    participantId: duplicate!.id,
    name: 'Bob',
  });
  expect(
    restarted.getPlan(id)?.fieldErrors[`participants.${first!.id}.name`],
  ).toBeUndefined();
  expect(
    restarted.getPlan(id)?.fieldErrors[`participants.${duplicate!.id}.name`],
  ).toBeUndefined();
});

test('chip rows preserve invalid quantities and denominations, then accept corrected setup', () => {
  const store = openStore();
  const games = store.open();
  const id = games.createPlan('cash').game.id;
  games.editPlan(id, {
    type: 'set-details',
    changes: { title: 'Friday', buyInCents: '2000' },
  });
  games.editPlan(id, { type: 'add-participant', name: 'Alice' });
  games.editPlan(id, { type: 'add-chip' });
  const chip = games.getPlan(id)!.chips[0]!;
  expect(chip).toMatchObject({ value: '', quantity: '' });
  games.editPlan(id, {
    type: 'edit-chip',
    chipId: chip.id,
    changes: { value: '1.5', quantity: '-1' },
  });
  const invalid = games.getPlan(id);
  expect(invalid?.fieldErrors).toMatchObject({
    [`chips.${chip.id}.value`]: expect.any(String),
    [`chips.${chip.id}.quantity`]: expect.any(String),
  });
  games.close();
  const restarted = store.open();
  expect(restarted.getPlan(id)).toEqual(invalid);
  expect(
    restarted.editPlan(id, {
      type: 'edit-chip',
      chipId: chip.id,
      changes: { value: '25', quantity: '0' },
    }),
  ).toMatchObject({
    status: 'saved',
    game: { phase: 'planning', fieldErrors: {} },
  });
  restarted.editPlan(id, { type: 'remove-chip', chipId: chip.id });
  expect(restarted.getPlan(id)?.fieldErrors.chips).toBeDefined();
});

test('duplicate chip denominations need correction without merging or losing their quantities', () => {
  const store = openStore();
  const games = store.open();
  const id = games.createPlan('cash').game.id;
  games.editPlan(id, { type: 'add-chip' });
  games.editPlan(id, { type: 'add-chip' });
  const [first, second] = games.getPlan(id)!.chips;
  games.editPlan(id, {
    type: 'edit-chip',
    chipId: first!.id,
    changes: { value: '25', quantity: '40' },
  });
  games.editPlan(id, {
    type: 'edit-chip',
    chipId: second!.id,
    changes: { value: '025', quantity: '10' },
  });
  const saved = games.getPlan(id);
  expect(saved?.fieldErrors).toMatchObject({
    [`chips.${first!.id}.value`]: expect.stringContaining('unique'),
    [`chips.${second!.id}.value`]: expect.stringContaining('unique'),
  });
  games.close();
  const restarted = store.open();
  expect(restarted.getPlan(id)).toEqual(saved);
  restarted.editPlan(id, {
    type: 'edit-chip',
    chipId: second!.id,
    changes: { value: '100' },
  });
  expect(
    restarted.getPlan(id)?.fieldErrors[`chips.${first!.id}.value`],
  ).toBeUndefined();
  expect(restarted.getPlan(id)?.chips).toEqual([
    { id: first!.id, value: '25', quantity: '40' },
    { id: second!.id, value: '100', quantity: '10' },
  ]);
});

test.each(['cash', 'tournament'] as const)(
  'an explicit reserve, including zero, survives roster edits and restart in %s mode',
  (mode) => {
    const store = openStore();
    let games = store.open();
    const id = games.createPlan(mode).game.id;
    games.editPlan(id, { type: 'add-participant', name: 'Alice' });
    games.editPlan(id, {
      type: 'set-details',
      changes: { reserve: { mode: 'explicit', stacks: '0' } },
    });
    games.editPlan(id, { type: 'add-participant', name: 'Bob' });
    games.editPlan(id, { type: 'add-participant', name: 'Carol' });
    games.close();
    games = store.open();
    expect(games.getPlan(id)).toMatchObject({
      reserve: { mode: 'explicit', stacks: '0' },
      reserveTarget: 0,
    });
    games.editPlan(id, {
      type: 'set-details',
      changes: { reserve: { mode: 'explicit', stacks: '7' } },
    });
    games.editPlan(id, { type: 'add-participant', name: 'Dan' });
    expect(games.getPlan(id)?.reserveTarget).toBe(7);
    games.editPlan(id, {
      type: 'set-details',
      changes: { reserve: { mode: 'automatic' } },
    });
    expect(games.getPlan(id)?.reserveTarget).toBe(2);
    games.editPlan(id, { type: 'add-participant', name: 'Eve' });
    expect(games.getPlan(id)?.reserveTarget).toBe(3);
  },
);

test.each([
  '',
  ' ',
  '-1',
  '1.5',
  '1e2',
  '1,000',
  '12chips',
  '1\n',
  '9007199254740992',
])('malformed numeric input %j is preserved, not coerced', (raw) => {
  const store = openStore();
  const games = store.open();
  const id = games.createPlan('cash').game.id;
  games.editPlan(id, { type: 'add-chip' });
  const chipId = games.getPlan(id)!.chips[0]!.id;
  games.editPlan(id, {
    type: 'set-details',
    changes: {
      buyInCents: raw,
      requestedStackDepth: raw,
      blindPaymentCoverage: raw,
      reserve: { mode: 'explicit', stacks: raw },
    },
  });
  games.editPlan(id, {
    type: 'edit-chip',
    chipId,
    changes: { value: raw, quantity: raw },
  });
  games.close();
  expect(store.open().getPlan(id)).toMatchObject({
    buyInCents: raw,
    requestedStackDepth: raw,
    blindPaymentCoverage: raw,
    reserve: { mode: 'explicit', stacks: raw },
    reserveTarget: null,
    chips: [{ id: chipId, value: raw, quantity: raw }],
    fieldErrors: {
      buyInCents: expect.any(String),
      requestedStackDepth: expect.any(String),
      blindPaymentCoverage: expect.any(String),
      reserve: expect.any(String),
      [`chips.${chipId}.value`]: expect.any(String),
      [`chips.${chipId}.quantity`]: expect.any(String),
    },
  });
});

test('positive minimums and tournament roster validation do not erase invalid setup', () => {
  const games = openStore().open();
  const id = games.createPlan('tournament').game.id;
  games.editPlan(id, { type: 'add-participant', name: 'Alice' });
  games.editPlan(id, { type: 'add-chip' });
  const chipId = games.getPlan(id)!.chips[0]!.id;
  games.editPlan(id, {
    type: 'edit-chip',
    chipId,
    changes: { value: '0', quantity: '0' },
  });
  games.editPlan(id, {
    type: 'set-details',
    changes: {
      title: 'Heads up',
      buyInCents: '0',
      requestedStackDepth: '0',
      blindPaymentCoverage: '0',
    },
  });
  expect(games.getPlan(id)?.fieldErrors).toEqual({
    participants: 'Add at least 2 participants.',
    buyInCents: expect.any(String),
    requestedStackDepth: expect.any(String),
    blindPaymentCoverage: expect.any(String),
    [`chips.${chipId}.value`]: expect.any(String),
  });
  games.editPlan(id, { type: 'add-participant', name: 'Bob' });
  games.editPlan(id, {
    type: 'edit-chip',
    chipId,
    changes: { value: '1', quantity: '100' },
  });
  expect(
    games.editPlan(id, {
      type: 'set-details',
      changes: {
        buyInCents: '0001',
        requestedStackDepth: '1',
        blindPaymentCoverage: '1',
      },
    }),
  ).toMatchObject({
    status: 'saved',
    game: { buyInCents: '0001', fieldErrors: {} },
  });
});

test('setup edits cannot overwrite stable identity, roster, creation time, or lifecycle via extra snapshot fields', () => {
  const games = openStore().open();
  const id = games.createPlan('cash').game.id;
  games.editPlan(id, { type: 'add-participant', name: 'Alice' });
  games.editPlan(id, { type: 'add-chip' });
  const original = games.getPlan(id)!;
  // Structural TypeScript values may carry more fields than PlanningSetup.
  const changes = {
    ...original,
    id: 'replacement',
    phase: 'in-progress',
    createdAt: 'yesterday',
    title: 'Renamed',
    participants: [],
  };
  games.editPlan(id, { type: 'set-details', changes });
  expect(games.getPlan(id)).toEqual({
    ...original,
    title: 'Renamed',
    fieldErrors: expect.any(Object),
  });
  const chip = original.chips[0]!;
  const chipChanges = { ...chip, id: 'replacement', value: '5' };
  games.editPlan(id, {
    type: 'edit-chip',
    chipId: chip.id,
    changes: chipChanges,
  });
  expect(games.getPlan(id)?.chips[0]).toEqual({ ...chip, value: '5' });
});

test('safe rejections do not change either game, including after restart', () => {
  const store = openStore();
  const games = store.open();
  const first = games.createPlan('cash').game;
  const second = games.createPlan('tournament').game;
  games.editPlan(first.id, { type: 'add-participant', name: 'Alice' });
  games.editPlan(first.id, { type: 'add-chip' });
  const saved = games.listPlans();
  const participantId = games.getPlan(first.id)!.participants[0]!.id;
  const chipId = games.getPlan(first.id)!.chips[0]!.id;
  expect(
    games.editPlan('missing', {
      type: 'set-details',
      changes: { title: 'Lost' },
    }),
  ).toMatchObject({ status: 'rejected', reason: expect.any(String) });
  expect(
    games.editPlan(second.id, {
      type: 'rename-participant',
      participantId,
      name: 'Bob',
    }),
  ).toMatchObject({ status: 'rejected', reason: expect.any(String) });
  expect(
    games.editPlan(second.id, {
      type: 'edit-chip',
      chipId,
      changes: { value: '25' },
    }),
  ).toMatchObject({ status: 'rejected', reason: expect.any(String) });
  expect(
    games.editPlan(second.id, { type: 'remove-participant', participantId }),
  ).toMatchObject({ status: 'rejected' });
  expect(
    games.editPlan(second.id, { type: 'remove-chip', chipId }),
  ).toMatchObject({ status: 'rejected' });
  expect(games.listPlans()).toEqual(saved);
  games.close();
  expect(store.open().listPlans()).toEqual(saved);
});

test('separate application connections edit the current record without losing other saved fields', () => {
  const store = openStore();
  const first = store.open();
  const second = store.open();
  const id = first.createPlan('cash').game.id;
  const earlierSnapshot = first.getPlan(id);
  second.editPlan(id, { type: 'set-details', changes: { title: 'Friday' } });
  first.editPlan(id, { type: 'set-details', changes: { buyInCents: '2000' } });
  expect(second.getPlan(id)).toMatchObject({
    title: 'Friday',
    buyInCents: '2000',
  });
  expect(earlierSnapshot).toMatchObject({ title: '', buyInCents: '' });
  // A caller may sort or edit its snapshot without mutating saved poker data.
  earlierSnapshot!.title = 'Not saved';
  expect(first.getPlan(id)?.title).toBe('Friday');
});

test('configuration begins with independent, durable Planning games in both modes', () => {
  const store = openStore();
  const games = store.open();
  const cash = games.createPlan('cash');
  const tournament = games.createPlan('tournament');

  expect(cash.status).toBe('saved-invalid');
  expect(tournament.status).toBe('saved-invalid');
  expect(cash.game).toMatchObject({
    phase: 'planning',
    mode: 'cash',
    title: '',
    participants: [],
    chips: [],
    buyInCents: '',
    requestedStackDepth: '100',
    blindPaymentCoverage: '4',
    distributionPreference: 'minimize',
    reserve: { mode: 'automatic' },
    reserveTarget: 0,
  });
  expect(cash.game.id).not.toBe(tournament.game.id);
  expect(Number.isNaN(Date.parse(cash.game.createdAt))).toBe(false);
  expect(tournament.game).toMatchObject({
    mode: 'tournament',
    requestedStackDepth: '100',
    blindPaymentCoverage: '4',
  });
  games.close();

  const restarted = store.open();
  expect(restarted.getPlan(cash.game.id)).toEqual(cash.game);
  expect(restarted.getPlan(tournament.game.id)).toEqual(tournament.game);
  expect(
    restarted
      .listPlans()
      .map((game) => game.id)
      .sort(),
  ).toEqual([cash.game.id, tournament.game.id].sort());
});
