import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { useLaunchRestore } from '@/features/shared/launch';
import {
  historyHref,
  locationHref,
  newGameHref,
  savedPlayersHref,
  templatesHref,
} from '@/features/shared/routes';
import type { GameCard } from '@/game-management';
import { useGameManagement, useGames } from '@/state';
import { Button, Divider, Icon, ListRow, Screen, ScreenHeader, SectionHeading, space, Stack, Text, useToast } from '@/ui';

import { GameCardView } from './GameCardView';

function draftCount(count: number): string {
  return `${count} ${count === 1 ? 'draft' : 'drafts'}`;
}

/**
 * Games: the home. New game first, then In progress games on the prominent card and Planning
 * games on quieter cards (the interface orders each section newest first), then the secondary
 * destinations. On the first focus after launch it moves on to where the host left off instead.
 */
export default function GamesScreen() {
  const app = useGameManagement();
  const games = useGames();
  const launch = useLaunchRestore();
  const toast = useToast();

  useFocusEffect(
    useCallback(() => {
      const restore = launch.take();
      if (restore) {
        router.push(locationHref(restore));
        return;
      }
      void app.location.set({ kind: 'games' });
    }, [app, launch]),
  );

  const open = async (gameId: string) => {
    const result = await app.games.open(gameId);
    if (result.status === 'accepted') router.push(locationHref(result.location));
    else toast.show(result.reason.message, { tone: 'error' });
  };

  const inProgress = games.filter((game) => game.phase === 'inProgress');
  const planning = games.filter((game) => game.phase === 'planning');

  const cards = (list: readonly GameCard[]) => (
    <Stack gap="md">
      {list.map((game) => (
        <GameCardView key={game.id} game={game} onPress={() => void open(game.id)} />
      ))}
    </Stack>
  );

  return (
    <Screen gap={space.xl}>
      <ScreenHeader eyebrow="POKER PLANNER" title="Games" />
      <Button
        label="New game"
        icon="plus"
        variant="primary"
        fullWidth
        onPress={() => router.push(newGameHref)}
      />

      {games.length === 0 ? <Text tone="supporting">No games yet.</Text> : null}

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
          trailing={<Text variant="supporting">Empty</Text>}
          divider={false}
          density="compact"
          onPress={() => router.push(historyHref)}
        />
        <ListRow
          title="Saved players"
          leading={<Icon name="players" />}
          divider={false}
          density="compact"
          onPress={() => router.push(savedPlayersHref)}
        />
        <ListRow
          title="Chip set templates"
          leading={<Icon name="templates" />}
          divider={false}
          density="compact"
          onPress={() => router.push(templatesHref)}
        />
      </View>
    </Screen>
  );
}
