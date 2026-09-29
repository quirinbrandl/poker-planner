export type GameMode = 'cash' | 'tournament';
export type DistributionPreference = 'minimize' | 'maximize';
export type Reserve =
  { mode: 'automatic' } | { mode: 'explicit'; stacks: string };

export interface Participant {
  id: string;
  name: string;
  joiningOrder: number;
}

export interface ChipDenomination {
  id: string;
  value: string;
  quantity: string;
}

export interface PlanningSetup {
  title: string;
  mode: GameMode;
  buyInCents: string;
  requestedStackDepth: string;
  blindPaymentCoverage: string;
  distributionPreference: DistributionPreference;
  reserve: Reserve;
}

export interface PlanningGame extends PlanningSetup {
  id: string;
  phase: 'planning';
  createdAt: string;
  participants: Participant[];
  chips: ChipDenomination[];
  reserveTarget: number | null;
  fieldErrors: Record<string, string>;
}

export type PlanningEdit =
  | { type: 'set-details'; changes: Partial<PlanningSetup> }
  | { type: 'add-participant'; name: string }
  | { type: 'rename-participant'; participantId: string; name: string }
  | { type: 'remove-participant'; participantId: string }
  | { type: 'add-chip' }
  | {
      type: 'edit-chip';
      chipId: string;
      changes: Partial<Pick<ChipDenomination, 'value' | 'quantity'>>;
    }
  | { type: 'remove-chip'; chipId: string };
export type Rejection = { status: 'rejected'; reason: string };

export type PlanningSave = {
  status: 'saved' | 'saved-invalid';
  game: PlanningGame;
};

// The persistence seam has two real adapters: Expo SQLite and Node SQLite.
// Callers supply an opened, dedicated database once, never coordinate writes.
export interface LocalDatabase {
  execSync(sql: string): void;
  runSync(sql: string, ...params: (string | number)[]): unknown;
  getFirstSync<T>(sql: string, ...params: (string | number)[]): T | null;
  getAllSync<T>(sql: string, ...params: (string | number)[]): T[];
  closeSync(): void;
}

interface StoredGame extends PlanningSetup {
  id: string;
  phase: 'planning';
  createdAt: string;
  participants: Participant[];
  chips: ChipDenomination[];
  nextJoiningOrder: number;
}

function wholeNumber(raw: string, minimum: number): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const number = Number(raw);
  return Number.isSafeInteger(number) && number >= minimum ? number : null;
}

function view(game: StoredGame): PlanningGame {
  const { nextJoiningOrder: _, ...plan } = game;
  const fieldErrors: Record<string, string> = {};
  if (!game.title.trim()) fieldErrors.title = 'Enter a game name.';
  const minimumParticipants = game.mode === 'tournament' ? 2 : 1;
  if (game.participants.length < minimumParticipants) {
    fieldErrors.participants = `Add at least ${minimumParticipants} participant${minimumParticipants === 1 ? '' : 's'}.`;
  }
  const names = game.participants.map((participant) =>
    participant.name.normalize('NFKC').trim().toLowerCase(),
  );
  game.participants.forEach((participant, index) => {
    const name = names[index];
    const field = `participants.${participant.id}.name`;
    if (!name) fieldErrors[field] = 'Enter a participant name.';
    else if (names.indexOf(name) !== names.lastIndexOf(name)) {
      fieldErrors[field] =
        'Use a unique participant name within this game (ignoring case).';
    }
  });
  if (!game.chips.length) fieldErrors.chips = 'Add a chip denomination.';
  const denominations = game.chips.map((chip) => wholeNumber(chip.value, 1));
  for (const chip of game.chips) {
    const value = wholeNumber(chip.value, 1);
    if (value === null) {
      fieldErrors[`chips.${chip.id}.value`] =
        'Enter positive whole-number chip units.';
    } else if (
      denominations.indexOf(value) !== denominations.lastIndexOf(value)
    ) {
      fieldErrors[`chips.${chip.id}.value`] =
        'Use a unique chip-unit denomination.';
    }
    if (wholeNumber(chip.quantity, 0) === null) {
      fieldErrors[`chips.${chip.id}.quantity`] =
        'Enter a nonnegative whole number of chips.';
    }
  }
  if (wholeNumber(game.buyInCents, 1) === null) {
    fieldErrors.buyInCents = 'Enter a positive whole number of EUR cents.';
  }
  if (wholeNumber(game.requestedStackDepth, 1) === null) {
    fieldErrors.requestedStackDepth = 'Enter a positive whole number of BB.';
  }
  if (wholeNumber(game.blindPaymentCoverage, 1) === null) {
    fieldErrors.blindPaymentCoverage =
      'Enter a whole number of payments, at least 1.';
  }
  const reserveTarget =
    game.reserve.mode === 'automatic'
      ? Math.ceil(game.participants.length / 2)
      : wholeNumber(game.reserve.stacks, 0);
  if (reserveTarget === null)
    fieldErrors.reserve =
      'Enter a nonnegative whole number of reserved stacks.';
  return { ...plan, reserveTarget, fieldErrors };
}

