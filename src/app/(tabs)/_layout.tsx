import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/tokens';
import { useI18n } from '../../i18n';

const icons = {
  index: 'home-outline',
  live: 'radio-outline',
  movies: 'film-outline',
  series: 'albums-outline',
  more: 'grid-outline',
  search: 'search-outline',
  'my-list': 'heart-outline',
  library: 'library-outline',
  settings: 'settings-outline',
  'content-preferences': 'options-outline',
} as const;

export default function TabLayout() {
  const { tx } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compactLabels = width < 430;
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
              height: 58 + insets.bottom,
              paddingBottom: Math.max(insets.bottom, 6),
              paddingTop: 6,
            },
        tabBarAllowFontScaling: false,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: compactLabels ? 9 : 11, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            color={color}
            name={icons[route.name as keyof typeof icons] ?? 'ellipse-outline'}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: tx('Accueil', 'Home') }} />
      <Tabs.Screen name="live" options={{ title: 'Live' }} />
      <Tabs.Screen name="movies" options={{ title: tx('Films', 'Movies') }} />
      <Tabs.Screen name="series" options={{ title: tx('Séries', 'Series') }} />
      <Tabs.Screen name="my-list" options={{ title: tx('Favoris', 'Favorites') }} />
      <Tabs.Screen name="more" options={{ title: tx('Plus', 'More') }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="content-preferences" options={{ href: null }} />
      <Tabs.Screen name="guide" options={{ href: null }} />
      <Tabs.Screen name="library" options={{ href: null }} />
    </Tabs>
  );
}
