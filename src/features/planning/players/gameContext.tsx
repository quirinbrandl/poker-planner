import { formatGameDateTime, modeLabel, playerCountLabel } from '@/features/shared/format';
import type { PlanningView } from '@/game-management';
import { Badge, BadgeRow } from '@/ui';

/** The game identity shown above the picker and the new-player editor, as on the Players step. */
export function planningContext(plan: PlanningView) {
  return {
    badges: (
      <BadgeRow>
        <Badge label={modeLabel(plan.mode)} />
        <Badge label="Planning" tone="primary" />
      </BadgeRow>
    ),
    context: `${formatGameDateTime(plan.createdAt)} · ${playerCountLabel(plan.players.participants.length)}`,
  };
}
