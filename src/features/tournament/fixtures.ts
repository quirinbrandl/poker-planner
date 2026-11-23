/**
 * Development and test fixtures for the tournament screens. A tiny in-memory tournament (six players,
 * EUR 20 buy-in, Top 2 at 70 / 30, Bob with one rebuy) from which every display contract is derived,
 * so the numbers agree across screens. This stands in for game management on the dev route only:
 * the components never compute any of it.
 */
import { eurInputText, formatEur, formatSignedEur } from '@/domain/money';
import { placeLabel } from '@/domain/payouts';
import type { Cents } from '@/domain/types';

import type {
  BackInData,
  FinisherRow,
  ForgottenRebuyTournamentData,
  OrderChangeRow,
  OrderEditorData,
  PrizePoolChange,
  StillInPlayer,
  TournamentPlayData,
  TournamentPlayerResult,
  TournamentResultsData,
} from './types';

export interface FixturePlayer {
  id: string;
  name: string;
  rebuys: number;
}

export interface FixtureGame {
  /** Joining order. */
  players: readonly FixturePlayer[];
  /** Player ids, first one out first. */
  order: readonly string[];
  phase: 'inProgress' | 'completed';
  reopened: boolean;
  /** Payout shares in basis points, 1st first. */
  shares: readonly number[];
  buyIn: Cents;
  /** Reserve stacks still available. */
  reserveLeft: number;
}

const ROSTER: readonly FixturePlayer[] = [
  { id: 'alice', name: 'Alice', rebuys: 0 },
  { id: 'bob', name: 'Bob', rebuys: 1 },
  { id: 'clara', name: 'Clara', rebuys: 0 },
  { id: 'david', name: 'David', rebuys: 0 },
  { id: 'emma', name: 'Emma', rebuys: 0 },
  { id: 'felix', name: 'Felix', rebuys: 0 },
];

export function fixtureGame(order: readonly string[] = [], overrides: Partial<FixtureGame> = {}): FixtureGame {
  return {
    players: ROSTER,
    order,
    phase: 'inProgress',
    reopened: false,
    shares: [7000, 3000],
    buyIn: 2000 as Cents,
    reserveLeft: 2,
    ...overrides,
  };
}

// ----- derived facts (what game management would compute) -----

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
const nameOf = (game: FixtureGame, id: string) => game.players.find((p) => p.id === id)?.name ?? id;
const contribution = (game: FixtureGame, player: FixturePlayer) => (game.buyIn * (1 + player.rebuys)) as Cents;
const pool = (game: FixtureGame) => game.players.reduce((sum, p) => sum + contribution(game, p), 0) as Cents;
const rebuyCount = (game: FixtureGame) => game.players.reduce((sum, p) => sum + p.rebuys, 0);

function prizes(game: FixtureGame): Cents[] {
  const total = pool(game);
  const out = game.shares.map((share) => Math.floor((total * share) / 10000));
  let left = total - out.reduce((a, b) => a + b, 0);
  for (let i = 0; left > 0; left -= 1, i = (i + 1) % out.length) out[i] += 1;
  return out as Cents[];
}

const remaining = (game: FixtureGame, order = game.order) => game.players.filter((p) => !order.includes(p.id));
const winnerOf = (game: FixtureGame, order = game.order) => {
  const left = remaining(game, order);
  return left.length === 1 ? left[0] : null;
};
function placeOf(game: FixtureGame, id: string, order = game.order): number | null {
  const index = order.indexOf(id);
  if (index >= 0) return game.players.length - index;
  return winnerOf(game, order)?.id === id ? 1 : null;
}
const payoutAt = (game: FixtureGame, place: number | null): Cents | null =>
  place && place <= game.shares.length ? prizes(game)[place - 1] : null;
const payoutText = (game: FixtureGame, place: number | null) => {
  const amount = payoutAt(game, place);
  return amount === null ? 'No payout' : formatEur(amount);
};
const contributionText = (game: FixtureGame, player: FixturePlayer) =>
  `${formatEur(contribution(game, player))}${player.rebuys ? ` · ${plural(player.rebuys, 'rebuy')}` : ''}`;
const bestFirst = (order: readonly string[]) => [...order].reverse();
const frameContext = (game: FixtureGame) =>
  `Tournament · 23 Nov, 19:30${game.phase === 'completed' ? ' · finished 23:41' : ''}`;

// ----- Play -----

export function playData(game: FixtureGame): TournamentPlayData {
  const left = remaining(game);
  const winner = winnerOf(game);
  const count = left.length;
  const players: StillInPlayer[] = left.map((player) => {
    const other = count === 2 ? left.find((p) => p.id !== player.id) : undefined;
    return {
      playerId: player.id,
      name: player.name,
      contributionText: contributionText(game, player),
      elimination: {
        placeLabel: placeLabel(count),
        payoutText: payoutText(game, count),
        closesLateEntry: game.order.length === 0,
        winner: other ? { name: other.name, payoutText: payoutText(game, 1) } : null,
      },
    };
  });
  const rebuys = rebuyCount(game);
  const amounts = prizes(game);
  return {
    frame: { context: frameContext(game), backLabel: 'Games' },
    terms: [
      { label: 'Blinds', value: '1 / 2', unit: 'chip units' },
      { label: 'Rebuy', value: eurInputText(game.buyIn), unit: 'EUR' },
      { label: 'Stack', value: '200', unit: 'chip units' },
    ],
    prizePool: {
      amountText: formatEur(pool(game)),
      detail: `${plural(game.players.length, 'buy-in')}${rebuys ? ` + ${plural(rebuys, 'rebuy')}` : ''}`,
      rungs: game.shares.map((share, index) => {
        const place = index + 1;
        const holderId = place === 1 ? winner?.id : game.order[game.players.length - place];
        return {
          place,
          placeLabel: placeLabel(place),
          shareText: `${share / 100}%`,
          sharePercent: share / 100,
          amountText: formatEur(amounts[index]),
          holder: holderId ? { playerId: holderId, name: nameOf(game, holderId), isWinner: place === 1 } : null,
        };
      }),
    },
    stillIn: winner
      ? null
      : {
          count,
          summary: `Next out: ${placeLabel(count)}${count <= game.shares.length ? ` · ${payoutText(game, count)}` : ''}`,
          players,
          sameHandAvailable: count >= 3,
          nextPlaceLabels: Array.from({ length: count - 1 }, (_, i) => placeLabel(i + 2)),
        },
    winner: winner ? { playerId: winner.id, name: winner.name } : null,
    lateEntry:
      game.order.length === 0
        ? { status: 'open' }
        : {
            status: 'closed',
            eliminationsText: plural(game.order.length, 'elimination'),
            message: `Late entry closes once anyone is out (${plural(game.order.length, 'elimination')} recorded). It opens again only if every elimination is undone.`,
          },
    unpaidFinishers: bestFirst(game.order)
      .filter((id) => (placeOf(game, id) ?? 0) > game.shares.length)
      .map((id) => {
        const player = game.players.find((p) => p.id === id)!;
        return {
          playerId: id,
          name: player.name,
          placeLabel: placeLabel(placeOf(game, id)!),
          contributionText: contributionText(game, player),
          payoutText: 'No payout',
        };
      }),
    reserveText: plural(game.reserveLeft, 'reserve stack'),
  };
}

/** Fixture stand-in for recording eliminations: appends them, first one out first. */
export function withEliminations(game: FixtureGame, bestFirstIds: readonly string[]): FixtureGame {
  return { ...game, order: [...game.order, ...[...bestFirstIds].reverse()] };
}

// ----- Results -----

function finisherRow(game: FixtureGame, id: string): FinisherRow {
  const player = game.players.find((p) => p.id === id)!;
  const place = placeOf(game, id)!;
  return {
    playerId: id,
    name: player.name,
    placeLabel: placeLabel(place),
    paid: place <= game.shares.length,
    isWinner: place === 1,
    contributionText: contributionText(game, player),
    payoutText: payoutText(game, place),
  };
}

export function resultsData(game: FixtureGame): TournamentResultsData {
  const left = remaining(game);
  const winner = winnerOf(game);
  const needed = game.players.length - 1;
  const recorded = game.order.length;
  const ids = [...(winner ? [winner.id] : []), ...bestFirst(game.order)];
  return {
    phase: game.phase,
    frame: { context: frameContext(game), backLabel: 'Games' },
    status: winner
      ? {
          kind: 'winner',
          title: `${winner.name} wins`,
          description: `All ${needed} eliminations recorded · ${plural(game.players.length, 'player')}`,
        }
      : {
          kind: 'incomplete',
          ringText: `${recorded}/${needed}`,
          recorded,
          needed,
          title: `${left.length} still playing`,
          names: left.map((p) => p.name).join(', '),
          progressLabel: `${recorded} of ${needed} eliminations recorded`,
        },
    openPlaces: winner
      ? null
      : {
          rangeLabel: `1st–${placeLabel(left.length)}`,
          description: 'still playing',
        },
    finishers: ids.map((id) => finisherRow(game, id)),
    canEditOrder: game.phase === 'inProgress' && recorded > 0,
    calculate:
      game.phase === 'completed'
        ? { kind: 'readOnly' }
        : winner
          ? { kind: 'ready' }
          : {
              kind: 'blocked',
              stillPlayingText: plural(left.length, 'player'),
              message: 'Record eliminations until one player is left.',
            },
    reopened: game.reopened,
  };
}

// ----- Finishing order editor -----

/** The editor's draft: the order being edited and who was added as missed in it. */
export interface FixtureDraft {
  order: readonly string[];
  added: readonly string[];
}

export function startDraft(game: FixtureGame): FixtureDraft {
  return { order: game.order, added: [] };
}

/** What changes from the saved order to `next`: the save summary and the Back in the game? rows. */
function orderChanges(game: FixtureGame, next: readonly string[]): OrderChangeRow[] {
  const prev = game.order;
  const n = game.players.length;
  const elimPlace = (id: string, order: readonly string[]) => (order.includes(id) ? n - order.indexOf(id) : null);
  const money = (place: number) => payoutText(game, place).replace('No payout', 'no payout');
  const rows: OrderChangeRow[] = [];
  for (const player of game.players) {
    const before = elimPlace(player.id, prev);
    const after = elimPlace(player.id, next);
    if (before === after) continue;
    let value: string;
    if (before === null) value = `Out · ${placeLabel(after!)} · ${money(after!)}`;
    else if (after === null) value = `Back in (was ${placeLabel(before)})`;
    else {
      const moneyChanged = payoutAt(game, before) !== payoutAt(game, after);
      value = `${placeLabel(before)} → ${placeLabel(after)}${moneyChanged ? ` · ${money(after)}` : ''}`;
    }
    rows.push({ key: player.id, label: player.name, value });
  }
  const w0 = winnerOf(game, prev);
  const w1 = winnerOf(game, next);
  if (w0 && w0.id !== w1?.id) {
    rows.push({
      key: 'winner',
      label: 'Winner',
      struck: w0.name,
      value: w1 ? `→ ${w1.name}` : '· none yet',
      spokenValue: `${w0.name} withdrawn, ${w1 ? `now ${w1.name}` : 'none yet'}`,
    });
  } else if (w1 && !w0) {
    rows.push({ key: 'winner', label: 'Winner', value: `${w1.name} · ${payoutText(game, 1)}` });
  }
  if (prev.length === 0 && next.length > 0) rows.push({ key: 'entry', label: 'Late entry', value: 'Closes' });
  if (prev.length > 0 && next.length === 0) rows.push({ key: 'entry', label: 'Late entry', value: 'Opens again' });
  return rows;
}

export function editorData(game: FixtureGame, draft: FixtureDraft): OrderEditorData {
  const n = game.players.length;
  const order = draft.order;
  const left = remaining(game, order);
  const winner = winnerOf(game, order);
  const best = bestFirst(order);
  const changed = order.join() !== game.order.join();
  return {
    context: frameContext(game),
    hasChanges: changed,
    top: winner
      ? { kind: 'winner', placeLabel: '1st', name: winner.name }
      : { kind: 'stillPlaying', rangeLabel: `1st–${placeLabel(left.length)}`, names: left.map((p) => p.name).join(', ') },
    rows: best.map((id, index) => {
      const place = n - order.indexOf(id);
      const was = elimPlaceIn(game.order, id, n);
      const name = nameOf(game, id);
      return {
        playerId: id,
        name,
        placeLabel: placeLabel(place),
        marker: draft.added.includes(id)
          ? { kind: 'missed' }
          : was !== null && was !== place
            ? { kind: 'was', text: `was ${placeLabel(was)}` }
            : null,
        paid: place <= game.shares.length,
        payoutText: payoutText(game, place),
        canMoveUp: index > 0,
        canMoveDown: index < best.length - 1,
        moveUpLabel: `Move ${name} up to ${placeLabel(place - 1)}`,
        moveDownLabel: `Move ${name} down to ${placeLabel(place + 1)}`,
      };
    }),
    missed:
      left.length > 1
        ? {
            candidates: left.map((p) => ({ playerId: p.id, name: p.name })),
            slots: Array.from({ length: order.length + 1 }, (_, k) => {
              const before = order[k];
              const after = order[k - 1];
              const description =
                order.length === 0
                  ? 'first one out'
                  : k === 0
                    ? `out before ${nameOf(game, before)}`
                    : k === order.length
                      ? `out after ${nameOf(game, after)} (most recent)`
                      : `between ${nameOf(game, after)} and ${nameOf(game, before)}`;
              return { slotId: String(k), placeLabel: placeLabel(n - k), description };
            }).reverse(),
            defaultSlotId: String(order.length),
          }
        : null,
    changes: orderChanges(game, order),
  };
}

function elimPlaceIn(order: readonly string[], id: string, n: number): number | null {
  return order.includes(id) ? n - order.indexOf(id) : null;
}

/** The editor's intentions applied to the fixture draft (dev route only). */
export const draftIntents = {
  moveUp(draft: FixtureDraft, id: string): FixtureDraft {
    const i = draft.order.indexOf(id);
    if (i < 0 || i === draft.order.length - 1) return draft;
    const order = [...draft.order];
    [order[i], order[i + 1]] = [order[i + 1], order[i]];
    return { ...draft, order };
  },
  moveDown(draft: FixtureDraft, id: string): FixtureDraft {
    const i = draft.order.indexOf(id);
    if (i <= 0) return draft;
    const order = [...draft.order];
    [order[i], order[i - 1]] = [order[i - 1], order[i]];
    return { ...draft, order };
  },
  undo(draft: FixtureDraft, id: string): FixtureDraft {
    return { order: draft.order.filter((x) => x !== id), added: draft.added.filter((x) => x !== id) };
  },
  addMissed(draft: FixtureDraft, playerId: string, slotId: string): FixtureDraft {
    const order = [...draft.order];
    order.splice(Number(slotId), 0, playerId);
    return { order, added: [...draft.added, playerId] };
  },
};

// ----- Player page -----

export function playerResult(game: FixtureGame, id: string): TournamentPlayerResult | null {
  const player = game.players.find((p) => p.id === id);
  const place = placeOf(game, id);
  if (!player || place === null) return null;
  const payout = payoutAt(game, place) ?? 0;
  const balance = (payout - contribution(game, player)) as Cents;
  return {
    placeLabel: placeLabel(place),
    paid: place <= game.shares.length,
    statusText: place === 1 ? 'Winner · last player left' : `Out · ${placeLabel(place)} place`,
    balanceText: formatSignedEur(balance),
    direction: balance > 0 ? 'gain' : balance < 0 ? 'loss' : 'even',
    balanceCaption: balance > 0 ? 'Won' : balance < 0 ? 'Lost' : 'Break-even',
    payoutText: payoutText(game, place),
    contributionsText: formatEur(contribution(game, player)),
  };
}

export function backInData(game: FixtureGame, id: string): BackInData {
  const player = game.players.find((p) => p.id === id)!;
  return {
    name: player.name,
    changes: [
      ...orderChanges(
        game,
        game.order.filter((x) => x !== id),
      ),
      { key: 'buyIns', label: 'Buy-ins', value: `${formatEur(contribution(game, player))} · unchanged` },
    ],
  };
}

export function prizePoolAfterOneMore(game: FixtureGame): PrizePoolChange {
  return { beforeText: formatEur(pool(game)), afterText: formatEur((pool(game) + game.buyIn) as Cents) };
}

export function forgottenRebuyData(game: FixtureGame, id: string): ForgottenRebuyTournamentData {
  const after: FixtureGame = {
    ...game,
    players: game.players.map((p) => (p.id === id ? { ...p, rebuys: p.rebuys + 1 } : p)),
  };
  const list = (g: FixtureGame) => prizes(g).map(eurInputText).join(' / ');
  return {
    name: nameOf(game, id),
    placeLabel: placeLabel(placeOf(game, id)!),
    prizePool: prizePoolAfterOneMore(game),
    payouts: { beforeText: list(game), afterText: list(after) },
  };
}

// ----- named scenarios (the prototype's walk-throughs) -----

export const ORDERS = {
  open: [],
  midway: ['felix', 'david'],
  bubble: ['felix', 'david', 'emma'],
  heads: ['felix', 'david', 'emma', 'bob'],
  winner: ['felix', 'david', 'emma', 'bob', 'clara'],
} as const satisfies Record<string, readonly string[]>;