function saved(game: StoredGame): PlanningSave {
  const result = view(game);
  return {
    status: Object.keys(result.fieldErrors).length ? 'saved-invalid' : 'saved',
    game: result,
  };
}

/** Owns setup validation and durable writes. Successful calls are already saved. */
export function createGameManagement(
  database: LocalDatabase,
  newId: () => string,
) {
  database.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA busy_timeout = 5000;
  `);
  const version = database.getFirstSync<{ user_version: number }>(
    'PRAGMA user_version',
  )?.user_version;
  if (version !== 0 && version !== 1)
    throw new Error(
      'Unsupported game database version. Update the app; do not reset your data.',
    );
  if (version === 0) {
    database.execSync('BEGIN IMMEDIATE');
    try {
      database.execSync(`
        CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, document TEXT NOT NULL);
        PRAGMA user_version = 1;
        COMMIT;
      `);
    } catch (error) {
      database.execSync('ROLLBACK');
      throw error;
    }
  }
  let closed = false;

  return {
    createPlan(mode: GameMode): PlanningSave {
      const game: StoredGame = {
        id: newId(),
        phase: 'planning',
        createdAt: new Date().toISOString(),
        title: '',
        mode,
        buyInCents: '',
        requestedStackDepth: '100',
        blindPaymentCoverage: '4',
        distributionPreference: 'minimize',
        reserve: { mode: 'automatic' },
        participants: [],
        chips: [],
        nextJoiningOrder: 0,
      };
      database.runSync(
        'INSERT INTO games (id, document) VALUES (?, ?)',
        game.id,
        JSON.stringify(game),
      );
      return saved(game);
    },
    editPlan(id: string, edit: PlanningEdit): PlanningSave | Rejection {
      database.execSync('BEGIN IMMEDIATE');
      try {
        const row = database.getFirstSync<{ document: string }>(
          'SELECT document FROM games WHERE id = ?',
          id,
        );
        if (!row) {
          database.execSync('ROLLBACK');
          return {
            status: 'rejected',
            reason: 'Game not found. Return to the game list.',
          };
        }
        const game: StoredGame = JSON.parse(row.document);
        switch (edit.type) {
          case 'set-details': {
            const {
              title = game.title,
              mode = game.mode,
              buyInCents = game.buyInCents,
              requestedStackDepth = game.requestedStackDepth,
              blindPaymentCoverage = game.blindPaymentCoverage,
              distributionPreference = game.distributionPreference,
              reserve = game.reserve,
            } = edit.changes;
            Object.assign(game, {
              title,
              mode,
              buyInCents,
              requestedStackDepth,
              blindPaymentCoverage,
              distributionPreference,
              reserve,
            });
            break;
          }
          case 'add-participant':
            game.participants.push({
              id: newId(),
              name: edit.name,
              joiningOrder: game.nextJoiningOrder++,
            });
            break;
          case 'rename-participant':
          case 'remove-participant': {
            const participant = game.participants.find(
              (item) => item.id === edit.participantId,
            );
            if (!participant) {
              database.execSync('ROLLBACK');
              return {
                status: 'rejected',
                reason: 'Participant not found. Reload this game.',
              };
            }
            if (edit.type === 'rename-participant')
              participant.name = edit.name;
            else
              game.participants = game.participants.filter(
                (item) => item.id !== edit.participantId,
              );
            break;
          }
          case 'add-chip':
            game.chips.push({ id: newId(), value: '', quantity: '' });
            break;
          case 'edit-chip':
          case 'remove-chip': {
            const chip = game.chips.find((item) => item.id === edit.chipId);
            if (!chip) {
              database.execSync('ROLLBACK');
              return {
                status: 'rejected',
                reason: 'Chip denomination not found. Reload this game.',
              };
            }
            if (edit.type === 'edit-chip') {
              const { value = chip.value, quantity = chip.quantity } =
                edit.changes;
              chip.value = value;
              chip.quantity = quantity;
            } else
              game.chips = game.chips.filter((item) => item.id !== edit.chipId);
            break;
          }
        }
        const result = saved(game);
        database.runSync(
          'UPDATE games SET document = ? WHERE id = ?',
          JSON.stringify(game),
          id,
        );
        database.execSync('COMMIT');
        return result;
      } catch (error) {
        database.execSync('ROLLBACK');
        throw error;
      }
    },
    getPlan(id: string): PlanningGame | null {
      const row = database.getFirstSync<{ document: string }>(
        'SELECT document FROM games WHERE id = ?',
        id,
      );
      return row ? view(JSON.parse(row.document)) : null;
    },
    listPlans(): PlanningGame[] {
      return database
        .getAllSync<{ document: string }>(
          'SELECT document FROM games ORDER BY rowid DESC',
        )
        .map((row) => view(JSON.parse(row.document)));
    },
    close() {
      if (!closed) {
        database.closeSync();
        closed = true;
      }
    },
  };
}

export type GameManagement = ReturnType<typeof createGameManagement>;
