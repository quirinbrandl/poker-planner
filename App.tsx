import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { GameManagement } from './src/game-management';
import { openLocalGames } from './src/game-management/native';
import { PlanningApp } from './src/mobile/PlanningApp';

export default function App() {
  const [games, setGames] = useState<GameManagement | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let opened: GameManagement | undefined;
    try {
      opened = openLocalGames();
      setGames(opened);
      setFailed(false);
    } catch {
      setFailed(true);
    }
    return () => opened?.close();
  }, [attempt]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f3eb' }}>
        {games ? (
          <PlanningApp games={games} />
        ) : failed ? (
          <View style={{ padding: 24, gap: 16 }}>
            <Text accessibilityRole="alert">
              Could not open your saved games. Your local data has not been
              replaced. Check device storage and retry.
            </Text>
            <Button
              title="Retry opening games"
              onPress={() => setAttempt((value) => value + 1)}
            />
          </View>
        ) : (
          <ActivityIndicator accessibilityLabel="Opening saved games" />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
