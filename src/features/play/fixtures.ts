/**
 * Development and test fixtures for Play, the rebuy popup and Bank & reserve: the approved
 * prototype's story. Chips 1 White / 5 Red / 25 Blue / 100 Black / 500 Green, configured
 * [135, 24, 27, 12, 1]; each starting stack [15, 2, 3, 1, 0] = 200 chip units; EUR 20 buy-in and
 * rebuy; blinds 1 / 2; coverage 4; started reserve target 3. Bank = chip set − issued + returned.
 */
import type { ChipColor } from '@/domain/types';

import type { BankReserveData, DisplayChip, HandoutStack, PlayData, RebuyPopupData } from './types';

const DENOMINATIONS: readonly { value: number; color: ChipColor }[] = [
  { value: 1, color: 'white' },
  { value: 5, color: 'red' },
  { value: 25, color: 'blue' },
  { value: 100, color: 'black' },
  { value: 500, color: 'green' },
];

export const FIXTURE_CONTEXT = 'Cash game · 13 Nov, 19:30';

/** A mix as display chips, one entry per denomination. */
export function fixtureChips(counts: readonly number[]): DisplayChip[] {
  return DENOMINATIONS.map((denomination, index) => ({ ...denomination, count: counts[index] ?? 0 }));
}

function units(counts: readonly number[]): number {
  return counts.reduce((sum, count, index) => sum + count * DENOMINATIONS[index].value, 0);
}

