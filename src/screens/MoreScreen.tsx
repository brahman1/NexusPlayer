import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FocusableCard } from '../components/FocusableCard';
import { PageHeader } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { colors, spacing } from '../theme/tokens';
import { useI18n } from '../i18n';

const destinations = [
  ['Rechercher', 'Search', 'search-outline', '/(tabs)/search'],
  ['Guide TV', 'TV guide', 'calendar-outline', '/(tabs)/guide'],
  ['Favoris', 'Favorites', 'heart-outline', '/(tabs)/my-list'],
  ['Sources', 'Sources', 'library-outline', '/(tabs)/library'],
  ['Réglages', 'Settings', 'settings-outline', '/(tabs)/settings'],
] as const;

export function MoreScreen() {
  const router = useRouter();
  const { tx } = useI18n();
  return <Screen navigation><ScrollView contentContainerStyle={styles.container}>
    <PageHeader eyebrow="NEXUSPLAYER" subtitle={tx('Recherche, favoris, sources et préférences.', 'Search, favorites, sources and preferences.')} title={tx('Plus', 'More')} />
    <View style={styles.list}>{destinations.map(([french, english, icon, href]) => { const label = tx(french, english); return <FocusableCard accessibilityLabel={label} accessibilityRole="button" key={href} onPress={() => router.push(href)} style={styles.row}><Ionicons color={colors.accentStrong} name={icon} size={24} /><Text style={styles.label}>{label}</Text><Ionicons color={colors.textMuted} name="chevron-forward" size={22} /></FocusableCard>; })}</View>
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 96 },
  list: { gap: spacing.sm },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 64, padding: spacing.md },
  label: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '800' },
});
