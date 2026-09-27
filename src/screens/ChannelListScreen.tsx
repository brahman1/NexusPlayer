import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { FocusableCard } from '../components/FocusableCard';
import { Screen } from '../components/Screen';
import { SQLiteChannelRepository, type ChannelCategory } from '../repositories/SQLiteChannelRepository';
import { EpgRepository } from '../repositories/EpgRepository';
import { preferences } from '../storage/preferences';
import { colors, radii, spacing } from '../theme/tokens';
import type { Channel } from '../types/domain';

const repository = new SQLiteChannelRepository();
const epgRepository = new EpgRepository();
const PAGE_SIZE = 250;
const ROW_STRIDE = 92;
type Filter = 'all' | 'favorites' | 'recent' | string;

function FilterButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <FocusableCard onPress={onPress} style={[styles.filterButton, active && styles.filterActive]}>
      <Text numberOfLines={1} style={[styles.filterLabel, active && styles.filterLabelActive]}>{label}</Text>
    </FocusableCard>
  );
}

function ChannelLogo({ channel }: { channel: Channel }) {
  const [failed, setFailed] = useState(false);
  if (!channel.logoUrl || failed) {
    return <View style={styles.logoFallback}><Text style={styles.logoLetter}>{channel.displayName.slice(0, 1).toUpperCase()}</Text></View>;
  }
  return <Image onError={() => setFailed(true)} resizeMode="contain" source={{ uri: channel.logoUrl }} style={styles.logo} />;
}

