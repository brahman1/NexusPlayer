import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { colors } from '../../theme/tokens';

const icons = {
  index: 'home-outline',
  live: 'radio-outline',
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
              paddingBottom: 8,
              paddingTop: 8,
            },
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
      <Tabs.Screen name="search" options={{ title: 'Explorer' }} />
      <Tabs.Screen name="my-list" options={{ title: 'Ma liste' }} />
      <Tabs.Screen name="settings" options={{ title: 'Profil' }} />
      <Tabs.Screen name="guide" options={{ href: null }} />
      <Tabs.Screen name="movies" options={{ href: null }} />
      <Tabs.Screen name="series" options={{ href: null }} />
      <Tabs.Screen name="library" options={{ href: null }} />
    </Tabs>
  );
}
