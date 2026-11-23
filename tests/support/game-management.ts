import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ChipColor } from '@/domain/types';
import { createGameManagement, type GameManagement } from '@/game-management';
import { createFileStore } from '@/game-management/storage/file-store';

/**
 * A real file-backed store in a fresh temp directory. `open()` creates the application on it;
 * calling `open()` again simulates an app restart on the same saved data.
 * Ids are `id-1`, `id-2`, ... and the clock advances one minute per reading, across restarts.
 */
export async function createTestHarness() {
  const directory = await mkdtemp(path.join(tmpdir(), 'poker-planner-test-'));
  let idCounter = 0;
  let minutes = 0;
  const start = Date.UTC(2026, 10, 23, 18, 0);
  const harness = {
    directory,
    store: () => createFileStore(directory),
    async open(): Promise<GameManagement> {
      return createGameManagement({
        store: createFileStore(directory),
        newId: () => `id-${++idCounter}`,
        now: () => new Date(start + minutes++ * 60_000),
      });
    },
    /** Waits for pending commits, then opens a fresh application on the same store. */
    async restart(app: GameManagement): Promise<GameManagement> {
      await app.persistence.flush();
      return harness.open();
    },
    cleanup: () => rm(directory, { recursive: true, force: true }),
  };
  return harness;
}

export type TestHarness = Awaited<ReturnType<typeof createTestHarness>>;

/** Fails the test unless `result.status` is `status`, and narrows the type. */
export function expectStatus<R extends { status: string }, S extends R['status']>(
  result: R,
  status: S,
): Extract<R, { status: S }> {
  if (result.status !== status) {
    throw new Error(`Expected status "${status}" but got ${JSON.stringify(result)}`);
  }
  return result as Extract<R, { status: S }>;
}

/** Creates a game with players captured into it, reusing saved players of the same name. */
export async function gameWithPlayers(app: GameManagement, mode: 'cash' | 'tournament', names: string[]) {
  const { gameId } = await app.games.create(mode);
  for (const name of names) {
    const saved = app.savedPlayers.list().find((p) => p.name === name);
    if (saved) expectStatus(await app.planning.addSavedPlayers(gameId, [saved.id]), 'accepted');
    else expectStatus(await app.planning.createSavedPlayerAndAdd(gameId, name), 'accepted');
  }
  return gameId;
}

/** Adds chip rows (value, quantity) to a game. Returns the row ids. */
export async function addChipRows(app: GameManagement, gameId: string, rows: [string, string][]) {
  const ids: string[] = [];
  for (const [value, quantity] of rows) {
    const { rowId } = expectStatus(await app.planning.addChipRow(gameId), 'accepted');
    await app.planning.setChipValueText(gameId, rowId, value);
    await app.planning.setChipQuantityText(gameId, rowId, quantity);
    ids.push(rowId);
  }
  return ids;
}

export interface PlanSetup {
  players: string[];
  /** (value, quantity) rows, typed in this order. */
  chips: [string, string][];
  buyIn?: string;
  depth?: string;
  coverage?: string;
  /** Typed into the reserve field (custom); omitted: automatic. */
  reserve?: string;
  preference?: 'fewer' | 'more';
  /** Colours of the chip rows, in the order of `chips` (omitted: No color). */
  colors?: (ChipColor | null)[];
}

/**
 * A game set up through the wizard and standing on Distribution preview, as a host would do it.
 * Tournaments keep the suggested payout preset.
 */
