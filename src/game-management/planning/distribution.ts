/**
 * The Distribution preview: runs the chip distribution solver on the validated plan and words the
 * outcome for the screen. Derived, never stored. The solver can take noticeable time on a phone for
 * an unusual chip set, so this runs only when the preview is read (and at Start), memoized while
 * the parts of the draft it depends on keep their identities.
 */
import { formatEur, formatEurPerUnit } from '@/domain/money';
import { planInitialDistribution, type InitialDistributionResult } from '@/domain/distribution';
import { cashRate } from '@/domain/settlement';
import type { ChipColor, ChipDenomination, ChipMix } from '@/domain/types';

import type { GameDocument, StepId } from '../core/documents';
import type { Problem } from '../core/problems';
import type { Runtime } from '../core/runtime';
import { formatCount } from '../shared/numbers';
import type { ChipCountView, DistributionPlanView, DistributionPreviewView, PreviewStepView } from './distribution-view';
import { STEP_TITLES, stepsForMode } from './draft';
import { payoutBlockerProblems } from './payout-validation';
import { type GameValidation, validatePlan, type ValidPlan } from './validation';

export interface ComputedDistribution {
  /** `null` while setup is incomplete. */
  plan: ValidPlan | null;
  validation: GameValidation;
  /** The solver's answer for `plan`; `null` while setup is incomplete. */
  result: InitialDistributionResult | null;
  /** `plan.denominations` ascending by value: the order of every mix. */
  denominations: ChipDenomination[];
}

/** The parts of a game the preview depends on (navigation and edited flags do not matter). */
function previewDeps(game: GameDocument): readonly unknown[] {
  const draft = game.planning;
  return [game.mode, draft.participants, draft.chipSet.rows, draft.settings, draft.payoutSchedule];
}

export function ascending(denominations: readonly ChipDenomination[]): ChipDenomination[] {
  return [...denominations].sort((a, b) => a.value - b.value);
}

/** The solver's recommendation for the game's current draft. */
export function computeDistribution(rt: Runtime, game: GameDocument): ComputedDistribution {
  return rt.memo(`planning.distribution:${game.id}`, previewDeps(game), () => {
    const { plan, validation } = validatePlan(game);
    if (!plan) return { plan, validation, result: null, denominations: [] };
    const denominations = ascending(plan.denominations);
    const result = planInitialDistribution({
      chipSet: denominations.map((d) => ({ value: d.value, count: d.quantity })),
      players: plan.participantIds.length,
      requestedDepth: plan.requestedDepthBb,
      coverage: plan.coverage,
      reserveTarget: plan.reserve,
      preference: plan.preference,
    });
    return { plan, validation, result, denominations };
  });
}

export function withColors(mix: ChipMix, denominations: readonly ChipDenomination[]): ChipCountView[] {
  const colors = new Map<number, ChipColor | null>(denominations.map((d) => [d.value, d.color]));
  return mix.map((c) => ({ value: c.value, color: colors.get(c.value) ?? null, count: c.count }));
}

const plural = (count: number, one: string, many = `${one}s`) => `${formatCount(count)} ${count === 1 ? one : many}`;

/** "25 and 100", "1, 5 and 25". */
function valueList(values: readonly number[]): string {
  const texts = values.map(formatCount);
  return texts.length <= 1 ? (texts[0] ?? '') : `${texts.slice(0, -1).join(', ')} and ${texts[texts.length - 1]}`;
}

export const TOO_COMPLEX_MESSAGE =
  'This chip set is too large to work out on the phone. Simplify it, for example by removing a few rarely used denominations.';

/** Short title and message naming why no distribution exists, with the game's own numbers. */
function noDistribution(
  reason: 'insufficientValue' | 'unsuitableDenominations' | 'insufficientBlindChips',
  plan: ValidPlan,
  denominations: readonly ChipDenomination[],
): Extract<DistributionPreviewView, { kind: 'noValidDistribution' }> {
  const players = plan.participantIds.length;
  const k = plan.coverage;
  const available = denominations.filter((d) => d.quantity > 0);
  switch (reason) {
    case 'insufficientValue': {
      const total = denominations.reduce((sum, d) => sum + d.value * d.quantity, 0);
      const perPlayer = denominations.reduce((sum, d) => sum + d.value * Math.floor(d.quantity / players), 0);
      // The smallest stack that can pay k small blinds of 1 and k big blinds of 2.
      const minimum = 2 * Math.ceil((3 * k) / 2);
      return {
        kind: 'noValidDistribution',
        reason,
        title: 'Not enough chip value',
        message:
          total === 0
            ? 'The chip set has no chips to hand out.'
            : `The chip set holds ${plural(total, 'chip unit')}, at most ${formatCount(perPlayer)} for each of ${players} players. A stack that pays ${plural(k, 'small and big blind', 'small and big blinds')} needs at least ${formatCount(minimum)}.`,
      };
    }
    case 'unsuitableDenominations':
      return {
        kind: 'noValidDistribution',
        reason,
        title: 'Unsuitable denominations',
        message: `With chips of ${valueList(available.map((d) => d.value))}, ${players} identical stacks can’t pay a small and a big blind exactly at any depth.`,
      };
    case 'insufficientBlindChips': {
      const smallest = available[0];
      return {
        kind: 'noValidDistribution',
        reason,
        title: 'Not enough blind-paying chips',
        message: `Each stack needs chips for ${k} separate small and big blind payments; the chip set has ${plural(smallest.quantity, 'chip')} of value ${formatCount(smallest.value)} for ${players} players.`,
      };
    }
  }
}

function planView(computed: ComputedDistribution): DistributionPreviewView {
  const { plan, result, denominations } = computed;
  if (!plan || !result) return { kind: 'setupIncomplete' };
  if (result.kind === 'searchLimitReached') return { kind: 'tooComplex', message: TOO_COMPLEX_MESSAGE };
  if (result.kind === 'noValidDistribution') return noDistribution(result.reason, plan, denominations);
  const d = result.distribution;
  const players = plan.participantIds.length;
  const bank = withColors(d.bank, denominations);
  const view: DistributionPlanView = {
    players,
    stack: { value: d.stackValue, chips: d.chipsPerStack, mix: withColors(d.stackMix, denominations) },
    depth: { bb: d.depth, requestedBb: d.requestedDepth, adjusted: d.depthAdjusted },
    blinds: {
      small: d.blinds.small,
      big: d.blinds.big,
      text: `${formatCount(d.blinds.small)} / ${formatCount(d.blinds.big)}`,
      rounded: !d.smallBlindIsHalf,
    },
    money:
      plan.mode === 'cash'
        ? {
            kind: 'cash',
            buyIn: plan.buyIn,
            buyInText: formatEur(plan.buyIn),
            rateText: formatEurPerUnit(cashRate(plan.buyIn, d.stackValue)),
          }
        : {
            kind: 'tournament',
            buyIn: plan.buyIn,
            buyInText: formatEur(plan.buyIn),
            prizePool: plan.buyIn * players,
            prizePoolText: formatEur(plan.buyIn * players),
          },
    reserve: { stacks: d.reserve, target: d.reserveTarget, reduced: d.reserveReduced },
    bank: { chips: bank.reduce((sum, c) => sum + c.count, 0), mix: bank },
  };
  return { kind: 'planned', plan: view };
}

/** The steps with problems, in wizard order, as the Setup incomplete card lists them. */
export function previewBlockers(
  game: GameDocument,
  validation: GameValidation,
): { step: StepId; title: string; problems: readonly Problem[] }[] {
  return stepsForMode(game.mode)
    .filter((step) => validation.byStep[step].length > 0)
    .map((step) => ({
      step,
      title: STEP_TITLES[step],
      problems:
        step === 'payouts'
          ? payoutBlockerProblems(game.planning.payoutSchedule, validation.byStep.payouts)
          : validation.byStep[step],
    }));
}

export function buildPreviewStepView(rt: Runtime, game: GameDocument): PreviewStepView {
  const computed = computeDistribution(rt, game);
  return rt.memo(`planning.preview:${game.id}`, [computed], () => {
    const distribution = planView(computed);
    const blockers = previewBlockers(game, computed.validation);
    return {
      blockers,
      setupComplete: blockers.length === 0,
      distribution,
      canStart: distribution.kind === 'planned',
    };
  });
}
