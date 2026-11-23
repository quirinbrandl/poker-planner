/**
 * The read model of an In progress game: Play, the bank / reserve view and locked Game details.
 * Shaped "ready to render" (display texts next to the raw numbers). Later work (rebuys, results,
 * late entry, eliminations) extends the player rows and adds sections.
 */
import { reserveCapacity } from '@/domain/distribution';
import { formatEur, formatEurPerUnit, type ExactCents } from '@/domain/money';
import { formatSharePercent, payoutPreset, placeLabel, prizeAmounts } from '@/domain/payouts';
import type { Cents, DistributionPreference, GameMode } from '@/domain/types';

import type { GameDocument, PlayRecord } from '../core/documents';
import type { Runtime } from '../core/runtime';
import { summarizeDenominations } from '../shared/chip-rows';
import { formatCount } from '../shared/numbers';
import { withColors } from '../planning/distribution';
import type { ChipCountView } from '../planning/distribution-view';
import {
  bankMix,
  issuancesOf,
  issuedMix,
  mixChips,
  mixValue,
  reserveConsumed,
  reserveUnconsumed,
  totalContributions,
} from './ledger';

export const SETUP_LOCKED_NOTE = 'Setup is locked. To change it, use ⋯ → Return to Planning.';

export interface MoneyView {
  cents: Cents;
  /** "EUR 20.00". */
  text: string;
}

export interface ChipsView {
  /** Physical chips. */
  chips: number;
  /** Chip units. */
  value: number;
  /** One entry per denomination of the chip set, ascending, zero counts included. */
  mix: readonly ChipCountView[];
}

export interface PlayTermsView {
  blinds: { small: number; big: number; /** "1 / 2" */ text: string; /** SB below half the BB. */ rounded: boolean };
  depth: {
    /** The accepted depth. */
    bb: number;
    requestedBb: number;
    adjusted: boolean;
    /** "100 BB". */
    text: string;
  };
  stack: {
    /** Exact chip-unit value of every stack (starting, rebuy, late entry). */
    value: number;
    /** "200 chip units". */
    text: string;
  };
  buyIn: MoneyView;
  /** A rebuy costs the buy-in. */
  rebuyPrice: MoneyView;
  money:
    | { kind: 'cash'; /** Cents per chip unit, exact. */ rate: ExactCents; /** "EUR 0.10 / unit" */ rateText: string }
    | { kind: 'tournament'; /** "No chip money value" */ text: string };
  coverage: { payments: number; /** "4 payments of each blind" */ text: string };
  preference: DistributionPreference;
  /** "Fewer chips" / "More chips". */
  preferenceText: string;
}

export interface PlayPlayerView {
  id: string;
  name: string;
  savedPlayerId: string | null;
  /** 1-based fixed joining order. */
  joinOrder: number;
  entry: 'initial' | 'lateEntry';
  contribution: {
    /** Stacks paid for (buy-in + rebuys). */
    stacks: number;
    rebuys: number;
    cents: Cents;
    /** "EUR 40.00 contribution · 1 rebuy". */
    text: string;
  };
  /** Every chip handed to this player so far. */
  handedOut: ChipsView;
  /** The mix of their first stack (starting stack or late-entry stack). */
  firstStack: ChipsView;
}

export interface ReserveStatusView {
  /** The configured target R at Start. */
  configured: number;
  /** The target Start guaranteed (r ≤ R), consumed by rebuys and late entries. */
  startedTarget: number;
  /** Rebuys and late entries recorded so far. */
  consumed: number;
  /** Still-targeted stacks: started target − consumed, at least 0. */
  unconsumed: number;
  /** How many of the unconsumed stacks the bank can form at the same time; `null` if too complex to work out. */
  achievable: number | null;
  /** "2 of 2" (or "—" when it could not be worked out). */
  achievableText: string;
  /** `achievable < unconsumed`: the guarantee is weaker than its target. */
  weakened: boolean;
  /** "2 reserve stacks available". */
  summaryText: string;
}