export async function plannedGame(app: GameManagement, mode: 'cash' | 'tournament', setup: PlanSetup) {
  const gameId = await gameWithPlayers(app, mode, setup.players);
  const rowIds = await addChipRows(app, gameId, setup.chips);
  for (const [index, color] of (setup.colors ?? []).entries()) {
    if (color) expectStatus(await app.planning.setChipColor(gameId, rowIds[index], color), 'accepted');
  }
  await app.planning.setSettingText(gameId, 'buyIn', setup.buyIn ?? '20');
  if (setup.depth !== undefined) await app.planning.setSettingText(gameId, 'depth', setup.depth);
  if (setup.coverage !== undefined) await app.planning.setSettingText(gameId, 'coverage', setup.coverage);
  if (setup.reserve !== undefined) await app.planning.setSettingText(gameId, 'reserve', setup.reserve);
  if (setup.preference) await app.planning.setDistributionPreference(gameId, setup.preference);
  expectStatus(await app.planning.continueFromStep(gameId, 'players'), 'accepted');
  expectStatus(await app.planning.completeChipSetStep(gameId, { kind: 'onlyThisGame' }), 'accepted');
  let step = expectStatus(await app.planning.continueFromStep(gameId, 'settings'), 'accepted').nextStep;
  if (step === 'payouts') step = expectStatus(await app.planning.continueFromStep(gameId, 'payouts'), 'accepted').nextStep;
  if (step !== 'preview') throw new Error(`Expected to reach the preview, got ${step}`);
  return gameId;
}

/** Everything a host can observe about one game and the working location. */
export function observe(app: GameManagement, gameId: string) {
  return {
    card: app.games.get(gameId),
    planning: app.planning.getView(gameId),
    preview: app.planning.getDistributionPreview(gameId),
    play: app.play.getView(gameId),
    location: app.location.get(),
  };
}

/**
 * Writes play records that have no public operation yet (confirmed results, count drafts) straight
 * into the saved game document, then reopens the application on it. Stand-in until the results
 * operations exist; use only to set up what other features record.
 */
export async function withSavedPlayRecords(
  harness: TestHarness,
  app: GameManagement,
  gameId: string,
  records: {
    results?: { participantId: string; counts: number[] }[];
    countDrafts?: { participantId: string; quantityTexts: string[] }[];
  },
): Promise<GameManagement> {
  await app.persistence.flush();
  const store = harness.store();
  const documents = await store.loadAll();
  const key = [...documents.keys()].find((k) => k.endsWith(gameId));
  if (!key) throw new Error(`No saved game ${gameId}`);
  const game = JSON.parse(documents.get(key)!) as {
    play: {
      terms: { chipSet: { value: number }[] };
      results?: unknown[];
      countDrafts?: unknown[];
    };
  };
  const { play } = game;
  if (records.results) {
    play.results = [
      ...(play.results ?? []),
      ...records.results.map((r) => ({
        participantId: r.participantId,
        mix: play.terms.chipSet.map((d, i) => ({ value: d.value, count: r.counts[i] })),
        confirmedAt: '2026-11-23T20:00:00.000Z',
      })),
    ];
  }
  if (records.countDrafts) play.countDrafts = [...(play.countDrafts ?? []), ...records.countDrafts];
  await store.commit([{ key, text: JSON.stringify(game) }]);
  return harness.open();
}

/** Starts a planned game on its recommended plan. Returns the participant ids in joining order. */
export async function startPlannedGame(app: GameManagement, gameId: string): Promise<string[]> {
  const preview = app.planning.getDistributionPreview(gameId)!;
  if (preview.distribution.kind !== 'planned') throw new Error('Expected a feasible plan');
  const { plan } = preview.distribution;
  expectStatus(await app.planning.start(gameId, { depthBb: plan.depth.bb, reserveStacks: plan.reserve.stacks }), 'accepted');
  return app.play.getView(gameId)!.players.map((p) => p.id);
}

/** Types, reviews and confirms one participant's complete final chip count (quantities ascending by value). */
export async function recordCount(app: GameManagement, gameId: string, participantId: string, counts: readonly number[]) {
  const editor = app.play.getCountEditor(gameId, participantId)!;
  for (const [i, entry] of editor.entries.entries()) {
    expectStatus(await app.play.setCountText(gameId, participantId, entry.value, String(counts[i])), 'accepted');
  }
  const review = expectStatus(app.play.reviewCount(gameId, participantId), 'needsConfirmation');
  expectStatus(
    await app.play.confirmResult(gameId, participantId, { counts: review.confirmation.mix.map((c) => c.count) }),
    'accepted',
  );
}
