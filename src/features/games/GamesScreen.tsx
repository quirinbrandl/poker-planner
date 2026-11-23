import { router } from 'expo-router';

import { formatGameDateTime, modeLabel, phaseLabel } from '@/features/shared/format';
import { locationHref } from '@/features/shared/routes';
import type { GameMode } from '@/domain/types';
import { useGameManagement, useGames } from '@/state';
import { Button, ListRow, Screen, ScreenHeader, Stack } from '@/ui';

/** Placeholder Games home: just enough to create and reopen plans until the real screen is built. */
export default function GamesScreen() {
  const app = useGameManagement();
  const games = useGames();

  const create = async (mode: GameMode) => {
    const result = await app.games.create(mode);
    if (result.status === 'accepted') router.push(locationHref(result.location));
  };
  const open = async (gameId: string) => {
    const result = await app.games.open(gameId);
    if (result.status === 'accepted') router.push(locationHref(result.location));
  };

  return (
    <Screen>
      <ScreenHeader title="Games" />
      <Stack direction="row">
        <Button label="New cash game" variant="primary" icon="plus" onPress={() => create('cash')} />
        <Button label="New tournament" icon="plus" onPress={() => create('tournament')} />
      </Stack>
      {games.map((game) => (
        <ListRow
          key={game.id}
          title={`${modeLabel(game.mode)} · ${phaseLabel(game.phase)}`}
          subtitle={[formatGameDateTime(game.createdAt), game.participantNames.join(', ') || 'No players yet']}
          chevron
          onPress={() => open(game.id)}
        />
      ))}
    </Screen>
  );
}
