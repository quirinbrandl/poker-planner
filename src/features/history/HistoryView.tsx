import { StyleSheet, View } from 'react-native';

import { Badge, Card, colors, EmptyState, Screen, ScreenHeader, space, Stack, Text, TopBar } from '@/ui';

import type { HistoryCardData, HistoryData, HistoryFact } from './types';

function factText(fact: HistoryFact): string {
  return fact.label ? `${fact.label} ${fact.value}` : fact.value;
}

export interface HistoryCardProps {
  game: HistoryCardData;
  onPress: () => void;
}

/** One finished game: mode badge, names, created–finished time, then the summary facts. Opens its Payments. */
export function HistoryCard({ game, onPress }: HistoryCardProps) {
  const spoken = [game.modeLabel, game.namesText, game.dateText.replace(' · ', ', '), game.facts.map(factText).join(', ')].join('. ');
  return (
    <Card gap={space.xs + 2} onPress={onPress} accessibilityLabel={spoken} accessibilityHint="Opens Payments">
      <View style={styles.badge}>
        <Badge label={game.modeLabel} />
      </View>
      <Text variant="title">{game.namesText}</Text>
      <Text variant="supporting">{game.dateText}</Text>
      <View style={styles.facts}>
        {game.facts.map((fact) => (
          <Text key={factText(fact)} variant="supporting">
            {fact.label ? `${fact.label} ` : ''}
            <Text variant="label" tone="main" strong>
              {fact.value}
            </Text>
          </Text>
        ))}
      </View>
    </Card>
  );
}

export interface HistoryViewProps {
  data: HistoryData;
  /** ← Games and the empty state's Back to Games. */
  onBack: () => void;
  /** Opens that game's Payments (with ← History). */
  onOpenGame: (gameId: string) => void;
}

/** History: finished games, newest first; no search or filters. Empty: the approved empty state. */
export function HistoryView({ data, onBack, onOpenGame }: HistoryViewProps) {
  return (
    <Screen topBar={<TopBar backLabel="Games" onBack={onBack} />}>
      <ScreenHeader title="History" />
      {data.games.length === 0 ? (
        <EmptyState
          icon="clock"
          title="No finished games yet"
          description="A game shows up here once you calculate its Payments."
          action={{ label: 'Back to Games', onPress: onBack }}
        />
      ) : (
        <Stack gap="md">
          {data.games.map((game) => (
            <HistoryCard key={game.gameId} game={game} onPress={() => onOpenGame(game.gameId)} />
          ))}
        </Stack>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row' },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: space.lg,
    rowGap: space.xs,
    marginTop: space.sm,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
