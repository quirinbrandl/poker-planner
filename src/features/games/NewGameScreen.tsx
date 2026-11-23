import { router } from 'expo-router';
import { useState } from 'react';

import type { GameMode } from '@/domain/types';
import { ModeChoice } from '@/features/shared/ModeChoice';
import { gamesHref, locationHref } from '@/features/shared/routes';
import { useGameManagement } from '@/state';
import { Button, FooterActions, InlineNotice, Screen, ScreenHeader, TopBar } from '@/ui';

/**
 * New game: the mode choice. No game exists until the host chooses a mode and continues; that
 * creates the autosaved plan and opens Players. Leaving creates nothing.
 */
export default function NewGameScreen() {
  const app = useGameManagement();
  const [mode, setMode] = useState<GameMode | null>(null);
  const [missing, setMissing] = useState(false);
  const [creating, setCreating] = useState(false);

  const goToGames = () => router.dismissTo(gamesHref);

  const create = async () => {
    if (!mode) {
      setMissing(true);
      return;
    }
    if (creating) return;
    setCreating(true);
    const result = await app.games.create(mode);
    router.replace(locationHref(result.location));
  };

  return (
    <Screen
      topBar={<TopBar backLabel="Games" onBack={goToGames} />}
      footer={
        <FooterActions>
          <Button label="Continue" variant="primary" trailingIcon="chevronRight" fullWidth onPress={create} />
        </FooterActions>
      }
    >
      <ScreenHeader title="New game" />
      {missing && !mode ? <InlineNotice tone="error">Choose a game mode to continue.</InlineNotice> : null}
      <ModeChoice
        selected={mode}
        onSelect={(next) => {
          setMode(next);
          setMissing(false);
        }}
      />
    </Screen>
  );
}
