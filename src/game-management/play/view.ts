/**
 * The read model of an In progress game: Play, the bank / reserve view and locked Game details.
 * Shaped "ready to render" (display texts next to the raw numbers). Later work (rebuys, results,
 * late entry, eliminations) extends the player rows and adds sections.
 */
import { reserveCapacity } from '@/domain/distribution';
import {
  eurInputText,
  formatEur,
  formatEurPerUnit,
  formatExactEur,
  formatSignedExactEur,
  type ExactCents,
} from '@/domain/money';
import { formatSharePercent, payoutPreset, placeLabel, prizeAmounts } from '@/domain/payouts';
import { exactWinLoss } from '@/domain/settlement';
import type { Cents, DistributionPreference, GameMode } from '@/domain/types';

import type { GameDocument, PlayRecord } from '../core/documents';
import type { Runtime } from '../core/runtime';
import { summarizeDenominations } from '../shared/chip-rows';
import { formatCount } from '../shared/numbers';
import { withColors } from '../planning/distribution';
import type { ChipCountView } from '../planning/distribution-view';
import {
  bankMix,
  countDraftOf,
  issuancesOf,
  issuedMix,
  mixChips,
  mixValue,
  reserveConsumed,
  reserveUnconsumed,
  resultOf,
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

// ---------------------------------------------------------------------------------------------
// Screen-ready reads: Play (cash), Bank & reserve and Game details. Each is the screen's data
// without the context line, back label and dates the workspace adds (`src/features/game`).
// ---------------------------------------------------------------------------------------------

/** Physical chips of one denomination, as drawn in towers and pills (same shape as `ChipCountView`). */
export type DisplayChip = ChipCountView;

/** A player in the Playing group (no confirmed result). */
export interface PlayingPlayerRow {
  /** Participant id. */
  id: string;
  /** Captured name. */
  name: string;
  /** "EUR 40.00 contribution · 1 rebuy". */
  contributionText: string;
  /** A saved, unconfirmed final chip count: tagged "Count draft", and the shortcut reads Resume. */
  hasCountDraft: boolean;
}

/** A player in the Finished playing group (confirmed final result). */
export interface FinishedPlayerRow {
  /** Participant id. */
  id: string;
  /** Captured name. */
  name: string;
  /** "EUR 20.00 contribution". */
  contributionText: string;
  /** Signed provisional balance: exact chip value minus all contributions, "+EUR 5.00" / "−EUR 5.00" / "EUR 0.00". */
  balanceText: string;
  /** Sign of the balance; decides the colour and agrees with `balanceCaption`. */
  direction: 'gain' | 'loss' | 'even';
  /** "Won", "Lost", "Break-even". */
  balanceCaption: string;
  /** An unconfirmed correction of the confirmed result is saved: tagged "Correction draft". */
  hasCorrectionDraft: boolean;
}

/** Play of an In progress cash game (`play.getPlayScreen`). */
export interface PlayScreenView {
  terms: {
    /** "1 / 2". */
    blindsText: string;
    /** The rebuy price without currency: "20.00". */
    rebuyText: string;
    /** "EUR". */
    currency: string;
    /** Starting stack chip units: "200". */
    stackText: string;
  };
  /**
   * The reserve line that opens Bank & reserve: "2 reserve stacks available", "1 of 2 reserve stacks
   * available" (weakened), "Reserve used · more stacks may be possible", "No reserve target · more
   * stacks may be possible".
   */
  reserveText: string;
  /** Players without a confirmed result, in joining order. */
  playing: readonly PlayingPlayerRow[];
  /** Players with a confirmed result, in joining order. */
  finished: readonly FinishedPlayerRow[];
  /** "EUR 140.00 total contributions". */
  totalContributionsText: string;
}

/** Bank & reserve (`play.getBankReserve`). */
export interface BankReserveScreenView {
  /** "75 available chips". */
  chipsText: string;
  /** Every denomination in the bank, ascending, zero counts included. */
  chips: readonly DisplayChip[];
  /** "1,480 chip units in the bank. Total value alone does not prove a 200-unit stack is possible." */
  valueNote: string;
  reserve: {
    /** "3 stacks". */
    startedTargetText: string;
    /** Rebuys and late entries recorded since Start: "1". */
    consumedText: string;
    /** Started target minus consumption, floored at zero: "2". */
    unconsumedText: string;
    /** "2 of 2" ("—" when too complex to work out). */
    achievableText: string;
  };
}

/** One paid place of a tournament's locked payout schedule. */
export interface DetailsPayoutPlace {
  /** Stable key. */
  id: string;
  /** "1st". */
  placeLabel: string;
  /** "70%". */
  shareText: string;
  /** The current prize: "EUR 98.00". */
  amountText: string;
}

/** A participant in joining order. */
export interface DetailsPlayer {
  id: string;
  /** Captured name. */
  name: string;
  /** "Joined late", or `null` for an initial player. */
  note: string | null;
}

/** Locked Game details of a started game (`play.getGameDetails`), In progress or Completed, both modes. */
export interface GameDetailsScreenView {
  mode: GameMode;
  phase: 'inProgress' | 'completed';
  /** ISO 8601; the screen formats it ("13 Nov 2026 · 19:30"). */
  createdAt: string;
  /** ISO 8601 finishing time of a Completed game (when Payments were calculated); `null` while In progress. */
  finishedAt: string | null;
  /** "EUR 20.00". */
  buyInText: string;
  /** Cash: "EUR 0.10 per chip unit"; tournament: "No chip money value". */
  chipValueText: string;
  /** "1 / 2 chip units". */
  blindsText: string;
  /** "100 BB", "98 BB (requested 100 BB)". */
  depthText: string;
  /** "4 payments of each blind". */
  coverageText: string;
  /** "Fewer chips" / "More chips". */
  preferenceText: string;
  /** "3 stacks", "1 stack (configured 3)". */
  reserveText: string;
  /** The recorded starting stack of the initial players. */
  startingStack: { unitsText: string; chips: readonly DisplayChip[] };
  /** The configured chip set (quantities as configured, not the current bank). */
  chipSet: readonly DisplayChip[];
  players: readonly DetailsPlayer[];
  /** Tournament only: the locked schedule with current amounts (Completed: the final amounts). */
  payouts: { name: string; places: readonly DetailsPayoutPlace[]; /** "Prize pool EUR 140.00 · …" */ note: string } | null;
}

type StartedGame = GameDocument & { play: PlayRecord };

function startedGame(game: GameDocument | undefined): StartedGame | null {
  return game && game.phase === 'inProgress' && game.play ? (game as StartedGame) : null;
}

function reserveLine(reserve: ReserveStatusView): string {
  if (reserve.startedTarget === 0) return 'No reserve target · more stacks may be possible';
  if (reserve.unconsumed === 0) return 'Reserve used · more stacks may be possible';
  if (reserve.achievable === null) return 'Reserve could not be worked out';
  if (reserve.weakened) return `${reserve.achievable} of ${plural(reserve.unconsumed, 'reserve stack')} available`;
  return `${plural(reserve.achievable, 'reserve stack')} available`;
}

function finishedRow(play: PlayRecord, player: PlayPlayerView, units: number): FinishedPlayerRow {
  const rate = play.terms.cashRate!;
  const balance = exactWinLoss(units, player.contribution.cents, rate);
  const direction = balance.numerator > 0 ? 'gain' : balance.numerator < 0 ? 'loss' : 'even';
  return {
    id: player.id,
    name: player.name,
    contributionText: player.contribution.text,
    balanceText: formatSignedExactEur(balance),
    direction,
    balanceCaption: direction === 'gain' ? 'Won' : direction === 'loss' ? 'Lost' : 'Break-even',
    hasCorrectionDraft: countDraftOf(play, player.id) !== undefined,
  };
}

export function buildPlayScreen(game: StartedGame, view: PlayView): PlayScreenView {
  const { play } = game;
  const playing: PlayingPlayerRow[] = [];
  const finished: FinishedPlayerRow[] = [];
  for (const player of view.players) {
    const result = resultOf(play, player.id);
    if (result) finished.push(finishedRow(play, player, mixValue(result.mix)));
    else {
      playing.push({
        id: player.id,
        name: player.name,
        contributionText: player.contribution.text,
        hasCountDraft: countDraftOf(play, player.id) !== undefined,
      });
    }
  }
  return {
    terms: {
      blindsText: view.terms.blinds.text,
      rebuyText: eurInputText(play.terms.buyIn),
      currency: 'EUR',
      stackText: formatCount(play.terms.stackValue),
    },
    reserveText: reserveLine(view.reserve),
    playing,
    finished,
    totalContributionsText: view.totals.contributions.label,
  };
}

export function buildBankReserve(game: StartedGame, view: PlayView): BankReserveScreenView {
  const { reserve } = view;
  return {
    chipsText: view.bank.label,
    chips: view.bank.mix,
    valueNote: `${view.bank.valueText} in the bank. Total value alone does not prove a ${formatCount(game.play.terms.stackValue)}-unit stack is possible.`,
    reserve: {
      startedTargetText: plural(reserve.startedTarget, 'stack'),
      consumedText: formatCount(reserve.consumed),
      unconsumedText: formatCount(reserve.unconsumed),
      achievableText: reserve.achievableText,
    },
  };
}

export function buildGameDetails(game: StartedGame, view: PlayView): GameDetailsScreenView {
  const { terms } = game.play;
  const { details } = view;
  const reserveText = details.reserve.reduced
    ? `${plural(terms.reserve.target, 'stack')} (configured ${formatCount(terms.reserve.configured)})`
    : plural(terms.reserve.target, 'stack');
  const completed = game.phase === 'completed';
  return {
    mode: game.mode,
    phase: completed ? 'completed' : 'inProgress',
    createdAt: game.createdAt,
    finishedAt: completed ? (game.completion?.finishedAt ?? null) : null,
    buyInText: view.terms.buyIn.text,
    chipValueText: terms.cashRate ? `${formatExactEur(terms.cashRate)} per chip unit` : 'No chip money value',
    blindsText: `${view.terms.blinds.text} chip units`,
    depthText: details.depth.text,
    coverageText: details.coverageText,
    preferenceText: details.preferenceText,
    reserveText,
    startingStack: { unitsText: formatCount(details.startingStack.value), chips: details.startingStack.mix },
    chipSet: details.chipSet.denominations.map((d) => ({ value: d.value, color: d.color, count: d.quantity })),
    players: view.players.map((p) => ({ id: p.id, name: p.name, note: p.entry === 'lateEntry' ? 'Joined late' : null })),
    payouts: details.payouts
      ? {
          name: details.payouts.name,
          places: details.payouts.places.map((place) => ({
            id: `place-${place.place}`,
            placeLabel: place.placeLabel,
            shareText: place.shareText,
            amountText: place.amountText,
          })),
          note: details.payouts.prizePoolLine,
        }
      : null,
  };
}

/** Play of an In progress cash game; `null` unless the game is an In progress cash game. */
export function getPlayScreen(rt: Runtime, game: GameDocument | undefined): PlayScreenView | null {
  const started = startedGame(game);
  if (!started || started.mode !== 'cash') return null;
  const view = getPlayView(rt, started)!;
  return rt.memo(`play.screen:${started.id}`, [view], () => buildPlayScreen(started, view));
}

export function getBankReserve(rt: Runtime, game: GameDocument | undefined): BankReserveScreenView | null {
  const started = startedGame(game);
  if (!started) return null;
  const view = getPlayView(rt, started)!;
  return rt.memo(`play.bank:${started.id}`, [view], () => buildBankReserve(started, view));
}

/**
 * Game details of a started game: In progress, or Completed with the facts as they were locked at
 * Start and the finishing time. `null` in Planning.
 */
export function getGameDetails(rt: Runtime, game: GameDocument | undefined): GameDetailsScreenView | null {
  if (game?.phase === 'completed' && game.play) {
    const completed = game as StartedGame;
    return rt.memo(`play.details:${game.id}`, [game], () => buildGameDetails(completed, buildPlayView(completed)));
  }
  const started = startedGame(game);
  if (!started) return null;
  const view = getPlayView(rt, started)!;
  return rt.memo(`play.details:${started.id}`, [view], () => buildGameDetails(started, view));
}
