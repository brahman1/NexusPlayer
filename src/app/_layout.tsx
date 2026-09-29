import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBootstrap } from '../components/AppBootstrap';
import { colors } from '../theme/tokens';
import { useI18n } from '../i18n';

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
  const { tx } = useI18n();
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
                headerBackButtonDisplayMode: 'minimal',
                headerTitleStyle: { fontSize: 18, fontWeight: '800' },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="add-playlist" options={{ title: tx('Ajouter une source', 'Add a source') }} />
              <Stack.Screen name="playlist/[id]" options={{ title: tx('Chaînes', 'Channels') }} />
              <Stack.Screen name="player/[channelId]" options={{ title: tx('Lecture', 'Playback') }} />
              <Stack.Screen name="account" options={{ title: tx('Compte et abonnement', 'Account & subscription') }} />
            </Stack>
          </AppBootstrap>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
