import { Badge, Card, space, Text } from '@/ui';

import type { GameCardData } from './types';

export interface GameCardViewProps {
  game: GameCardData;
  onPress: () => void;
}

/**
 * One game on Games: phase · mode badge, participant names, creation date and time, and where
 * opening it leads. In progress games get the prominent highlighted card, Planning games the quiet one.
 */
export function GameCardView({ game, onPress }: GameCardViewProps) {
  const prominent = game.phase === 'inProgress';
  return (
    <Card
      variant={prominent ? 'highlight' : 'raised'}
      gap={space.xs + 2}
      onPress={onPress}
      accessibilityLabel={`${game.identityLabel}. ${game.namesText}. ${game.dateText.replace(' · ', ', ')}. ${game.entryText}`}
    >
      <Badge label={game.identityLabel} tone={prominent ? 'primary' : 'neutral'} />
      <Text variant="title">{game.namesText}</Text>
      <Text variant="supporting">{game.dateText}</Text>
      <Text variant="supporting" tone="main">
        {`${game.entryText} →`}
      </Text>
    </Card>
  );
}
