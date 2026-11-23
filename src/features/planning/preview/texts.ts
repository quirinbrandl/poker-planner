/** Display texts the Distribution preview builds from the view's whole numbers. */
import type { DistributionPlanView } from '@/game-management';

/** "1,000": digit grouping for chip-unit totals. */
export function groupDigits(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "1 stack", "3 stacks". */
export function stacksLabel(count: number): string {
  return `${count} ${count === 1 ? 'stack' : 'stacks'}`;
}

/** "200 chip units". */
export function chipUnitsLabel(value: number): string {
  return `${groupDigits(value)} chip ${value === 1 ? 'unit' : 'units'}`;
}

/** Bank card sub-line: "Covers 3 reserved stacks", "Covers 1 reserved stack" or "0 reserved". */
export function reserveCoverLabel(stacks: number): string {
  if (stacks === 0) return '0 reserved';
  return `Covers ${stacks} reserved ${stacks === 1 ? 'stack' : 'stacks'}`;
}

/** Start popup Blinds row: "1 / 2 · 98 BB (requested 100 BB)". */
export function blindsDepthLabel(plan: DistributionPlanView): string {
  const base = `${plan.blinds.text} · ${plan.depth.bb} BB`;
  return plan.depth.adjusted ? `${base} (requested ${plan.depth.requestedBb} BB)` : base;
}

/** Start popup Reserve row: "3 stacks", or "1 of 3 stacks" when reduced. */
export function reserveStartLabel(plan: DistributionPlanView): string {
  const { stacks, target, reduced } = plan.reserve;
  return reduced ? `${stacks} of ${target} stacks` : stacksLabel(stacks);
}
