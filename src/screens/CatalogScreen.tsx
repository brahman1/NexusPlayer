import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { MediaPoster } from '../components/MediaCards';
import { ActionButton, ContentRail, EmptyState, LoadingSkeleton, PageHeader, Panel } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { DiscoveryRepository, type CatalogCategory } from '../repositories/DiscoveryRepository';
import { WatchProgressRepository, type ContinueWatchingItem } from '../repositories/WatchProgressRepository';
import { colors, layout, radii, spacing } from '../theme/tokens';
import type { Movie, Series } from '../types/domain';

const repository = new DiscoveryRepository();
const progressRepository = new WatchProgressRepository();
type CatalogItem = Movie | Series;

export function CatalogScreen({ kind }: { kind: 'movie' | 'series' }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 600;
  const availableWidth = width - (Platform.isTV ? layout.tvSidebarCollapsed : 0);
  const columns = Platform.isTV ? 5 : width >= 1000 ? 4 : width >= 700 ? 3 : 2;
  const gutter = compact ? layout.phoneGutter : spacing.xl;
  const cardWidth = Math.max(120, Math.floor((availableWidth - gutter * 2 - spacing.sm * (columns - 1)) / columns));
  const railWidth = Platform.isTV ? 210 : compact ? 150 : 180;
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [recent, setRecent] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [continuing, setContinuing] = useState<ContinueWatchingItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [all, newest, groups, progress] = await Promise.all([
      kind === 'movie' ? repository.movies(2000) : repository.series(2000),
      kind === 'movie' ? repository.recentMovies() : repository.recentSeries(),
      repository.catalogCategories(kind),
      progressRepository.continueWatching(40),
    ]);
    setItems(all);
    setRecent(newest);
    setCategories(groups);
    setContinuing(progress.filter((entry) => entry.mediaKind === (kind === 'movie' ? 'movie' : 'episode')));
    setLoading(false);
  }, [kind]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? items.filter((item) => item.name.toLocaleLowerCase().includes(normalized)) : [];
  }, [items, query]);
  const favorites = useMemo(() => items.filter((item) => item.isFavorite).slice(0, 30), [items]);
  const hero = recent[0] ?? items[0];
  const open = (item: CatalogItem) => router.push({ pathname: '/media/[kind]/[id]', params: { kind, id: item.id } });
  const resume = (item: ContinueWatchingItem) => router.push({ pathname: item.mediaKind === 'movie' ? '/watch/movie/[id]' : '/watch/episode/[id]', params: { id: item.mediaId } });
  const poster = (item: CatalogItem, widthOverride = railWidth) => (
    <MediaPoster imageUrl={item.posterUrl} meta={'releaseYear' in item ? item.releaseYear?.toString() : 'Série'} onPress={() => open(item)} title={item.name} width={widthOverride} />
  );

  return <Screen navigation><View style={[styles.container, compact && styles.containerCompact]}>
    <PageHeader eyebrow="CATALOGUE" title={kind === 'movie' ? 'Films' : 'Séries'} subtitle={`${items.length} titres disponibles dans vos sources`} />
    <View style={styles.searchBox}><Text style={styles.searchIcon}>⌕</Text><TextInput accessibilityLabel={`Rechercher dans les ${kind === 'movie' ? 'films' : 'séries'}`} autoCorrect={false} onChangeText={setQuery} placeholder={`Rechercher un${kind === 'movie' ? ' film' : 'e série'}…`} placeholderTextColor={colors.textMuted} returnKeyType="search" style={styles.searchInput} value={query} /></View>
    {loading ? <LoadingSkeleton /> : items.length === 0 ? <EmptyState icon={kind === 'movie' ? 'film-outline' : 'albums-outline'} title={`Aucun${kind === 'movie' ? ' film' : 'e série'}`} detail="Connectez une source Xtream contenant ce type de catalogue." /> : query.trim() ? (
      results.length === 0 ? <EmptyState icon="search-outline" title="Aucun résultat" detail={`Aucun titre ne correspond à « ${query.trim()} ».`} /> : <FlatList columnWrapperStyle={styles.row} contentContainerStyle={styles.grid} data={results} key={`catalog-${columns}`} keyExtractor={(item) => item.id} numColumns={columns} renderItem={({ item }) => poster(item, cardWidth)} />
    ) : <ScrollView contentContainerStyle={styles.editorial} showsVerticalScrollIndicator={false}>
      {hero && <Panel style={styles.hero}><View style={styles.heroCopy}><Text style={styles.heroLabel}>{kind === 'movie' ? 'À LA UNE' : 'SÉRIE À DÉCOUVRIR'}</Text><Text numberOfLines={2} style={styles.heroTitle}>{hero.name}</Text>{hero.plot && <Text numberOfLines={3} style={styles.heroPlot}>{hero.plot}</Text>}<View style={styles.heroAction}><ActionButton icon="play" label="Voir la fiche" onPress={() => open(hero)} /></View></View>{poster(hero, compact ? 130 : 180)}</Panel>}
      {continuing.length > 0 && <ContentRail data={continuing} keyExtractor={(item) => `${item.mediaKind}:${item.mediaId}`} renderItem={({ item }) => <MediaPoster imageUrl={item.imageUrl} meta={`${item.subtitle ? `${item.subtitle} · ` : ''}Reprendre à ${Math.floor(item.positionSeconds / 60)} min`} onPress={() => resume(item)} progress={item.positionSeconds / item.durationSeconds} title={item.title} width={railWidth} />} title="Continuer à regarder" />}
      {recent.length > 0 && <ContentRail data={recent} keyExtractor={(item) => item.id} renderItem={({ item }) => poster(item)} title={kind === 'movie' ? 'Nouvelles sorties' : 'Ajouts récents'} />}
      {favorites.length > 0 && <ContentRail data={favorites} keyExtractor={(item) => item.id} renderItem={({ item }) => poster(item)} title="Ma liste" />}
      {categories.map((category) => { const categoryItems = items.filter((item) => item.categoryId === category.id).slice(0, 30); return categoryItems.length ? <ContentRail data={categoryItems} key={category.id} keyExtractor={(item) => item.id} renderItem={({ item }) => poster(item)} title={category.name} /> : null; })}
    </ScrollView>}
  </View></Screen>;
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  containerCompact: { paddingHorizontal: layout.phoneGutter, paddingTop: spacing.lg },
  searchBox: { alignItems: 'center', backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', minHeight: Platform.isTV ? layout.tvTargetHeight : layout.touchTarget, paddingHorizontal: spacing.md },
  searchIcon: { color: colors.textMuted, fontSize: 25, marginRight: spacing.sm },
  searchInput: { color: colors.text, flex: 1, fontSize: 16, minHeight: Platform.isTV ? layout.tvTargetHeight : layout.touchTarget, paddingVertical: 0 },
  editorial: { gap: spacing.xl, paddingBottom: 112 },
  hero: { alignItems: 'center', backgroundColor: '#15152D', flexDirection: 'row', gap: spacing.xl, justifyContent: 'space-between', overflow: 'hidden' },
  heroCopy: { flex: 1, minWidth: 0 },
  heroLabel: { color: colors.accentStrong, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  heroTitle: { color: colors.text, fontSize: Platform.isTV ? 34 : 27, fontWeight: '900', marginTop: spacing.sm },
  heroPlot: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  heroAction: { alignSelf: 'flex-start', marginTop: spacing.md },
  grid: { gap: spacing.sm, paddingBottom: 96 },
  row: { gap: spacing.sm },
});
