import { DarkTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GameManagementProvider } from '@/state';
import { colors, EmptyState, Screen, ToastProvider } from '@/ui';

/** Navigator colours: always dark, whatever the device appearance. */
const navigationTheme: Theme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.divider,
    notification: colors.primary,
  },
};

export default function RootLayout() {
  useEffect(() => {
    // Root view / system navigation bar background behind the app, also on light-mode devices.
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider style={styles.root}>
        <ThemeProvider value={navigationTheme}>
          <ToastProvider>
            <StatusBar style="light" />
            <GameManagementProvider
              loading={<Screen />}
              renderError={(error) => (
                <Screen>
                  <EmptyState icon="error" title="Saved games can’t be opened" description={error.message} />
                </Screen>
              )}
            >
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'none',
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
            </GameManagementProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
