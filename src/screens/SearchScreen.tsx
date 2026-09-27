import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, SectionList, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { FocusableCard } from '../components/FocusableCard';
import { EmptyState, LoadingSkeleton, PageHeader } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { DiscoveryRepository, type SearchResult } from '../repositories/DiscoveryRepository';
import { colors, radii, spacing } from '../theme/tokens';

const repository = new DiscoveryRepository();
const labels = { channel: 'Chaînes', programme: 'Programmes', movie: 'Films', series: 'Séries' } as const;
export function SearchScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 600;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(() => { setLoading(true); repository.search(query.trim()).then(setResults).finally(() => setLoading(false)); }, 220);
    return () => clearTimeout(timer);
  }, [query]);
  const changeQuery = (value: string) => { setQuery(value); if (value.trim().length < 2) { setResults([]); setLoading(false); } };
  const openResult = (item: SearchResult) => {
    if (item.kind === 'channel') router.push({ pathname: '/player/[channelId]', params: { channelId: item.id } });
    if (item.kind === 'movie' || item.kind === 'series') router.push({ pathname: '/media/[kind]/[id]', params: { kind: item.kind, id: item.id } });
  };
  const sections = (Object.keys(labels) as SearchResult['kind'][]).map((kind) => ({ title: labels[kind], data: results.filter((x) => x.kind === kind) })).filter((x) => x.data.length);
  return <Screen navigation><View style={[styles.container, compact && styles.containerCompact]}>
    <PageHeader eyebrow="EXPLORER" title="Recherche universelle" subtitle="Chaînes, programmes, films et séries au même endroit." />
    <TextInput accessibilityLabel="Rechercher" autoFocus onChangeText={changeQuery} placeholder="Rechercher dans votre médiathèque" placeholderTextColor={colors.textMuted} style={styles.input} value={query} />
    {loading ? <LoadingSkeleton /> : query.trim().length < 2 ? <EmptyState icon="search-outline" title="Que souhaitez-vous regarder ?" detail="Saisissez au moins deux caractères pour lancer la recherche." /> : sections.length === 0 ? <EmptyState icon="search-outline" title="Aucun résultat" detail="Essayez un titre plus court ou vérifiez vos sources." /> : <SectionList contentContainerStyle={styles.list} sections={sections} keyExtractor={(x) => `${x.kind}:${x.id}`} renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>} renderItem={({ item }) => <FocusableCard onPress={() => openResult(item)} style={styles.result}><Text style={styles.resultTitle}>{item.title}</Text>{item.subtitle && <Text numberOfLines={1} style={styles.subtitle}>{item.subtitle}</Text>}</FocusableCard>} />}
  </View></Screen>;
}
const styles = StyleSheet.create({ container: { flex: 1, gap: spacing.lg, padding: spacing.xl }, containerCompact: { gap: spacing.md, padding: 20 }, input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, fontSize: 18, minHeight: 58, paddingHorizontal: spacing.lg }, list: { gap: spacing.sm, paddingBottom: 96 }, section: { backgroundColor: 'rgba(7,10,15,0.9)', color: colors.accentStrong, fontSize: 18, fontWeight: '900', paddingVertical: spacing.md }, result: { minHeight: 72 }, resultTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, subtitle: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs } });
