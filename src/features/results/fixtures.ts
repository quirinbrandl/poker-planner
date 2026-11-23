/**
 * Development and test fixtures for the Results tab, internally consistent with the prototype:
 * EUR 20 per 200-unit stack, issued units = (players + rebuys) × 200.
 */
import type { Cents } from '@/domain/types';
import { BUY_IN, CONTEXT, eur, grouped, winLoss } from '@/features/count/fixtures';

import type { ResultsData, ResultsPlayerRow } from './types';

interface Player {
  name: string;
  rebuys?: number;
  /** Final chip units; `undefined` uncounted. */
  units?: number;
  draft?: boolean;
  correctionDraft?: boolean;
}

function rows(players: readonly Player[], buyIn: Cents = BUY_IN): ResultsPlayerRow[] {
  return players.map((player, index) => {
    const rebuys = player.rebuys ?? 0;
    const contributions = (buyIn * (1 + rebuys)) as Cents;
    const counted = player.units !== undefined;
    return {
      id: `p${index + 1}`,
      name: player.name,
      contributionText: `${eur(contributions)}${rebuys ? ` · ${rebuys} ${rebuys === 1 ? 'rebuy' : 'rebuys'}` : ''}`,
      state: counted ? 'result' : player.draft ? 'countDraft' : 'uncounted',
      correctionDraft: Boolean(player.correctionDraft),
      result: counted ? winLoss(player.units!, contributions, buyIn) : null,
    };
  });
}

function data(players: readonly Player[], extra: Partial<ResultsData> = {}, buyIn: Cents = BUY_IN): ResultsData {
  const issued = players.reduce((sum, p) => sum + 200 * (1 + (p.rebuys ?? 0)), 0);
  const uncounted = players.filter((p) => p.units === undefined);
  const counted = players.reduce((sum, p) => sum + (p.units ?? 0), 0);
  const difference = counted - issued;
  let status: ResultsData['status'];
  if (uncounted.length > 0) {
    status = {
      kind: 'toCount',
      title: `${uncounted.length} still to count`,
      namesText: uncounted.map((p) => p.name).join(', '),
      counted: players.length - uncounted.length,
      total: players.length,
    };
  } else if (difference !== 0) {
    const size = Math.abs(difference);
    status = {
      kind: difference < 0 ? 'missing' : 'tooMany',
      title: `${size} chip ${size === 1 ? 'unit' : 'units'} ${difference < 0 ? 'missing' : 'too many'}`,
      description: `${eur((size * buyIn) / 200)} · ${grouped(counted)} of ${grouped(issued)} counted. Recount, or correct a result.`,
    };
  } else {
    status = { kind: 'addsUp', description: `All ${players.length} counted · ${grouped(counted)} chip units` };
  }
  return { phase: 'inProgress', context: CONTEXT, backLabel: 'Games', reopened: false, status, players: rows(players, buyIn), ...extra };
}

const NAMES = ['Alice', 'Bob', 'Clara', 'David', 'Emma', 'Felix'];

/** 1 of 6 counted: Alice +EUR 5.00, Bob with a rebuy, Clara's count draft. */
const INCOMPLETE: Player[] = [
  { name: 'Alice', units: 250 },
  { name: 'Bob', rebuys: 1 },
  { name: 'Clara', draft: true },
  { name: 'David' },
  { name: 'Emma' },
  { name: 'Felix' },
];

/** 1,399 of 1,400: Clara one White chip short. */
const MISSING: Player[] = [
  { name: 'Alice', units: 250 },
  { name: 'Bob', rebuys: 1, units: 400 },
  { name: 'Clara', units: 199 },
  { name: 'David', units: 200 },
  { name: 'Emma', units: 200 },
  { name: 'Felix', units: 150 },
];

/** 1,600 of 1,600: the approved Payments story (+13 / −8 / +8 / −7 / −6 / 0). */
const BALANCED: Player[] = [
  { name: 'Alice', units: 330 },
  { name: 'Bob', rebuys: 1, units: 320 },
  { name: 'Clara', units: 280 },
  { name: 'David', rebuys: 1, units: 330 },
  { name: 'Emma', units: 140 },
  { name: 'Felix', units: 200 },
];

export const RESULTS_FIXTURES = {
  incomplete: data(INCOMPLETE),
  /** Nobody counted yet. */
  empty: data(NAMES.map((name) => ({ name }))),
  /** Open work on both kinds of rows: a correction draft on a result, a count draft. */
  drafts: data([{ name: 'Alice', units: 250, correctionDraft: true }, ...INCOMPLETE.slice(1)]),
  missing: data(MISSING),
  'too-many': data(MISSING.map((p) => (p.name === 'Clara' ? { ...p, units: 201 } : p))),
  balanced: data(BALANCED),
  reopened: data(BALANCED, { reopened: true }),
  completed: data(BALANCED, { phase: 'completed', context: `${CONTEXT} · finished 23:41` }),
  /** EUR 20.01 buy-in: Alice's 250 units are worth exactly EUR 25.0125 (+EUR 5.0025). */
  'sub-cent': data(
    [{ name: 'Alice', units: 250 }, { name: 'Bob', units: 150 }, ...NAMES.slice(2).map((name) => ({ name }))],
    {},
    2001 as Cents,
  ),
  /** Long names and amounts, for narrow-width checks. */
  long: data([
    { name: 'Maximiliane Alexandra von Hohenzollern-Sigmaringen', units: 2650, rebuys: 12 },
    { name: 'Bob', rebuys: 3, draft: true },
    { name: 'Clara', units: 0 },
  ]),
} satisfies Record<string, ResultsData>;

export type ResultsFixtureName = keyof typeof RESULTS_FIXTURES;