export interface LockedDetailsView {
  players: readonly { id: string; name: string; joinOrder: number }[];
  /** "6 players". */
  playersText: string;
  chipSet: {
    denominations: readonly { value: number; color: ChipCountView['color']; quantity: number }[];
    /** "5 denominations · 199 chips · 1,980 chip units". */
    summaryText: string;
  };
  /** The starting stack every initial player received. */
  startingStack: ChipsView & { /** "200 chip units" */ text: string };
  depth: { requestedBb: number; acceptedBb: number; adjusted: boolean; /** "100 BB" or "98 BB (requested 100 BB)" */ text: string };
  /** "1 / 2 chip units · 100 BB". */
  blindsText: string;
  /** "EUR 20.00 · rebuys the same". */
  buyInText: string;
  /** Cash games: "EUR 0.10 / unit"; tournaments: `null`. */
  rateText: string | null;
  /** "4 payments of each blind". */
  coverageText: string;
  preferenceText: string;
  reserve: {
    mode: 'automatic' | 'custom';
    configured: number;
    atStart: number;
    reduced: boolean;
    /** "3 stacks" or "1 of 3 stacks". */
    text: string;
  };
  /** Tournaments: the locked schedule with current amounts. */
  payouts: {
    /** "Top 2" or "Custom". */
    name: string;
    places: readonly { place: number; placeLabel: string; shareText: string; amount: Cents; amountText: string }[];
    prizePool: MoneyView;
    /** "Prize pool EUR 140.00 · 6 buy-ins + 1 rebuy. Rebuys raise every prize; the percentages stay." */
    prizePoolLine: string;
  } | null;
  /** "Setup is locked. To change it, use ⋯ → Return to Planning." */
  lockedNote: string;
}

export interface PlayView {
  gameId: string;
  mode: GameMode;
  phase: 'inProgress';
  createdAt: string;
  startedAt: string;
  terms: PlayTermsView;
  /** In fixed joining order. */
  players: readonly PlayPlayerView[];
  totals: {
    /** All contributions (buy-ins and rebuys): "EUR 140.00 total contributions". */
    contributions: MoneyView & { label: string };
    buyIns: number;
    rebuys: number;
    /** Stacks handed out so far. */
    stacks: number;
    /** Chips handed out across the table (not yet returned). */
    inPlay: ChipsView;
    /** Tournaments: the prize pool (all contributions). */
    prizePool: MoneyView | null;
  };
  bank: ChipsView & {
    /** "75 available chips". */
    label: string;
    /** "1,480 chip units". */
    valueText: string;
  };
  reserve: ReserveStatusView;
  details: LockedDetailsView;
}

const plural = (count: number, one: string, many = `${one}s`) => `${formatCount(count)} ${count === 1 ? one : many}`;
const money = (cents: Cents): MoneyView => ({ cents, text: formatEur(cents) });

function chipsView(play: PlayRecord, mix: PlayRecord['issuances'][number]['mix']): ChipsView {
  return { chips: mixChips(mix), value: mixValue(mix), mix: withColors(mix, play.terms.chipSet) };
}

function reserveStatus(play: PlayRecord, bank: ReturnType<typeof bankMix>): ReserveStatusView {
  const { terms } = play;
  const unconsumed = reserveUnconsumed(play);
  const measured =
    unconsumed === 0
      ? { kind: 'measured' as const, stacks: 0 }
      : reserveCapacity({ bank, blinds: terms.blinds, stackValue: terms.stackValue, coverage: terms.coverage, max: unconsumed });
  const achievable = measured.kind === 'measured' ? measured.stacks : null;
  return {
    configured: terms.reserve.configured,
    startedTarget: terms.reserve.target,
    consumed: reserveConsumed(play),
    unconsumed,
    achievable,
    achievableText: achievable === null ? '—' : `${achievable} of ${unconsumed}`,
    weakened: achievable !== null && achievable < unconsumed,
    summaryText:
      achievable === null
        ? 'Reserve could not be worked out'
        : `${plural(achievable, 'reserve stack')} available`,
  };
}

function payoutsView(play: PlayRecord, prizePool: Cents, buyIns: number, rebuys: number): LockedDetailsView['payouts'] {
  const schedule = play.terms.payoutSchedule;
  if (!schedule) return null;
  const amounts = prizeAmounts(prizePool, schedule.shares);
  const pool = money(prizePool);
  return {
    name: schedule.presetId ? payoutPreset(schedule.presetId).name : 'Custom',
    places: schedule.shares.map((share, index) => ({
      place: index + 1,
      placeLabel: placeLabel(index + 1),
      shareText: formatSharePercent(share),
      amount: amounts[index],
      amountText: formatEur(amounts[index]),
    })),
    prizePool: pool,
    prizePoolLine: `Prize pool ${pool.text} · ${plural(buyIns, 'buy-in')}${rebuys > 0 ? ` + ${plural(rebuys, 'rebuy')}` : ''}. Rebuys raise every prize; the percentages stay.`,
  };
}

