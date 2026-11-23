/**
 * Start: turns a Planning game with a feasible preview into an In progress game, recording the
 * accepted terms and the starting stack actually handed to every player.
 */
import { cashRate } from '@/domain/settlement';

import type { GameDocument, IssuanceRecord, PlayRecord, WorkingLocation } from '../core/documents';
import { rejected } from '../core/results';
import type { Runtime } from '../core/runtime';
import { computeDistribution, TOO_COMPLEX_MESSAGE } from '../planning/distribution';
import type { StartAcceptance, StartResult } from '../planning/distribution-view';
import { planningGame, withGame } from '../planning/draft';

export const PREVIEW_CHANGED_MESSAGE = 'The preview changed. Check it and start again.';

export async function startGame(rt: Runtime, gameId: string, accept: StartAcceptance): Promise<StartResult> {
  const state = rt.state();
  const access = planningGame(state, gameId);
  if (!access.ok) return access.rejection;
  const game = access.game;

  const { plan, result, denominations } = computeDistribution(rt, game);
  if (!plan || !result) return rejected('setupIncomplete', 'Fix setup inputs before starting.');
  if (result.kind === 'searchLimitReached') return rejected('tooComplex', TOO_COMPLEX_MESSAGE);
  if (result.kind === 'noValidDistribution') {
    return rejected('noValidDistribution', 'No valid distribution for current setup.');
  }
  const d = result.distribution;
  if (d.depth !== accept.depthBb || d.reserve !== accept.reserveStacks) {
    return rejected('previewChanged', PREVIEW_CHANGED_MESSAGE);
  }

  const startedAt = rt.now().toISOString();
  const issuances: IssuanceRecord[] = plan.participantIds.map((participantId) => ({
    id: rt.newId(),
    participantId,
    kind: 'initial',
    contribution: plan.buyIn,
    mix: d.stackMix.map((c) => ({ value: c.value, count: c.count })),
    recordedAt: startedAt,
  }));
  const play: PlayRecord = {
    startedAt,
    terms: {
      chipSet: denominations.map((x) => ({ value: x.value, quantity: x.quantity, color: x.color })),
      buyIn: plan.buyIn,
      requestedDepthBb: plan.requestedDepthBb,
      depthBb: d.depth,
      blinds: { small: d.blinds.small, big: d.blinds.big },
      stackValue: d.stackValue,
      coverage: plan.coverage,
      preference: plan.preference,
      reserve: { mode: game.planning.settings.reserve.mode, configured: plan.reserve, target: d.reserve },
      cashRate: plan.mode === 'cash' ? cashRate(plan.buyIn, d.stackValue) : null,
      payoutSchedule: plan.payoutSchedule
        ? { shares: [...plan.payoutSchedule.shares], presetId: plan.payoutSchedule.presetId }
        : null,
    },
    roster: game.planning.participants.map((p) => ({ ...p, entry: 'initial' })),
    issuances,
  };
  const next: GameDocument = { ...game, phase: 'inProgress', play };
  const location: WorkingLocation = { kind: 'play', gameId };
  await rt.apply({ ...withGame(state, next), location });
  return { status: 'accepted', location };
}