export function ChannelListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const showPreview = width >= 1100;
  const compact = width < 600;
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<ChannelCategory[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loadedOffset, setLoadedOffset] = useState(0);
  const [restoreIndex, setRestoreIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedChannel, setFocusedChannel] = useState<Channel | null>(null);
  const [programmes, setProgrammes] = useState<Awaited<ReturnType<EpgRepository['nowNext']>>>([]);
  const requestVersion = useRef(0);
  const loadingMoreRef = useRef(false);
  const listRef = useRef<FlatList<Channel>>(null);
  const lastFocusedId = id ? preferences.getLastFocusedChannel(id) : null;
  const selectedCategoryIds = useMemo(() => categories.find((category) => category.id === filter)?.categoryIds, [categories, filter]);
  const categoryNamesById = useMemo(() => new Map(categories.flatMap((category) => category.categoryIds.map((categoryId) => [categoryId, category.displayName] as const))), [categories]);

  const loadChannels = useCallback(async () => {
    if (!id) return;
    const version = ++requestVersion.current;
    const filters = {
      search,
      categoryIds: selectedCategoryIds,
      favoritesOnly: filter === 'favorites',
      recentOnly: filter === 'recent',
    };
    try {
      setError(null);
      const savedId = filter === 'all' && !search ? preferences.getLastFocusedChannel(id) : null;
      const savedIndex = savedId ? await repository.indexOfChannel(id, savedId) : null;
      const offset = savedIndex === null ? 0 : Math.floor(savedIndex / PAGE_SIZE) * PAGE_SIZE;
      const [firstPage, total] = await Promise.all([
        repository.listByPlaylist(id, { ...filters, limit: PAGE_SIZE, offset }),
        repository.countByPlaylist(id, filters),
      ]);
      if (version !== requestVersion.current) return;
      setChannels(firstPage);
      setLoadedOffset(offset);
      setRestoreIndex(savedIndex === null ? null : savedIndex - offset);
      setFocusedChannel(firstPage.find((item) => item.id === savedId) ?? firstPage[0] ?? null);
      setTotalCount(total);
    } catch (caught) {
      if (version !== requestVersion.current) return;
      setError(caught instanceof Error ? caught.message : 'Chargement impossible.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [filter, id, search, selectedCategoryIds]);

  const loadMore = useCallback(async () => {
    if (!id || loading || loadingMoreRef.current || channels.length >= totalCount) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const version = requestVersion.current;
    try {
      const nextPage = await repository.listByPlaylist(id, {
        search,
        categoryIds: selectedCategoryIds,
        favoritesOnly: filter === 'favorites',
        recentOnly: filter === 'recent',
        limit: PAGE_SIZE,
        offset: loadedOffset + channels.length,
      });
      if (version === requestVersion.current) {
        setChannels((current) => [...current, ...nextPage]);
      }
    } catch (caught) {
      if (version === requestVersion.current) {
        setError(caught instanceof Error ? caught.message : 'Chargement de la suite impossible.');
      }
    } finally {
      loadingMoreRef.current = false;
      if (version === requestVersion.current) setLoadingMore(false);
    }
  }, [channels.length, filter, id, loadedOffset, loading, search, selectedCategoryIds, totalCount]);

  const loadPrevious = useCallback(async () => {
    if (!id || loading || loadingMoreRef.current || loadedOffset <= 0) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const version = requestVersion.current;
    const offset = Math.max(0, loadedOffset - PAGE_SIZE);
    try {
      const previousPage = await repository.listByPlaylist(id, { limit: loadedOffset - offset, offset });
      if (version === requestVersion.current) {
        setChannels((current) => [...previousPage, ...current]);
        setLoadedOffset(offset);
      }
    } catch (caught) {
      if (version === requestVersion.current) setError(caught instanceof Error ? caught.message : 'Chargement des chaînes précédentes impossible.');
    } finally {
      loadingMoreRef.current = false;
      if (version === requestVersion.current) setLoadingMore(false);
    }
  }, [id, loadedOffset, loading]);

  useEffect(() => {
    if (!id) return;
    repository.listCategories(id).then(setCategories).catch(() => setCategories([]));
  }, [id]);

  useEffect(() => {
    if (!focusedChannel) return;
    epgRepository.nowNext(focusedChannel.playlistId, focusedChannel.tvgId, focusedChannel.tvgName, focusedChannel.name).then(setProgrammes).catch(() => setProgrammes([]));
  }, [focusedChannel]);

  useEffect(() => {
    if (restoreIndex === null || channels.length === 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ animated: false, index: Math.min(restoreIndex, channels.length - 1), viewPosition: 0.35 });
      setRestoreIndex(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [channels.length, restoreIndex]);

  useFocusEffect(useCallback(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      void loadChannels();
    }, search ? 200 : 0);
    return () => clearTimeout(timer);
  }, [loadChannels, search]));

  async function toggleFavorite(channel: Channel) {
    const favorite = !channel.isFavorite;
    await repository.setFavorite(channel.id, favorite);
    setChannels((current) => current
      .map((item) => item.id === channel.id ? { ...item, isFavorite: favorite } : item)
      .filter((item) => filter !== 'favorites' || item.isFavorite));
    if (filter === 'favorites' && !favorite) setTotalCount((current) => Math.max(0, current - 1));
  }

  return (
    <Screen navigation>
      <View style={[styles.container, compact && styles.containerCompact]}>
        <View style={[styles.heading, compact && styles.headingCompact]}>
          <Text style={[styles.title, compact && styles.titleCompact]}>Chaînes</Text>
          {!loading && <Text style={styles.resultCount}>{totalCount} résultats</Text>}
        </View>
        <TextInput
          onChangeText={setSearch}
          placeholder="Rechercher une chaîne"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          value={search}
        />
        <ScrollView
          contentContainerStyle={styles.filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroller}
        >
          <FilterButton active={filter === 'all'} label="Toutes" onPress={() => setFilter('all')} />
          <FilterButton active={filter === 'favorites'} label="Favoris" onPress={() => setFilter('favorites')} />
          <FilterButton active={filter === 'recent'} label="Récentes" onPress={() => setFilter('recent')} />
          {categories.map((category) => (
            <FilterButton
              active={filter === category.id}
              key={category.id}
              label={`${category.displayName} (${category.channelCount})`}
              onPress={() => setFilter(category.id)}
            />
          ))}
        </ScrollView>

        {loading ? <ActivityIndicator color={colors.accentStrong} /> : (
          <View style={styles.body}>
          <FlatList
            accessibilityLabel={`${channels.length} chaînes chargées sur ${totalCount}`}
            contentContainerStyle={styles.list}
            data={channels}
            getItemLayout={(_, index) => ({ index, length: ROW_STRIDE, offset: ROW_STRIDE * index })}
            initialNumToRender={14}
            keyExtractor={(item) => item.id}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accentStrong} style={styles.loadingMore} /> : null}
            maxToRenderPerBatch={18}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={0.6}
            onScrollToIndexFailed={({ index }) => listRef.current?.scrollToOffset({ animated: false, offset: index * ROW_STRIDE })}
            onStartReached={() => void loadPrevious()}
            onStartReachedThreshold={0.4}
            ref={listRef}
            renderItem={({ item, index }) => (
              <View style={styles.row}>
                <FocusableCard
                  autoFocus={lastFocusedId ? item.id === lastFocusedId : index === 0}
                  onFocus={() => { setFocusedChannel(item); if (id) preferences.setLastFocusedChannel(id, item.id); }}
                  onPress={() => router.push({ pathname: '/player/[channelId]', params: { channelId: item.id } })}
                  style={styles.card}
                >
                  <ChannelLogo channel={item} />
                  <View style={styles.channelText}>
                    <Text numberOfLines={1} style={styles.channelName}>{item.displayName}</Text>
                    <Text numberOfLines={1} style={styles.meta}>{[item.categoryId ? categoryNamesById.get(item.categoryId) : null, item.country, item.language].filter(Boolean).join(' · ') || 'En direct'}</Text>
                  </View>
                </FocusableCard>
                <FocusableCard
                  accessibilityLabel={item.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  onPress={() => void toggleFavorite(item)}
                  style={styles.favoriteButton}
                >
                  <Ionicons color={item.isFavorite ? colors.warning : colors.textMuted} name={item.isFavorite ? 'star' : 'star-outline'} size={27} />
                </FocusableCard>
              </View>
            )}
            style={styles.channelList}
            updateCellsBatchingPeriod={40}
            windowSize={9}
          />
          {showPreview && focusedChannel && <View style={styles.preview}>
            <ChannelLogo channel={focusedChannel} />
            <Text numberOfLines={2} style={styles.previewTitle}>{focusedChannel.displayName}</Text>
            <Text style={styles.liveBadge}>● EN DIRECT</Text>
            {programmes[0] ? <><Text style={styles.epgLabel}>MAINTENANT</Text><Text numberOfLines={2} style={styles.epgTitle}>{programmes[0].title}</Text></> : <Text style={styles.previewMeta}>Aucune donnée EPG disponible.</Text>}
            {programmes[1] && <><Text style={styles.epgLabel}>ENSUITE</Text><Text numberOfLines={2} style={styles.previewMeta}>{programmes[1].title}</Text></>}
            <Text style={styles.previewHint}>OK pour regarder · ★ pour ajouter aux favoris</Text>
          </View>}
          </View>
        )}
        {!loading && channels.length === 0 && <Text style={styles.empty}>Aucune chaîne trouvée.</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl },
  containerCompact: { padding: 12 },
  heading: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.md },
  headingCompact: { flexWrap: 'wrap' },
  title: { color: colors.text, fontSize: 36, fontWeight: '900' },
  titleCompact: { fontSize: 28 },
  resultCount: { color: colors.textMuted, fontSize: 16 },
  search: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, fontSize: 17, marginTop: spacing.md, minHeight: 54, paddingHorizontal: spacing.md },
  filterScroller: { flexGrow: 0, flexShrink: 0, height: 70 },
  filters: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  filterButton: { minHeight: 46, minWidth: 110, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterActive: { backgroundColor: colors.accent, borderColor: colors.accentStrong },
  filterLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  filterLabelActive: { color: colors.text },
  list: { gap: spacing.sm, paddingBottom: spacing.lg },
  loadingMore: { marginVertical: spacing.lg },
  channelList: { flex: 1, minHeight: 240 },
  body: { flex: 1, flexDirection: 'row', gap: spacing.lg },
  preview: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.lg, width: '34%' },
  previewTitle: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: spacing.md },
  liveBadge: { color: colors.danger, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  epgLabel: { color: colors.accentStrong, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginTop: spacing.md },
  epgTitle: { color: colors.text, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  previewMeta: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  previewHint: { color: colors.textMuted, fontSize: 12, marginTop: 'auto' },
  row: { flexDirection: 'row', gap: spacing.sm, height: ROW_STRIDE - spacing.sm },
  card: { alignItems: 'center', flex: 1, flexDirection: 'row', minHeight: 76, padding: spacing.sm },
  channelText: { flex: 1, marginLeft: spacing.md },
  channelName: { color: colors.text, fontSize: 18, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  logo: { height: 54, width: 72 },
  logoFallback: { alignItems: 'center', backgroundColor: colors.surfaceRaised, borderRadius: radii.sm, height: 54, justifyContent: 'center', width: 72 },
  logoLetter: { color: colors.accentStrong, fontSize: 22, fontWeight: '900' },
  favoriteButton: { alignItems: 'center', justifyContent: 'center', minHeight: 76, padding: spacing.sm },
  empty: { color: colors.textMuted, fontSize: 17, marginTop: spacing.xl },
  error: { color: colors.danger, marginTop: spacing.md },
});
