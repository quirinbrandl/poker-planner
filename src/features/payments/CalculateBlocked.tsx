import { InlineNotice } from '@/ui';

import { CALCULATE_BLOCKED_TITLE } from './texts';

export interface CalculateBlockedProps {
  /** The one reason, as game management words it: "Find the missing chips first." */
  reason: string;
}

/**
 * “Can’t calculate Payments yet” and its one reason: shown on Results after the host activates
 * the unavailable Calculate Payments button (the screen then moves focus to the status card).
 */
export function CalculateBlocked({ reason }: CalculateBlockedProps) {
  return (
    <InlineNotice tone="error" title={CALCULATE_BLOCKED_TITLE}>
      {reason}
    </InlineNotice>
  );
}
