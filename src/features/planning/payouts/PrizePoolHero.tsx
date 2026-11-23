import type { PrizePoolView } from '@/game-management';
import { Button, Card, space, Text } from '@/ui';

export interface PrizePoolHeroProps {
  prizePool: PrizePoolView;
  onEditSettings: () => void;
}

/** The prize pool at the top of the Payout schedule step, or "Add a buy-in" with a way to add one. */
export function PrizePoolHero({ prizePool, onEditSettings }: PrizePoolHeroProps) {
  if (prizePool.kind === 'noBuyIn') {
    return (
      <Card variant="highlight" padding={space.xl} gap={space.sm}>
        <Text variant="overline" tone="even">
          Prize pool
        </Text>
        <Text variant="cardTitle" tone="supporting" accessibilityRole="text">
          {prizePool.label}
        </Text>
        <Button label="Edit game settings" icon="edit" alignStart onPress={onEditSettings} />
      </Card>
    );
  }
  return (
    <Card
      variant="highlight"
      padding={space.xl}
      gap={space.xs}
      accessibilityLabel={`Prize pool ${prizePool.amountText}. ${prizePool.detail}`}
    >
      <Text variant="overline" tone="even">
        Prize pool
      </Text>
      <Text variant="amountHero">
        {prizePool.amountText}
      </Text>
      <Text variant="supporting">{prizePool.detail}</Text>
    </Card>
  );
}
