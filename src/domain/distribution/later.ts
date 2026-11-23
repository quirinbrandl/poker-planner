import { prefixValueCeilings, readChips, requireWhole, toMix, totalValue } from './engine/arith';
import { type Budget, withBudget } from './engine/budget';
import { CapacitySolver } from './engine/capacity';
import { CoverageOracle, PaymentPruner } from './engine/coverage';
import { visitStacks } from './engine/stacks';
import { SEARCH_STEP_LIMIT } from './limits';
import type {
  Blinds,
  LaterStackRequest,
  LaterStackResult,
  MixMeasurementRequest,
  MixMeasurementResult,
  ReserveCapacityRequest,
  ReserveCapacityResult,
} from './types';

function readBlinds(blinds: Blinds): void {
  requireWhole(blinds.small, 1, 'blinds.small');
  requireWhole(blinds.big, 2, 'blinds.big');
  if (blinds.small * 2 > blinds.big) throw new RangeError('blinds.small must be at most blinds.big / 2');
}

/**
 * Proposes the stack for a rebuy or a late arrival from the current bank under the game's locked
 * blinds, stack value, coverage and preference. See `LaterStackResult` for the exact contract:
 * a fully qualifying stack whenever one exists (protecting the achievable remaining reserve),
 * otherwise, for rebuys only, the exact-value stack with the highest coverage, otherwise an
 * `impossible` reason. Nothing is issued.
 */
export function allocateLaterStack(request: LaterStackRequest): LaterStackResult {
  const { values, counts: bank } = readChips(request.bank, 'bank');
  readBlinds(request.blinds);
  requireWhole(request.stackValue, 1, 'stackValue');
  requireWhole(request.coverage, 1, 'coverage');
  requireWhole(request.reserveToKeep, 0, 'reserveToKeep');
  const { blinds, stackValue: total, coverage: k, reserveToKeep: keep, preference } = request;
  return withBudget(SEARCH_STEP_LIMIT, (budget): LaterStackResult => {
    if (totalValue(values, bank) < total) return { kind: 'impossible', reason: 'insufficientValue', achievableCoverage: null };
    const oracle = new CoverageOracle(values, blinds.small, blinds.big, budget);
    const solver = new CapacitySolver(values, bank, total, oracle, k, budget);
    const formable = solver.maxStacks(bank, keep + 1);

    if (formable >= 1) {
      const protect = Math.min(keep, formable - 1);
      const pruner = new PaymentPruner(oracle, protect * k);
      let chosen: { mix: number[]; chips: number } | null = null;
      visitStacks(
        {
          values,
          caps: bank,
          total,
          preference,
          oracle,
          minCoverage: k,
          acceptSmallPart:
            protect > 0
              ? (mix) => pruner.mayPay(bank.map((c, i) => c - mix[i]))
              : undefined,
          prefixMin: solver.floors,
          prefixMax: prefixValueCeilings(values, bank, 1, protect, solver.floors),
          budget,
        },
        (mix, chips) => {
          if (!solver.canForm(bank.map((c, i) => c - mix[i]), protect)) return false;
          chosen = { mix: mix.slice(), chips };
          return true;
        },
      );
      // A packing of `formable` stacks exists, so taking one of them leaves `formable − 1`.
      const { mix, chips } = chosen!;
      return {
        kind: 'qualifying',
        mix: toMix(values, mix),
        chips,
        reserveAfter: protect,
        reserveWeakened: protect < keep,
      };
    }

    const fallback = bestReducedCoverage(values, bank, total, k, preference, oracle, budget);
    if (!fallback) return { kind: 'impossible', reason: 'unsuitableDenominations', achievableCoverage: null };
    if (!request.allowReducedCoverage) {
      return { kind: 'impossible', reason: 'coverageShortage', achievableCoverage: fallback.coverage };
    }
    return {
      kind: 'reducedCoverage',
      mix: toMix(values, fallback.mix),
      chips: fallback.chips,
      achievedCoverage: fallback.coverage,
      canPaySmallBlind: oracle.canPay(fallback.mix, 0, 1),
      canPayBigBlind: oracle.canPay(fallback.mix, 1, 0),
      reserveAfter: 0,
      reserveWeakened: keep > 0,
    };
  });
}

/** Highest achievable coverage below k first, then chip preference, then tie-break; null if no exact mix. */
function bestReducedCoverage(
  values: number[],
  bank: number[],
  total: number,
  k: number,
  preference: LaterStackRequest['preference'],
  oracle: CoverageOracle,
  budget: Budget,
): { mix: number[]; chips: number; coverage: number } | null {
  for (let coverage = k - 1; coverage >= 0; coverage--) {
    let found: { mix: number[]; chips: number; coverage: number } | null = null;
    visitStacks({ values, caps: bank, total, preference, oracle, minCoverage: coverage, budget }, (mix, chips) => {
      found = { mix: mix.slice(), chips, coverage };
      return true;
    });
    if (found) return found;
  }
  return null;
}

/**
 * Measures a given mix, typically the actual chips of a historical rebuy the host typed in:
 * value, chip count, coverage (capped at k), qualification and whether a single small-blind or
 * big-blind payment can be made at all.
 */
export function measureMix(request: MixMeasurementRequest): MixMeasurementResult {
  const { values, counts } = readChips(request.mix, 'mix');
  readBlinds(request.blinds);
  requireWhole(request.stackValue, 1, 'stackValue');
  requireWhole(request.coverage, 1, 'coverage');
  return withBudget(SEARCH_STEP_LIMIT, (budget): MixMeasurementResult => {
    const oracle = new CoverageOracle(values, request.blinds.small, request.blinds.big, budget);
    const value = totalValue(values, counts);
    const coverage = oracle.maxCoverage(counts, request.coverage);
    return {
      kind: 'measured',
      value,
      chips: counts.reduce((sum, c) => sum + c, 0),
      coverage,
      qualifies: value === request.stackValue && coverage === request.coverage,
      canPaySmallBlind: oracle.canPay(counts, 0, 1),
      canPayBigBlind: oracle.canPay(counts, 1, 0),
    };
  });
}

/**
 * How many qualifying stacks (exact `stackValue`, coverage ≥ k, mixes may differ) the inventory
 * can form at the same time, counted up to `max`. Used for "x of y reserve stacks", weakened
 * guarantee warnings and the Bank & reserve view.
 */
export function reserveCapacity(request: ReserveCapacityRequest): ReserveCapacityResult {
  const { values, counts } = readChips(request.bank, 'bank');
  readBlinds(request.blinds);
  requireWhole(request.stackValue, 1, 'stackValue');
  requireWhole(request.coverage, 1, 'coverage');
  requireWhole(request.max, 0, 'max');
  return withBudget(SEARCH_STEP_LIMIT, (budget): ReserveCapacityResult => {
    const oracle = new CoverageOracle(values, request.blinds.small, request.blinds.big, budget);
    const solver = new CapacitySolver(values, counts, request.stackValue, oracle, request.coverage, budget);
    return { kind: 'measured', stacks: solver.maxStacks(counts, request.max) };
  });
}
