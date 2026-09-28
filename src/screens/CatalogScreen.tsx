import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { MediaPoster } from '../components/MediaCards';
import { ActionButton, ContentRail, EmptyState, LoadingSkeleton, PageHeader } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { cachedOverview, CatalogRepository, staleOverview, type CatalogCard, type CatalogFilter, type CatalogGroup, type CatalogKind, type CatalogOverview } from '../repositories/CatalogRepository';
import { WatchProgressRepository, type ContinueWatchingItem } from '../repositories/WatchProgressRepository';
import { subscribeCatalogInvalidation } from '../services/catalogInvalidation';
import { colors, layout, radii, spacing } from '../theme/tokens';

const repository = new CatalogRepository();
const progressRepository = new WatchProgressRepository();
const PAGE_SIZE = 48;
type Browse = { title: string; filter: CatalogFilter };

function Poster({ item, width, kind }: { item: CatalogCard; width: number; kind: CatalogKind }) {
  const router = useRouter();
  return <MediaPoster imageUrl={item.posterUrl} meta={item.year?.toString() ?? (kind === 'series' ? 'Série' : undefined)} onPress={() => router.push({ pathname: '/media/[kind]/[id]', params: { kind, id: item.id } })} title={item.name} width={width} />;
}

const CategoryRail = memo(function CategoryRail({ group, kind, width, onBrowse }: { group: CatalogGroup; kind: CatalogKind; width: number; onBrowse: (browse: Browse) => void }) {
  return <View style={styles.section}>
    <View style={styles.sectionHeading}><Text style={styles.groupTitle}>{group.name} · {group.count}</Text><ActionButton label="Tout voir" variant="secondary" onPress={() => onBrowse({ title: group.name, filter: { categoryId: group.id } })} /></View>
    <FlatList horizontal data={group.preview} initialNumToRender={4} maxToRenderPerBatch={4} windowSize={3} keyExtractor={(item) => item.id} contentContainerStyle={styles.horizontal} renderItem={({ item }) => <Poster item={item} kind={kind} width={width} />} />
  </View>;
});

function CatalogGrid({ kind, filter, columns, width }: { kind: CatalogKind; filter: CatalogFilter; columns: number; width: number }) {
  const [items, setItems] = useState<CatalogCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const active = useRef(true);
  const fetchPage = useCallback(async (offset: number) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(false);
    try {
      const page = await repository.page(kind, filter, offset, PAGE_SIZE);
      if (!active.current) return;
      setItems((current) => offset ? [...current, ...page.items] : page.items);
      setTotal(page.total);
    } catch { if (active.current) setError(true); }
    finally { busy.current = false; if (active.current) setLoading(false); }
  }, [filter, kind]);
  useEffect(() => {
    active.current = true;
    const timer = setTimeout(() => { void fetchPage(0); }, filter.query ? 220 : 0);
    return () => { active.current = false; clearTimeout(timer); };
  }, [fetchPage, filter.query]);
  return <FlatList key={columns} data={items} numColumns={columns} keyExtractor={(item) => item.id} renderItem={({ item }) => <Poster item={item} kind={kind} width={width} />} columnWrapperStyle={styles.horizontal} contentContainerStyle={styles.grid} initialNumToRender={12} maxToRenderPerBatch={8} windowSize={5}
    ListHeaderComponent={<Text style={styles.muted}>{total} titres · {items.length} affichés</Text>}
    ListEmptyComponent={!loading && !error ? <EmptyState title="Aucun résultat" detail="Essayez un autre titre ou une autre catégorie." /> : null}
    onEndReached={() => { if (!error && items.length < total) void fetchPage(items.length); }} onEndReachedThreshold={0.5}
    ListFooterComponent={error ? <ActionButton label="Réessayer" onPress={() => void fetchPage(items.length)} /> : loading ? <ActivityIndicator color={colors.accentStrong} /> : null} />;
}