export function buildPlayView(game: GameDocument & { play: PlayRecord }): PlayView {
  const { play } = game;
  const { terms } = play;
  const coverageText = `${plural(terms.coverage, 'payment')} of each blind`;
  const preferenceText = terms.preference === 'fewer' ? 'Fewer chips' : 'More chips';
  const blindsText = `${formatCount(terms.blinds.small)} / ${formatCount(terms.blinds.big)}`;
  const depthText = `${formatCount(terms.depthBb)} BB`;
  const stackText = plural(terms.stackValue, 'chip unit');
  const rateText = terms.cashRate ? formatEurPerUnit(terms.cashRate) : null;

  const players: PlayPlayerView[] = play.roster.map((participant, index) => {
    const issued = issuancesOf(play, participant.id);
    const rebuys = issued.filter((i) => i.kind === 'rebuy').length;
    const cents = totalContributions(issued);
    return {
      id: participant.id,
      name: participant.name,
      savedPlayerId: participant.savedPlayerId,
      joinOrder: index + 1,
      entry: participant.entry,
      contribution: {
        stacks: issued.length,
        rebuys,
        cents,
        text: `${formatEur(cents)} contribution${rebuys > 0 ? ` · ${plural(rebuys, 'rebuy')}` : ''}`,
      },
      handedOut: chipsView(play, issuedMix(issued, play)),
      firstStack: chipsView(play, issued[0]?.mix ?? issuedMix([], play)),
    };
  });

  const contributions = totalContributions(play.issuances);
  const buyIns = play.issuances.filter((i) => i.kind !== 'rebuy').length;
  const rebuys = play.issuances.length - buyIns;
  const bank = bankMix(play);
  const bankChips = chipsView(play, bank);
  const initial = play.issuances.find((i) => i.kind === 'initial');
  const startingStack = chipsView(play, initial?.mix ?? issuedMix([], play));
  const reserveReduced = terms.reserve.target < terms.reserve.configured;

  return {
    gameId: game.id,
    mode: game.mode,
    phase: 'inProgress',
    createdAt: game.createdAt,
    startedAt: play.startedAt,
    terms: {
      blinds: { ...terms.blinds, text: blindsText, rounded: terms.blinds.small * 2 < terms.blinds.big },
      depth: {
        bb: terms.depthBb,
        requestedBb: terms.requestedDepthBb,
        adjusted: terms.depthBb !== terms.requestedDepthBb,
        text: depthText,
      },
      stack: { value: terms.stackValue, text: stackText },
      buyIn: money(terms.buyIn),
      rebuyPrice: money(terms.buyIn),
      money:
        terms.cashRate && rateText
          ? { kind: 'cash', rate: terms.cashRate, rateText }
          : { kind: 'tournament', text: 'No chip money value' },
      coverage: { payments: terms.coverage, text: coverageText },
      preference: terms.preference,
      preferenceText,
    },
    players,
    totals: {
      contributions: { ...money(contributions), label: `${formatEur(contributions)} total contributions` },
      buyIns,
      rebuys,
      stacks: play.issuances.length,
      inPlay: chipsView(play, issuedMix(play.issuances, play)),
      prizePool: game.mode === 'tournament' ? money(contributions) : null,
    },
    bank: {
      ...bankChips,
      label: `${plural(bankChips.chips, 'available chip')}`,
      valueText: plural(bankChips.value, 'chip unit'),
    },
    reserve: reserveStatus(play, bank),
    details: {
      players: players.map((p) => ({ id: p.id, name: p.name, joinOrder: p.joinOrder })),
      playersText: plural(players.length, 'player'),
      chipSet: {
        denominations: terms.chipSet.map((d) => ({ value: d.value, color: d.color, quantity: d.quantity })),
        summaryText: summarizeDenominations(terms.chipSet).label,
      },
      startingStack: { ...startingStack, text: stackText },
      depth: {
        requestedBb: terms.requestedDepthBb,
        acceptedBb: terms.depthBb,
        adjusted: terms.depthBb !== terms.requestedDepthBb,
        text:
          terms.depthBb === terms.requestedDepthBb
            ? depthText
            : `${depthText} (requested ${formatCount(terms.requestedDepthBb)} BB)`,
      },
      blindsText: `${blindsText} chip units · ${depthText}`,
      buyInText: `${formatEur(terms.buyIn)} · rebuys the same`,
      rateText,
      coverageText,
      preferenceText,
      reserve: {
        mode: terms.reserve.mode,
        configured: terms.reserve.configured,
        atStart: terms.reserve.target,
        reduced: reserveReduced,
        text: reserveReduced
          ? `${terms.reserve.target} of ${plural(terms.reserve.configured, 'stack')}`
          : plural(terms.reserve.target, 'stack'),
      },
      payouts: payoutsView(play, contributions, buyIns, rebuys),
      lockedNote: SETUP_LOCKED_NOTE,
    },
  };
}

export function getPlayView(rt: Runtime, game: GameDocument | undefined): PlayView | null {
  if (!game || game.phase !== 'inProgress' || !game.play) return null;
  const started = game as GameDocument & { play: PlayRecord };
  return rt.memo(`play.view:${game.id}`, [game], () => buildPlayView(started));
}
