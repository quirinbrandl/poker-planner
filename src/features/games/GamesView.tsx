import { View } from 'react-native';

import { Button, Divider, Icon, ListRow, Screen, ScreenHeader, SectionHeading, space, Stack, Text } from '@/ui';

import { historyCountLabel } from './cardData';
import { GameCardView } from './GameCardView';
import type { GameCardData, GamesData } from './types';

function draftCount(count: number): string {
  return `${count} ${count === 1 ? 'draft' : 'drafts'}`;
}

export interface GamesViewProps {
  data: GamesData;
  onNewGame: () => void;
  onOpenGame: (gameId: string) => void;
  onOpenHistory: () => void;
  onOpenSavedPlayers: () => void;
  onOpenTemplates: () => void;
}

/**
 * Games: the home. New game first, then In progress games on the prominent card and Planning
 * games on quieter cards, then History (with its count), Saved players and Chip set templates.
 */
export function GamesView({ data, onNewGame, onOpenGame, onOpenHistory, onOpenSavedPlayers, onOpenTemplates }: GamesViewProps) {
  const { inProgress, planning } = data;
  const cards = (list: readonly GameCardData[]) => (
    <Stack gap="md">
      {list.map((game) => (
        <GameCardView key={game.id} game={game} onPress={() => onOpenGame(game.id)} />
      ))}
    </Stack>
  );

  return (
    <Screen gap={space.xl}>
      <ScreenHeader eyebrow="POKER PLANNER" title="Games" />
      <Button label="New game" icon="plus" variant="primary" fullWidth onPress={onNewGame} />

      {inProgress.length + planning.length === 0 ? <Text tone="supporting">No games yet.</Text> : null}

      {inProgress.length > 0 ? (
        <Stack gap="md">
          <SectionHeading title="In progress" />
          {cards(inProgress)}
        </Stack>
      ) : null}

      {planning.length > 0 ? (
        <Stack gap="md">
          <SectionHeading title="Planning" meta={draftCount(planning.length)} />
          {cards(planning)}
        </Stack>
      ) : null}

      <View>
        <Divider />
        <ListRow
          title="History"
          leading={<Icon name="clock" />}
          trailing={<Text variant="supporting">{historyCountLabel(data.historyCount)}</Text>}
          accessibilityLabel={`History, ${historyCountLabel(data.historyCount)}`}
          divider={false}
          density="compact"
          onPress={onOpenHistory}
        />
        <ListRow
          title="Saved players"
          leading={<Icon name="players" />}
          divider={false}
          density="compact"
          onPress={onOpenSavedPlayers}
        />
        <ListRow
          title="Chip set templates"
          leading={<Icon name="templates" />}
          divider={false}
          density="compact"
          onPress={onOpenTemplates}
        />
      </View>
    </Screen>
  );
}
