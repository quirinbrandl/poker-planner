/**
 * Chip distribution solver: blinds, starting stacks, the chip reserve and later stacks.
 * Pure and deterministic; no UI or storage. Vocabulary follows CONTEXT.md.
 */
export { planInitialDistribution } from './plan';
export { allocateLaterStack, measureMix, reserveCapacity } from './later';
export { SEARCH_STEP_LIMIT } from './limits';
export type {
  Blinds,
  InitialDistribution,
  InitialDistributionRequest,
  InitialDistributionResult,
  LaterStackImpossibleReason,
  LaterStackRequest,
  LaterStackResult,
  MixMeasurementRequest,
  MixMeasurementResult,
  NoDistributionReason,
  ReserveCapacityRequest,
  ReserveCapacityResult,
  SearchLimitReached,
} from './types';