export function CatalogScreen({ kind }: { kind: CatalogKind }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 600;
  const columns = Platform.isTV ? 5 : width >= 1000 ? 4 : width >= 700 ? 3 : 2;
  const gutter = compact ? layout.phoneGutter : spacing.xl;
  const cardWidth = Math.max(80, Math.floor((width - (Platform.isTV ? layout.tvSidebarCollapsed : 0) - gutter * 2 - spacing.sm * (columns - 1)) / columns));
  const railWidth = Platform.isTV ? 210 : compact ? 145 : 180;
  const [overview, setOverview] = useState<CatalogOverview | null>(() => staleOverview(kind));
  const [revision, setRevision] = useState('');
  const [favorites, setFavorites] = useState<CatalogCard[]>([]);
  const [continuing, setContinuing] = useState<ContinueWatchingItem[]>([]);
  const [query, setQuery] = useState('');
  const [browse, setBrowse] = useState<Browse | null>(null);
  const [error, setError] = useState(false);
  const [catalogGeneration, setCatalogGeneration] = useState(0);
  useEffect(() => subscribeCatalogInvalidation(() => setCatalogGeneration((value) => value + 1)), []);
  useFocusEffect(useCallback(() => {
    let active = true;
    void (async () => {
      try {
        const version = `${await repository.revision()}:${catalogGeneration}`;
        const [catalog, saved, progress] = await Promise.all([
          cachedOverview(repository, kind, version), repository.page(kind, { favorites: true }, 0, 18), progressRepository.continueWatching(40),
        ]);
        if (!active) return;
        setOverview(catalog); setRevision(version); setFavorites(saved.items);
        setContinuing(progress.filter((entry) => entry.mediaKind === (kind === 'movie' ? 'movie' : 'episode')));
        setError(false);
      } catch { if (active) setError(true); }
    })();
    return () => { active = false; };
  }, [catalogGeneration, kind]));

  const filter = useMemo(() => ({ ...browse?.filter, query: query.trim() }), [browse, query]);
  const selectBrowse = useCallback((next: Browse) => setBrowse(next), []);
  const showGrid = Boolean(browse || query.trim());
  const recentTitle = kind === 'movie' ? 'Films les plus récents · année de sortie' : 'Derniers titres importés';
  const featured = overview?.recent[0];
  const header = <View style={styles.section}>
    {featured && <View style={styles.hero}>
      {featured.posterUrl && <Image accessible={false} source={{ uri: featured.posterUrl }} style={styles.heroArt} resizeMode="cover" />}
      <LinearGradient colors={['#101621', 'rgba(23,17,55,0.88)', 'rgba(23,17,55,0.2)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={styles.heroCopy}><Text style={styles.eyebrow}>À DÉCOUVRIR</Text><Text style={styles.heroTitle} numberOfLines={3}>{featured.name}</Text><ActionButton label="Voir la fiche" icon="information-circle-outline" onPress={() => router.push({ pathname: '/media/[kind]/[id]', params: { kind, id: featured.id } })} /></View>
    </View>}
    <Text style={styles.muted}>Explorez vos sources par catégorie. Les nouveautés dépendent des informations fournies.</Text>
    <ActionButton label="Parcourir tous les titres" icon="grid-outline" onPress={() => setBrowse({ title: 'Tous les titres', filter: {} })} />
    {continuing.length > 0 && <ContentRail title="Continuer à regarder" data={continuing} keyExtractor={(item) => `${item.mediaKind}:${item.mediaId}`} renderItem={({ item }) => <MediaPoster imageUrl={item.imageUrl} meta={item.subtitle ?? `Reprendre à ${Math.floor(item.positionSeconds / 60)} min`} progress={item.durationSeconds > 0 ? item.positionSeconds / item.durationSeconds : 0} title={item.title} width={railWidth} onPress={() => router.push({ pathname: item.mediaKind === 'movie' ? '/watch/movie/[id]' : '/watch/episode/[id]', params: { id: item.mediaId } })} />} />}
    {!!overview?.recent.length && <><ContentRail title={recentTitle} data={overview.recent} keyExtractor={(item) => item.id} renderItem={({ item }) => <Poster item={item} kind={kind} width={railWidth} />} /><ActionButton label="Voir tous les titres récents" variant="secondary" onPress={() => setBrowse({ title: recentTitle, filter: { recent: true } })} /></>}
    {favorites.length > 0 && <><ContentRail title="Ma liste" data={favorites} keyExtractor={(item) => item.id} renderItem={({ item }) => <Poster item={item} kind={kind} width={railWidth} />} /><ActionButton label="Voir tous les favoris" variant="secondary" onPress={() => setBrowse({ title: 'Ma liste', filter: { favorites: true } })} /></>}
  </View>;

  return <Screen navigation><View style={[styles.container, { paddingHorizontal: gutter }]}>
    <PageHeader eyebrow="CATALOGUE" title={kind === 'movie' ? 'Films' : 'Séries'} subtitle={overview ? `${overview.total} titres importés · ${overview.groups.length} catégories` : 'Chargement du catalogue…'} />
    <TextInput accessibilityLabel="Rechercher dans tout le catalogue" autoCorrect={false} placeholder="Rechercher dans tout le catalogue…" placeholderTextColor={colors.textMuted} style={styles.search} value={query} onChangeText={setQuery} />
    {showGrid && <View style={styles.sectionHeading}><ActionButton label="Découvrir" variant="secondary" icon="arrow-back" onPress={() => { setBrowse(null); setQuery(''); }} /><Text style={styles.groupTitle}>{browse?.title ?? 'Résultats de recherche'}</Text></View>}
    {error && <Text accessibilityRole="alert" style={styles.error}>Chargement impossible. Revenez sur cet onglet pour réessayer.</Text>}
    {showGrid ? <CatalogGrid key={`${kind}:${revision}:${JSON.stringify(filter)}`} kind={kind} filter={filter} columns={columns} width={cardWidth} /> : !overview ? (!error && <LoadingSkeleton />) : overview.total === 0 ? <EmptyState title="Aucun titre importé" detail="Ajoutez ou actualisez une source contenant des films et séries." /> : <FlatList data={overview.groups} key={`${kind}:${revision}`} keyExtractor={(group) => group.id} ListHeaderComponent={header} contentContainerStyle={styles.editorial} initialNumToRender={2} maxToRenderPerBatch={2} windowSize={3} renderItem={({ item }) => <CategoryRail group={item} kind={kind} width={railWidth} onBrowse={selectBrowse} />} />}
  </View></Screen>;
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.md, paddingTop: spacing.lg },
  search: { color: colors.text, backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, minHeight: 48, paddingHorizontal: spacing.md, fontSize: 16 },
  editorial: { gap: spacing.xl, paddingBottom: 112 },
  section: { gap: spacing.md },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  groupTitle: { color: colors.text, fontSize: Platform.isTV ? 24 : 19, fontWeight: '800', flex: 1, minWidth: 100 },
  horizontal: { gap: spacing.sm },
  grid: { gap: spacing.md, paddingBottom: 112 },
  muted: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
  hero: { borderRadius: radii.lg, backgroundColor: colors.surface, overflow: 'hidden', minHeight: 240 },
  heroArt: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%' },
  heroCopy: { gap: spacing.md, padding: spacing.lg, width: '75%' },
  heroTitle: { color: colors.text, fontSize: Platform.isTV ? 32 : 23, fontWeight: '900' },
  eyebrow: { color: colors.accentStrong, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
});
