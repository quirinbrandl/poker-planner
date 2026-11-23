import type { GameCard } from '@/game-management';
import { formatGameDateTime, participantNamesLabel, phaseModeLabel } from '@/features/shared/format';
import { Badge, Card, space, Text } from '@/ui';

/** "Resume game settings", "Resume players": the explicit way back into a Planning game. */
function entryLabel(game: GameCard): string {
  if (game.phase === 'planning') {
    if (game.lastStep === 'mode' || !game.lastStepTitle) return 'Resume mode choice';
    return `Resume ${game.lastStepTitle.toLowerCase()}`;
  }
  return game.phase === 'inProgress' ? 'Back to Play' : 'Open Payments';
}

export interface GameCardViewProps {
  game: GameCard;
  onPress: () => void;
}

/**
 * One game on Games: phase · mode badge, participant names, creation date and time, and where
 * opening it leads. In progress games get the prominent highlighted card, Planning games the quiet one.
 */
export function GameCardView({ game, onPress }: GameCardViewProps) {
  const identity = phaseModeLabel(game.phase, game.mode);
  const names = participantNamesLabel(game.participantNames);
  const date = formatGameDateTime(game.createdAt);
  const entry = entryLabel(game);
  const prominent = game.phase === 'inProgress';
  return (
    <Card
      variant={prominent ? 'highlight' : 'raised'}
      gap={space.xs + 2}
      onPress={onPress}
      accessibilityLabel={`${identity}. ${names}. ${date.replace(' · ', ', ')}. ${entry}`}
    >
      <Badge label={identity} tone={prominent ? 'primary' : 'neutral'} />
      <Text variant="title">{names}</Text>
      <Text variant="supporting">{date}</Text>
      <Text variant="supporting" tone="main">
        {`${entry} →`}
      </Text>
    </Card>
  );
}