function grouped(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function eur(euros: number): string {
  return `EUR ${euros.toFixed(2)}`;
}

function stack(counts: readonly number[]): HandoutStack {
  return { unitsText: String(units(counts)), chips: fixtureChips(counts) };
}

export const STARTING_MIX = [15, 2, 3, 1, 0] as const;
export const CHIP_SET = [135, 24, 27, 12, 1] as const;

/** One participant of the story. */
interface StoryPlayer {
  id: string;
  name: string;
  rebuys: number;
  countDraft?: boolean;
  /** Confirmed result's provisional balance in euros. */
  balance?: number;
  correctionDraft?: boolean;
}

interface Story {
  players: readonly StoryPlayer[];
  reserveText: string;
  bank: readonly number[];
  reserve: { target: number; consumed: number; achievable: number };
}

function contributionText(player: StoryPlayer): string {
  const total = eur(20 * (1 + player.rebuys));
  if (player.rebuys === 0) return `${total} contribution`;
  return `${total} contribution · ${player.rebuys} ${player.rebuys === 1 ? 'rebuy' : 'rebuys'}`;
}

function playData(story: Story): PlayData {
  const total = story.players.reduce((sum, player) => sum + 20 * (1 + player.rebuys), 0);
  return {
    context: FIXTURE_CONTEXT,
    backLabel: 'Games',
    terms: { blindsText: '1 / 2', rebuyText: '20.00', currency: 'EUR', stackText: '200' },
    reserveText: story.reserveText,
    fixText: null,
    playing: story.players
      .filter((player) => player.balance === undefined)
      .map((player) => ({
        id: player.id,
        name: player.name,
        contributionText: contributionText(player),
        hasCountDraft: player.countDraft ?? false,
      })),
    finished: story.players
      .filter((player) => player.balance !== undefined)
      .map((player) => {
        const balance = player.balance ?? 0;
        return {
          id: player.id,
          name: player.name,
          contributionText: contributionText(player),
          balanceText: balance > 0 ? `+${eur(balance)}` : balance < 0 ? `−${eur(-balance)}` : eur(0),
          direction: balance > 0 ? 'gain' : balance < 0 ? 'loss' : 'even',
          balanceCaption: balance > 0 ? 'Won' : balance < 0 ? 'Lost' : 'Break-even',
          hasCorrectionDraft: player.correctionDraft ?? false,
        };
      }),
    totalContributionsText: `${eur(total)} total contributions`,
  };
}

function bankData(story: Story): BankReserveData {
  const { target, consumed, achievable } = story.reserve;
  const unconsumed = Math.max(0, target - consumed);
  const chips = story.bank.reduce((sum, count) => sum + count, 0);
  return {
    context: FIXTURE_CONTEXT,
    chipsText: `${chips} available chips`,
    chips: fixtureChips(story.bank),
    valueNote: `${grouped(units(story.bank))} chip units in the bank. Total value alone does not prove a 200-unit stack is possible.`,
    reserve: {
      startedTargetText: `${target} ${target === 1 ? 'stack' : 'stacks'}`,
      consumedText: String(consumed),
      unconsumedText: String(unconsumed),
      achievableText: `${achievable} of ${unconsumed}`,
    },
  };
}

const ROSTER: readonly StoryPlayer[] = [
  { id: 'alice', name: 'Alice', rebuys: 0, balance: 5 },
  { id: 'ben', name: 'Ben', rebuys: 1 },
  { id: 'clara', name: 'Clara', rebuys: 0, countDraft: true },
  { id: 'david', name: 'David', rebuys: 0 },
  { id: 'emma', name: 'Emma', rebuys: 0 },
  { id: 'felix', name: 'Felix', rebuys: 0 },
];

function withPlayers(changes: Record<string, Partial<StoryPlayer>>, extra: readonly StoryPlayer[] = []): StoryPlayer[] {
  return [...ROSTER.map((player) => ({ ...player, ...changes[player.id] })), ...extra];
}

/**
 * The stories. `normal`: Alice returned [15, 2, 5, 1, 0] (+EUR 5), Ben rebought once:
 * bank [45, 12, 11, 6, 1] = 75 chips, 1,480 units; 2 of 2 unconsumed stacks achievable.
 */
const STORIES = {
  normal: {
    players: ROSTER,
    reserveText: '2 reserve stacks available',
    bank: [45, 12, 11, 6, 1],
    reserve: { target: 3, consumed: 1, achievable: 2 },
  },
  /** David and Emma rebought too: the target is used up, bank [15, 8, 5, 4, 1]. */
  exhausted: {
    players: withPlayers({ david: { rebuys: 1 }, emma: { rebuys: 1 } }),
    reserveText: 'Reserve used · more stacks may be possible',
    bank: [15, 8, 5, 4, 1],
    reserve: { target: 3, consumed: 3, achievable: 0 },
  },
  /** As exhausted, but Emma's rebuy was recorded as [20, 1, 3, 1, 0]: bank [10, 9, 5, 4, 1]. */
  reduced: {
    players: withPlayers({ david: { rebuys: 1 }, emma: { rebuys: 1 } }),
    reserveText: 'Reserve used · more stacks may be possible',
    bank: [10, 9, 5, 4, 1],
    reserve: { target: 3, consumed: 3, achievable: 0 },
  },
  /** Ben accepted the reduced [10, 3, 3, 1, 0]: bank [0, 6, 2, 3, 1]. */
  zero: {
    players: withPlayers({ ben: { rebuys: 2 }, david: { rebuys: 1 }, emma: { rebuys: 1 } }),
    reserveText: 'Reserve used · more stacks may be possible',
    bank: [0, 6, 2, 3, 1],
    reserve: { target: 3, consumed: 4, achievable: 0 },
  },
  /** Ben accepted the zero-coverage [0, 0, 0, 2, 0]: bank [0, 6, 2, 1, 1], 180 usable units plus a 500. */
  impossible: {
    players: withPlayers({ ben: { rebuys: 3 }, david: { rebuys: 1 }, emma: { rebuys: 1 } }),
    reserveText: 'Reserve used · more stacks may be possible',
    bank: [0, 6, 2, 1, 1],
    reserve: { target: 3, consumed: 5, achievable: 0 },
  },
  /** The same history in a chip set without the 500 chip: only 180 units are left. */
  shortage: {
    players: withPlayers({ ben: { rebuys: 3 }, david: { rebuys: 1 }, emma: { rebuys: 1 } }),
    reserveText: 'Reserve used · more stacks may be possible',
    bank: [0, 6, 2, 1, 0],
    reserve: { target: 3, consumed: 5, achievable: 0 },
  },
  /** Started with no reserve target; Ben's rebuy is beyond it. */
  zeroTarget: {
    players: ROSTER,
    reserveText: 'No reserve target · more stacks may be possible',
    bank: [45, 12, 11, 6, 1],
    reserve: { target: 0, consumed: 1, achievable: 0 },
  },
  /** Nora joined late with a starting stack: bank [30, 10, 8, 5, 1], 1 of 1 achievable. */
  joined: {
    players: withPlayers({}, [{ id: 'nora', name: 'Nora', rebuys: 0 }]),
    reserveText: '1 reserve stack available',
    bank: [30, 10, 8, 5, 1],
    reserve: { target: 3, consumed: 2, achievable: 1 },
  },
  /** Felix also finished, returning [15, 2, 1, 1, 0] (150 units, −EUR 5); Alice is correcting hers. */
  mixed: {
    players: withPlayers({ alice: { correctionDraft: true }, felix: { balance: -5 } }),
    reserveText: '2 reserve stacks available',
    bank: [60, 14, 12, 7, 1],
    reserve: { target: 3, consumed: 1, achievable: 2 },
  },
  /** Everyone has a confirmed result; nobody is playing. */
  allFinished: {
    players: withPlayers({
      ben: { balance: 12 },
      clara: { balance: -8, countDraft: false },
      david: { balance: -20 },
      emma: { balance: 6 },
      felix: { balance: 5 },
    }),
    reserveText: '2 reserve stacks available',
    bank: [135, 24, 27, 12, 1],
    reserve: { target: 3, consumed: 1, achievable: 2 },
  },
} satisfies Record<string, Story>;

export type PlayStoryName = keyof typeof STORIES;
export const PLAY_STORY_NAMES = Object.keys(STORIES) as PlayStoryName[];

export function playFixture(name: PlayStoryName): PlayData {
  return playData(STORIES[name]);
}

export function bankFixture(name: PlayStoryName): BankReserveData {
  return bankData(STORIES[name]);
}

/** The rebuy proposal each story makes for a player (contributions follow that player's rebuys). */
export function rebuyFixture(name: PlayStoryName, playerId: string): RebuyPopupData {
  const player = STORIES[name].players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`No player ${playerId} in ${name}`);
  const base = { playerId, playerName: player.name };
  const newTotalText = eur(20 * (2 + player.rebuys));
  const targetUsed = 'More rebuys are still allowed when another stack is possible.';
  switch (name) {
    case 'reduced':
      return {
        kind: 'proposal',
        ...base,
        stack: stack([10, 3, 3, 1, 0]),
        reducedCoverage: { achieved: 3, required: 4 },
        reserveAfter: { value: '0', unit: 'stacks left' },
        priceText: 'EUR 20.00',
        newTotalText,
        reserveNote: targetUsed,
      };
    case 'zero':
      return {
        kind: 'proposal',
        ...base,
        stack: stack([0, 0, 0, 2, 0]),
        reducedCoverage: { achieved: 0, required: 4 },
        reserveAfter: { value: '0', unit: 'stacks left' },
        priceText: 'EUR 20.00',
        newTotalText,
        reserveNote: targetUsed,
      };
    case 'impossible':
      return {
        kind: 'blocked',
        ...base,
        message:
          'No exact 200-unit stack can be formed. The smaller chips make only 180 units, and the 500-unit chip cannot be split.',
      };
    case 'shortage':
      return {
        kind: 'blocked',
        ...base,
        message: 'An exact 200-unit stack is needed, but the bank holds only 180 chip units.',
      };
    case 'exhausted':
    case 'zeroTarget':
      return {
        kind: 'proposal',
        ...base,
        stack: stack(STARTING_MIX),
        reducedCoverage: null,
        reserveAfter: { value: '0', unit: 'stacks left' },
        priceText: 'EUR 20.00',
        newTotalText,
        reserveNote: targetUsed,
      };
    case 'joined':
      return {
        kind: 'proposal',
        ...base,
        stack: stack(STARTING_MIX),
        reducedCoverage: null,
        reserveAfter: { value: '0', unit: 'stacks left' },
        priceText: 'EUR 20.00',
        newTotalText,
        reserveNote: null,
      };
    default:
      return {
        kind: 'proposal',
        ...base,
        stack: stack(STARTING_MIX),
        reducedCoverage: null,
        reserveAfter: { value: '1', unit: 'stack left' },
        priceText: 'EUR 20.00',
        newTotalText,
        reserveNote: null,
      };
  }
}

/** A tournament rebuy adds the prize pool change as an extra row (ticket 27). */
export function tournamentRebuyFixture(): RebuyPopupData {
  const rebuy = rebuyFixture('normal', 'ben');
  if (rebuy.kind !== 'proposal') throw new Error('Expected a proposal');
  return { ...rebuy, extraFacts: [{ label: 'Prize pool', value: 'EUR 140.00 → EUR 160.00' }] };
}
