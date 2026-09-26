import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBootstrap } from '../components/AppBootstrap';
import { colors } from '../theme/tokens';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="light" />
          <AppBootstrap>
            <Stack
              screenOptions={{
                contentStyle: { backgroundColor: colors.background },
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.text,
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="add-playlist" options={{ title: 'Ajouter une source' }} />
              <Stack.Screen name="playlist/[id]" options={{ title: 'Chaînes' }} />
              <Stack.Screen name="player/[channelId]" options={{ title: 'Lecture' }} />
            </Stack>
          </AppBootstrap>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
