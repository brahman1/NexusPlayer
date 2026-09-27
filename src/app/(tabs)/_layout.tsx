import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { colors } from '../../theme/tokens';

const icons = {
  index: 'home-outline',
  live: 'radio-outline',
  movies: 'film-outline',
  series: 'albums-outline',
  more: 'grid-outline',
  search: 'search-outline',
  'my-list': 'bookmark-outline',
  library: 'library-outline',
  settings: 'settings-outline',
} as const;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: Platform.isTV
          ? { display: 'none' }
          : {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              height: 66,
              paddingBottom: 7,
              paddingTop: 7,
            },
        tabBarAllowFontScaling: false,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            color={color}
            name={icons[route.name as keyof typeof icons] ?? 'ellipse-outline'}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="live" options={{ title: 'Live' }} />
      <Tabs.Screen name="movies" options={{ title: 'Films' }} />
      <Tabs.Screen name="series" options={{ title: 'Séries' }} />
      <Tabs.Screen name="more" options={{ title: 'Plus' }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="my-list" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="guide" options={{ href: null }} />
      <Tabs.Screen name="library" options={{ href: null }} />
    </Tabs>
  );
}
