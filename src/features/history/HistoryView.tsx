import { StyleSheet, View } from 'react-native';

import { Badge, Card, colors, EmptyState, Icon, Screen, ScreenHeader, space, Stack, Text, TopBar } from '@/ui';

import type { HistoryCardData, HistoryData, HistoryFact } from './types';

function factText(fact: HistoryFact): string {
  return fact.label ? `${fact.label} ${fact.value}` : fact.value;
}

/** The best result ("Top" in cash, "Winner" in a tournament) shows as a trophy; the words stay spoken. */
const TROPHY_LABELS = new Set(['Top', 'Winner']);

function Fact({ fact }: { fact: HistoryFact }) {
  if (fact.label && TROPHY_LABELS.has(fact.label)) {
    return (
      <View style={styles.trophyFact}>
        <Icon name="trophy" size={16} color={colors.primary} />
        <Text variant="label" tone="main" strong>
          {fact.value}
        </Text>
      </View>
    );
  }
  return (
    <Text variant="supporting">
      {fact.label ? `${fact.label} ` : ''}
      <Text variant="label" tone="main" strong>
        {fact.value}
      </Text>
    </Text>
  );
}

export interface HistoryCardProps {
  game: HistoryCardData;
  onPress: () => void;
}

/**
 * One finished game: mode badge, names, created–finished time, then the summary facts (the best
 * result behind a trophy). The whole card opens its Payments, marked by a chevron.
 */
export function HistoryCard({ game, onPress }: HistoryCardProps) {
  const spoken = [game.modeLabel, game.namesText, game.dateText.replace(' · ', ', '), game.facts.map(factText).join(', ')].join('. ');
  return (
    <Card onPress={onPress} accessibilityLabel={spoken} accessibilityHint="Opens Payments">
      <View style={styles.row}>
        <View style={styles.body}>
          <View style={styles.badge}>
            <Badge label={game.modeLabel} size="small" />
          </View>
          <Text variant="title">{game.namesText}</Text>
          <Text variant="supporting">{game.dateText}</Text>
          <View style={styles.facts}>
            {game.facts.map((fact) => (
              <Fact key={factText(fact)} fact={fact} />
            ))}
          </View>
        </View>
        <Icon name="chevronRight" color={colors.textSupporting} />
      </View>
    </Card>
  );
}

export interface HistoryViewProps {
  data: HistoryData;
  /** The top bar's Games. */
  onBack: () => void;
  /** Opens that game's Payments (with ← History). */
  onOpenGame: (gameId: string) => void;
}

/** History: finished games, newest first; no search or filters. Empty: one line under the icon. */
export function HistoryView({ data, onBack, onOpenGame }: HistoryViewProps) {
  return (
    <Screen topBar={<TopBar backLabel="Games" onBack={onBack} />}>
      <ScreenHeader title="History" />
      {data.games.length === 0 ? (
        <EmptyState icon="clock" title="No finished games yet" />
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  body: { flex: 1, minWidth: 0, gap: space.xs + 2 },
  badge: { flexDirection: 'row' },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.lg,
    rowGap: space.xs,
    marginTop: space.sm,
  },
  trophyFact: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
