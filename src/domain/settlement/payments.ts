import type { Cents } from '../types';
import type { PlayerBalance } from './balances';
import { assertUniqueIds, assertWhole, type ParticipantId } from './participants';

/** A direction for `fromId` to pay `toId` a positive whole-cent `amount`. Not a record of payment. */
export interface PaymentInstruction {
  readonly fromId: ParticipantId;
  readonly toId: ParticipantId;
  readonly amount: Cents;
}

/**
 * Largest number of nonzero balances settled with the guaranteed minimum number of payments.
 * Above it, the deterministic largest-debt / largest-credit heuristic is used (Decision 16).
 */
export const EXACT_SETTLEMENT_LIMIT = 16;

interface Party {
  /** Position among all participants in joining order. */
  readonly position: number;
  readonly balance: Cents;
}

/**
 * Payment instructions settling `balances` (Decision 16), with `balances` in joining order.
 *
 * Every instruction goes from an owing player to a receiving player for a positive whole number of
 * cents; zero-balance players never appear, and each player's incoming minus outgoing equals their
 * balance exactly. All-zero balances give `[]` ("No payments needed").
 *
 * - Up to {@link EXACT_SETTLEMENT_LIMIT} nonzero balances: the minimum possible number of payments.
 *   A plan with k zero-sum groups of players needs (nonzero players − k) payments, so the players are
 *   split into the largest possible number of zero-sum groups. Among equally small plans, the one
 *   chosen depends only on joining order: groups are fixed one at a time; each is the zero-sum set
 *   that contains the earliest-joined unassigned player, still allows the maximum number of groups,
 *   and has the lexicographically smallest ascending list of joining positions. Within a group, the
 *   earliest-joined remaining debtor pays the earliest-joined remaining creditor the smaller of the
 *   two residuals, until the group is settled.
 * - Above the limit: repeatedly the largest remaining debt pays the largest remaining credit the
 *   smaller of the two; equal residuals choose the earlier-joined player. Exact, not necessarily minimal.
 *
 * The branch depends only on the count of nonzero balances, never on time. Instructions are returned
 * ordered by payer joining order, then receiver joining order. Throws if ids repeat, an amount is not a
 * whole number, or the balances do not sum to zero (programming errors).
 */
export function settlePayments(balances: readonly PlayerBalance[]): PaymentInstruction[] {
  assertUniqueIds(balances);
  let total = 0;
  const parties: Party[] = [];
  balances.forEach(({ balance }, position) => {
    assertWhole(balance, 'balance');
    total += balance;
    if (balance !== 0) parties.push({ position, balance });
  });
  if (total !== 0) throw new Error(`Settlement: balances sum to ${total} cents instead of zero.`);

  const transfers = parties.length <= EXACT_SETTLEMENT_LIMIT ? minimumTransfers(parties) : largestFirstTransfers(parties);
  transfers.sort((a, b) => a.from - b.from || a.to - b.to);
  return transfers.map(({ from, to, amount }) => ({ fromId: balances[from].id, toId: balances[to].id, amount }));
}

interface Transfer {
  from: number;
  to: number;
  amount: Cents;
}

const lowestBit = (mask: number) => 31 - Math.clz32(mask & -mask);

/** True when set `a` sorts before set `b` by their ascending element lists (both nonempty, distinct). */
function lexicographicallySmaller(a: number, b: number): boolean {
  const diff = a ^ b;
  const low = diff & -diff;
  const above = ~((low << 1) - 1);
  // The sets agree below `low`; the one containing `low` is smaller unless the other one ends there.
  return a & low ? (b & above) !== 0 : (a & above) === 0;
}

/** Exact branch: maximum zero-sum partition by subset dynamic programming, then a canonical plan. */
function minimumTransfers(parties: readonly Party[]): Transfer[] {
  const n = parties.length;
  const full = (1 << n) - 1;
  const sums = new Float64Array(1 << n);
  // groups[mask]: for a zero-sum mask, the most zero-sum groups it can be partitioned into.
  const groups = new Int8Array(1 << n);
  for (let mask = 1; mask <= full; mask++) {
    sums[mask] = sums[mask & (mask - 1)] + parties[lowestBit(mask)].balance;
    let best = 0;
    for (let rest = mask; rest !== 0; rest &= rest - 1) {
      const without = groups[mask ^ (rest & -rest)];
      if (without > best) best = without;
    }
    groups[mask] = best + (sums[mask] === 0 ? 1 : 0);
  }

  const transfers: Transfer[] = [];
  let remaining = full;
  while (remaining !== 0) {
    const first = remaining & -remaining;
    const others = remaining ^ first;
    const target = groups[remaining] - 1;
    let chosen = 0;
    // Enumerate every subset of `others`; the candidate group is it plus the earliest player.
    for (let sub = others; ; sub = (sub - 1) & others) {
      const candidate = sub | first;
      if (sums[candidate] === 0 && groups[remaining ^ candidate] === target) {
        if (chosen === 0 || lexicographicallySmaller(candidate, chosen)) chosen = candidate;
      }
      if (sub === 0) break;
    }
    settleGroup(parties, chosen, transfers);
    remaining ^= chosen;
  }
  return transfers;
}

/** Earliest remaining debtor pays earliest remaining creditor; k members settle in k − 1 payments. */
function settleGroup(parties: readonly Party[], group: number, out: Transfer[]): void {
  const debtors: { position: number; left: number }[] = [];
  const creditors: { position: number; left: number }[] = [];
  for (let rest = group; rest !== 0; rest &= rest - 1) {
    const party = parties[lowestBit(rest)];
    (party.balance < 0 ? debtors : creditors).push({ position: party.position, left: Math.abs(party.balance) });
  }
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].left, creditors[c].left);
    out.push({ from: debtors[d].position, to: creditors[c].position, amount });
    debtors[d].left -= amount;
    creditors[c].left -= amount;
    if (debtors[d].left === 0) d++;
    if (creditors[c].left === 0) c++;
  }
}

/** Heuristic branch: largest residual debt pays largest residual credit; ties to the earlier-joined. */
function largestFirstTransfers(parties: readonly Party[]): Transfer[] {
  const residual = parties.map((party) => ({ position: party.position, left: party.balance }));
  const transfers: Transfer[] = [];
  for (;;) {
    let debtor = -1;
    let creditor = -1;
    residual.forEach((entry, index) => {
      if (entry.left < 0 && (debtor < 0 || entry.left < residual[debtor].left)) debtor = index;
      if (entry.left > 0 && (creditor < 0 || entry.left > residual[creditor].left)) creditor = index;
    });
    if (debtor < 0 || creditor < 0) return transfers;
    const amount = Math.min(-residual[debtor].left, residual[creditor].left);
    transfers.push({ from: residual[debtor].position, to: residual[creditor].position, amount });
    residual[debtor].left += amount;
    residual[creditor].left -= amount;
  }
}
