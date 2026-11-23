/**
 * The tournament read models: Play, Results, the finishing-order editor for any draft, and the
 * player page. Everything is derived from the play record, the locked schedule and an order.
 */
import { eurInputText, formatEur, formatSignedEur } from '@/domain/money';
import { formatSharePercent, placeLabel } from '@/domain/payouts';

import type { GameDocument, LockedPayoutSchedule, PlayRecord } from '../../core/documents';
import { withColors } from '../../planning/distribution';
import { formatCount } from '../../shared/numbers';
import { issuancesOf, totalContributions } from '../ledger';
import type { PlayView } from '../view';
import {
  contributionText,
  nameOf,
  openRangeLabel,
  payoutAt,
  payoutInline,
  payoutText,
  placeOf,
  plural,
  type Standing,
  standing,
} from './standing';
import type {
  BackInData,
  FinisherRow,
  MissedSlot,
  OrderChangeRow,
  OrderDraft,
  OrderEditorView,
  StillInPlayer,
  TournamentBuyInRecord,
  TournamentPlayerResult,
  TournamentPlayerView,
  TournamentPlayView,
  TournamentResultsView,
} from './types';

export type StartedTournament = GameDocument & { play: PlayRecord & { terms: { payoutSchedule: LockedPayoutSchedule } } };

export const CALCULATE_BLOCKED_MESSAGE = 'Record eliminations until one player is left.';

const bestFirst = (order: readonly string[]) => [...order].reverse();

function lateEntryClosedMessage(eliminations: number): string {
  return `Late entry closes once anyone is out (${plural(eliminations, 'elimination')} recorded). It opens again only if every elimination is undone.`;
}

// ----- Play -----

export function buildPlay(game: StartedTournament, playView: PlayView): TournamentPlayView {
  const { play } = game;
  const { terms } = play;
  const schedule = terms.payoutSchedule;
  const s = standing(play, schedule);
  const count = s.remaining.length;
  const buyIns = play.issuances.filter((i) => i.kind !== 'rebuy').length;
  const rebuys = play.issuances.length - buyIns;

  const players: StillInPlayer[] = s.remaining.map((player) => {
    const other = count === 2 ? s.remaining.find((p) => p.id !== player.id) : undefined;
    return {
      playerId: player.id,
      name: player.name,
      contributionText: contributionText(play, player.id),
      elimination: {
        placeLabel: placeLabel(count),
        payoutText: payoutText(s, count),
        closesLateEntry: s.order.length === 0,
        winner: other ? { name: other.name, payoutText: payoutText(s, 1) } : null,
      },
    };
  });

  return {
    gameId: game.id,
    terms: [
      { label: 'Blinds', value: `${formatCount(terms.blinds.small)} / ${formatCount(terms.blinds.big)}`, unit: 'chip units' },
      { label: 'Rebuy', value: eurInputText(terms.buyIn), unit: 'EUR' },
      { label: 'Stack', value: formatCount(terms.stackValue), unit: 'chip units' },
    ],
    prizePool: {
      amountText: formatEur(s.prizePool),
      detail: `${plural(buyIns, 'buy-in')}${rebuys > 0 ? ` + ${plural(rebuys, 'rebuy')}` : ''}`,
      rungs: schedule.shares.map((share, index) => {
        const place = index + 1;
        const holder = place === 1 ? s.winner : s.roster.find((p) => s.order.indexOf(p.id) === s.size - place);
        return {
          place,
          placeLabel: placeLabel(place),
          shareText: formatSharePercent(share),
          sharePercent: share / 100,
          amountText: formatEur(s.amounts[index]),
          holder: holder ? { playerId: holder.id, name: holder.name, isWinner: place === 1 } : null,
        };
      }),
    },
    stillIn: s.winner
      ? null
      : {
          count,
          summary: `Playing for ${openRangeLabel(count)} · next out ${placeLabel(count)} · ${payoutInline(s, count)}`,
          players,
          sameHandAvailable: count >= 3,
          nextPlaceLabels: Array.from({ length: count - 1 }, (_, i) => placeLabel(i + 2)),
        },
    winner: s.winner ? { playerId: s.winner.id, name: s.winner.name } : null,
    lateEntry:
      s.order.length === 0
        ? { status: 'open' }
        : {
            status: 'closed',
            eliminationsText: plural(s.order.length, 'elimination'),
            message: lateEntryClosedMessage(s.order.length),
          },
    unpaidFinishers: bestFirst(s.order)
      .filter((id) => payoutAt(s, placeOf(s, id)!) === null)
      .map((id) => ({
        playerId: id,
        name: nameOf(s, id),
        placeLabel: placeLabel(placeOf(s, id)!),
        contributionText: contributionText(play, id),
        payoutText: 'No payout',
      })),
    reserveText: playView.reserve.summaryText,
  };
}

