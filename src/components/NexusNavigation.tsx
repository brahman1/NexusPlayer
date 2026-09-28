import { Ionicons } from '@expo/vector-icons';
import { type Href, usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, layout, spacing } from '../theme/tokens';
import { useI18n } from '../i18n';
import { FocusableCard } from './FocusableCard';

const items = [
  ['Accueil', 'Home', 'home-outline', '/(tabs)'],
  ['Live', 'Live', 'radio-outline', '/(tabs)/live'],
  ['Guide', 'Guide', 'calendar-outline', '/(tabs)/guide'],
  ['Films', 'Movies', 'film-outline', '/(tabs)/movies'],
  ['Séries', 'Series', 'albums-outline', '/(tabs)/series'],
  ['Recherche', 'Search', 'search-outline', '/(tabs)/search'],
  ['Favoris', 'Favorites', 'heart-outline', '/(tabs)/my-list'],
  ['Sources', 'Sources', 'server-outline', '/(tabs)/library'],
  ['Réglages', 'Settings', 'settings-outline', '/(tabs)/settings'],
] as const;

export function NexusSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const { tx } = useI18n();
  if (!Platform.isTV) return null;

  return (
    <View accessibilityLabel={tx('Navigation principale', 'Main navigation')} style={[styles.sidebar, expanded && styles.sidebarExpanded]}>
      <View style={styles.brand}><Ionicons color={colors.text} name="play" size={26} /></View>
      <ScrollView contentContainerStyle={styles.navigationItems} onFocus={() => setExpanded(true)} onBlur={() => setExpanded(false)} showsVerticalScrollIndicator={expanded}>
      {items.map(([french, english, icon, href], index) => {
        const label = tx(french, english);
        const active = href === '/(tabs)' ? pathname === '/' || pathname.endsWith('/index') : pathname.includes(href.split('/').pop()!);
        return (
          <FocusableCard accessibilityLabel={label} accessibilityRole="button" autoFocus={index === 0 && pathname === '/'} key={href} onPress={() => router.push(href as Href)} style={[styles.item, active && styles.active]}>
            <Ionicons color={active ? colors.text : colors.textMuted} name={icon} size={24} />
            {expanded && <Text numberOfLines={1} style={[styles.label, active && styles.activeLabel]}>{label}</Text>}
          </FocusableCard>
        );
      })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { backgroundColor: colors.surface, borderRightColor: colors.border, borderRightWidth: 1, gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, width: layout.tvSidebarCollapsed, zIndex: 20 },
  sidebarExpanded: { position: 'absolute', bottom: 0, left: 0, top: 0, width: layout.tvSidebarExpanded },
  navigationItems: { gap: spacing.xs, paddingBottom: spacing.xl },
  brand: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.accent, borderRadius: 14, height: 48, justifyContent: 'center', marginBottom: spacing.md, width: 48 },
  item: { alignItems: 'center', backgroundColor: 'transparent', borderColor: 'transparent', flexDirection: 'row', gap: spacing.md, minHeight: 58, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  active: { backgroundColor: colors.surfaceRaised, borderColor: colors.accent },
  label: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
  activeLabel: { color: colors.text },
});
