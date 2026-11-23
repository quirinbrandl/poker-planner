import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import NewGameScreen from '@/features/games/NewGameScreen';
import GamesScreen from '@/features/games/GamesScreen';
import HistoryScreen from '@/features/games/HistoryScreen';
import ModeStepScreen from '@/features/planning/ModeStepScreen';
import PlayersStepScreen from '@/features/planning/PlayersStepScreen';
import SettingsStepScreen from '@/features/planning/SettingsStepScreen';
import { LaunchRestoreProvider } from '@/features/shared/launch';
import { type DocumentStore, createMemoryStore } from '@/game-management';
import { GameManagementProvider } from '@/state';
import { ToastProvider } from '@/ui';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/**
 * Renders the real Games and Planning routes inside the same providers as the root layout, on the
 * given store (a fresh memory store by default). Rendering again on the same store is a restart.
 */
export function renderApp({ store = createMemoryStore(), initialUrl = '/' }: { store?: DocumentStore; initialUrl?: string } = {}) {
  let id = 0;
  function Layout() {
    return (
      <SafeAreaProvider initialMetrics={metrics}>
        <ToastProvider>
          <GameManagementProvider store={store} newId={() => `id-${++id}`} loading={<Text>Loading</Text>}>
            <LaunchRestoreProvider>
              <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
            </LaunchRestoreProvider>
          </GameManagementProvider>
        </ToastProvider>
      </SafeAreaProvider>
    );
  }
  return renderRouter(
    {
      _layout: { default: Layout, unstable_settings: { anchor: 'index' } },
      index: GamesScreen,
      'new-game': NewGameScreen,
      history: HistoryScreen,
      'game/[gameId]/planning/mode': ModeStepScreen,
      'game/[gameId]/planning/players': PlayersStepScreen,
      'game/[gameId]/planning/settings': SettingsStepScreen,
    },
    { initialUrl },
  );
}