// ----- Results -----

function finisherRow(play: PlayRecord, s: Standing, id: string): FinisherRow {
  const place = placeOf(s, id)!;
  return {
    playerId: id,
    name: nameOf(s, id),
    placeLabel: placeLabel(place),
    paid: payoutAt(s, place) !== null,
    isWinner: place === 1,
    contributionText: contributionText(play, id),
    payoutText: payoutText(s, place),
  };
}

export function buildResults(game: StartedTournament): TournamentResultsView {
  const { play } = game;
  const s = standing(play, play.terms.payoutSchedule);
  const needed = s.size - 1;
  const recorded = s.order.length;
  const left = s.remaining.length;
  const openPaid = s.amounts.slice(0, left);
  const ids = [...(s.winner ? [s.winner.id] : []), ...bestFirst(s.order)];
  return {
    gameId: game.id,
    phase: 'inProgress',
    status: s.winner
      ? {
          kind: 'winner',
          title: `${s.winner.name} wins`,
          description: `All ${plural(needed, 'elimination')} recorded · ${plural(s.size, 'player')}`,
        }
      : {
          kind: 'incomplete',
          ringText: `${recorded}/${needed}`,
          recorded,
          needed,
          title: `${formatCount(left)} still playing`,
          names: s.remaining.map((p) => p.name).join(', '),
          progressLabel: `${recorded} of ${plural(needed, 'elimination')} recorded`,
        },
    openPlaces: s.winner
      ? null
      : {
          rangeLabel: openRangeLabel(left),
          description: `Still playing${
            openPaid.length > 0
              ? ` · ${openPaid.map((amount, i) => `${placeLabel(i + 1)} ${eurInputText(amount)}`).join(' · ')} open`
              : ''
          }`,
        },
    finishers: ids.map((id) => finisherRow(play, s, id)),
    canEditOrder: recorded > 0,
    calculate: s.winner
      ? { kind: 'ready' }
      : { kind: 'blocked', stillPlayingText: plural(left, 'player'), message: CALCULATE_BLOCKED_MESSAGE },
    reopened: false,
  };
}

// ----- What changes between two orders -----

/** Only what changes from `before` to `after` (same roster and prize pool), as the confirmations list it. */
export function orderChanges(before: Standing, after: Standing): OrderChangeRow[] {
  const elimPlace = (s: Standing, id: string) => (s.order.includes(id) ? placeOf(s, id) : null);
  const rows: OrderChangeRow[] = [];
  for (const player of before.roster) {
    const was = elimPlace(before, player.id);
    const now = elimPlace(after, player.id);
    if (was === now) continue;
    let value: string;
    if (was === null) value = `Out · ${placeLabel(now!)} · ${payoutInline(after, now!)}`;
    else if (now === null) value = `Back in (was ${placeLabel(was)})`;
    else {
      const moneyChanged = payoutAt(before, was) !== payoutAt(after, now);
      value = `${placeLabel(was)} → ${placeLabel(now)}${moneyChanged ? ` · ${payoutInline(after, now)}` : ''}`;
    }
    rows.push({ key: player.id, label: player.name, value });
  }
  const w0 = before.winner;
  const w1 = after.winner;
  if (w0 && w0.id !== w1?.id) {
    rows.push({
      key: 'winner',
      label: 'Winner',
      struck: w0.name,
      value: w1 ? `→ ${w1.name}` : '· none yet',
      spokenValue: `${w0.name} withdrawn, ${w1 ? `now ${w1.name}` : 'none yet'}`,
    });
  } else if (w1 && !w0) {
    rows.push({ key: 'winner', label: 'Winner', value: `${w1.name} · ${payoutText(after, 1)}` });
  }
  if (before.order.length === 0 && after.order.length > 0) rows.push({ key: 'entry', label: 'Late entry', value: 'Closes' });
  if (before.order.length > 0 && after.order.length === 0) rows.push({ key: 'entry', label: 'Late entry', value: 'Opens again' });
  return rows;
}

// ----- Finishing order editor -----

function missedSlots(s: Standing): MissedSlot[] {
  const { order } = s;
  return Array.from({ length: order.length + 1 }, (_, k) => {
    const description =
      order.length === 0
        ? 'first one out'
        : k === 0
          ? `out before ${nameOf(s, order[0])}`
          : k === order.length
            ? `out after ${nameOf(s, order[k - 1])} (most recent)`
            : `between ${nameOf(s, order[k - 1])} and ${nameOf(s, order[k])}`;
    return { slotId: String(k), placeLabel: placeLabel(s.size - k), description };
  }).reverse();
}

