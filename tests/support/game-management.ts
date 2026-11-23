import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

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
}

/**
 * A game set up through the wizard and standing on Distribution preview, as a host would do it.
 * Tournaments keep the suggested payout preset.
 */
export async function plannedGame(app: GameManagement, mode: 'cash' | 'tournament', setup: PlanSetup) {
  const gameId = await gameWithPlayers(app, mode, setup.players);
  await addChipRows(app, gameId, setup.chips);
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