export function buildOrderEditor(game: StartedTournament, draft: OrderDraft): OrderEditorView {
  const { play } = game;
  const schedule = play.terms.payoutSchedule;
  const saved = standing(play, schedule, draft.savedOrder);
  const s = standing(play, schedule, draft.order);
  const best = bestFirst(s.order);
  const hasChanges = draft.order.length !== draft.savedOrder.length || draft.order.some((id, i) => draft.savedOrder[i] !== id);
  return {
    gameId: game.id,
    hasChanges,
    top: s.winner
      ? { kind: 'winner', placeLabel: placeLabel(1), name: s.winner.name }
      : {
          kind: 'stillPlaying',
          rangeLabel: openRangeLabel(s.remaining.length),
          names: s.remaining.map((p) => p.name).join(', '),
        },
    rows: best.map((id, index) => {
      const place = placeOf(s, id)!;
      const was = saved.order.includes(id) ? placeOf(saved, id) : null;
      const name = nameOf(s, id);
      return {
        playerId: id,
        name,
        placeLabel: placeLabel(place),
        marker: draft.added.includes(id)
          ? { kind: 'missed' }
          : was !== null && was !== place
            ? { kind: 'was', text: `was ${placeLabel(was)}` }
            : null,
        payoutText: payoutText(s, place),
        canMoveUp: index > 0,
        canMoveDown: index < best.length - 1,
        moveUpLabel: `Move ${name} up to ${placeLabel(place - 1)}`,
        moveDownLabel: `Move ${name} down to ${placeLabel(place + 1)}`,
      };
    }),
    missed:
      s.remaining.length > 1
        ? {
            candidates: s.remaining.map((p) => ({ playerId: p.id, name: p.name })),
            slots: missedSlots(s),
            defaultSlotId: String(s.order.length),
          }
        : null,
    changes: orderChanges(saved, s),
  };
}

// ----- Player page -----

export function buildBackIn(game: StartedTournament, participantId: string): BackInData {
  const { play } = game;
  const schedule = play.terms.payoutSchedule;
  const before = standing(play, schedule);
  const after = standing(
    play,
    schedule,
    before.order.filter((id) => id !== participantId),
  );
  return {
    name: nameOf(before, participantId),
    changes: [
      ...orderChanges(before, after),
      {
        key: 'buyIns',
        label: 'Buy-ins',
        value: `${formatEur(totalContributions(issuancesOf(play, participantId)))} · unchanged`,
      },
    ],
  };
}

function buyInRecords(play: PlayRecord, participantId: string): TournamentBuyInRecord[] {
  let rebuy = 0;
  return issuancesOf(play, participantId).map((issuance) => {
    const isRebuy = issuance.kind === 'rebuy';
    if (isRebuy) rebuy += 1;
    return {
      id: issuance.id,
      kind: isRebuy ? 'rebuy' : 'buyIn',
      label: isRebuy ? `Rebuy ${rebuy}` : 'Buy-in',
      amountText: formatEur(issuance.contribution),
      mix: withColors(issuance.mix, play.terms.chipSet),
      addedLater: issuance.addedLater === true,
      corrected: issuance.corrected === true,
      coverageText:
        issuance.reducedCoverage !== undefined ? `${issuance.reducedCoverage} of ${play.terms.coverage} coverage` : null,
      undo: null,
    };
  });
}

export function buildPlayer(game: StartedTournament, participantId: string): TournamentPlayerView | null {
  const { play } = game;
  const participant = play.roster.find((p) => p.id === participantId);
  if (!participant) return null;
  const s = standing(play, play.terms.payoutSchedule);
  const place = placeOf(s, participantId);
  const contributions = totalContributions(issuancesOf(play, participantId));
  let result: TournamentPlayerResult | null = null;
  if (place !== null) {
    const payout = payoutAt(s, place);
    const balance = (payout ?? 0) - contributions;
    result = {
      placeLabel: placeLabel(place),
      paid: payout !== null,
      statusText: place === 1 ? 'Winner · last player left' : `Out · ${placeLabel(place)} place`,
      balanceText: formatSignedEur(balance),
      direction: balance > 0 ? 'gain' : balance < 0 ? 'loss' : 'even',
      balanceCaption: balance > 0 ? 'Won' : balance < 0 ? 'Lost' : 'Break-even',
      payoutText: payoutText(s, place),
      contributionsText: formatEur(contributions),
    };
  }
  const out = s.order.includes(participantId);
  return {
    gameId: game.id,
    phase: 'inProgress',
    playerId: participantId,
    name: participant.name,
    status: out ? 'out' : place === 1 ? 'winner' : 'stillIn',
    buyInsTotalText: formatEur(contributions),
    buyIns: buyInRecords(play, participantId),
    result,
    backIn: out ? buildBackIn(game, participantId) : null,
  };
}
