import { Ionicons } from '@expo/vector-icons';
import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { FocusableCard } from '../components/FocusableCard';
import { Screen } from '../components/Screen';
import { SQLiteChannelRepository, type ChannelCategory, type ChannelFacets } from '../repositories/SQLiteChannelRepository';
import { EpgRepository } from '../repositories/EpgRepository';
import { buildChannelCategoryHierarchy } from '../services/channelCategoryHierarchy';
import { preferences } from '../storage/preferences';
import { colors, radii, spacing } from '../theme/tokens';
import type { Channel } from '../types/domain';
import { useI18n } from '../i18n';
import { applyCategoryLabelOverride, localizedCountryName, localizedLanguageName } from '../services/channelPresentation';
import { invalidateCatalogData } from '../services/catalogInvalidation';
import type { ContentCompetitionId, ContentQuality, ContentTopicId } from '../services/contentTaxonomy';

const repository = new SQLiteChannelRepository();
const epgRepository = new EpgRepository();
const PAGE_SIZE = 250;
const ROW_STRIDE = 92;
type Filter = 'all' | 'favorites' | 'recent' | string;
const THEME_PREFIX = 'theme:';
const RAW_PREFIX = 'raw:';

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
  const { language, tx } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const showPreview = width >= 1100;
  const compact = width < 600;
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<ChannelCategory[]>([]);
  const [facets, setFacets] = useState<ChannelFacets>({ countries: [], languages: [], qualities: [] });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedTopic, setSelectedTopic] = useState<ContentTopicId | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<ContentCompetitionId | null>(null);
  const [activeCountries, setActiveCountries] = useState<string[]>([]);
  const [activeLanguages, setActiveLanguages] = useState<string[]>([]);
  const [activeQualities, setActiveQualities] = useState<ContentQuality[]>([]);
  const [showRefine, setShowRefine] = useState(Platform.isTV);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loadedOffset, setLoadedOffset] = useState(0);
  const [restoreIndex, setRestoreIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedChannel, setFocusedChannel] = useState<Channel | null>(null);
  const [programmes, setProgrammes] = useState<Awaited<ReturnType<EpgRepository['nowNext']>>>([]);
  const [preferenceFilterActive, setPreferenceFilterActive] = useState(false);
  const [preferredCountries, setPreferredCountries] = useState(preferences.getPreferredCountries());
  const [preferredLanguages, setPreferredLanguages] = useState(preferences.getPreferredLanguages());
  const [preferredThemes, setPreferredThemes] = useState(preferences.getPreferredThemes());
  const [showRawCategories, setShowRawCategories] = useState(preferences.getShowRawCategories());
  const [categoryOverrides, setCategoryOverrides] = useState(preferences.getCategoryLabelOverrides());
  const [editingCategory, setEditingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const requestVersion = useRef(0);
  const loadingMoreRef = useRef(false);
  const listRef = useRef<FlatList<Channel>>(null);
  const lastFocusedId = id ? preferences.getLastFocusedChannel(id) : null;
  const categoryHierarchy = useMemo(() => buildChannelCategoryHierarchy(categories, language).sort((left, right) => Number(preferredThemes.includes(right.id)) - Number(preferredThemes.includes(left.id)) || right.count - left.count), [categories, language, preferredThemes]);
  const selectedTheme = filter.startsWith(THEME_PREFIX) ? filter.slice(THEME_PREFIX.length) : null;
  const selectedRawName = filter.startsWith(RAW_PREFIX) ? filter.slice(RAW_PREFIX.length) : null;
  const selectedThemeGroup = useMemo(() => categoryHierarchy.find((group) => group.id === selectedTheme), [categoryHierarchy, selectedTheme]);
  const selectedTopicGroup = useMemo(() => selectedThemeGroup?.topics.find((group) => group.id === selectedTopic), [selectedThemeGroup, selectedTopic]);
  const selectedCompetitionGroup = useMemo(() => selectedThemeGroup?.competitions.find((group) => group.id === selectedCompetition), [selectedCompetition, selectedThemeGroup]);
  const selectedCategoryIds = useMemo(() => {
    if (selectedRawName) return categories.find((category) => category.displayName === selectedRawName)?.categoryIds;
    if (selectedCompetitionGroup) return selectedCompetitionGroup.categoryIds;
    if (selectedTopicGroup) return selectedTopicGroup.categoryIds;
    if (selectedThemeGroup) return selectedThemeGroup.categoryIds;
    if (preferenceFilterActive && preferredThemes.length) return categoryHierarchy.filter((group) => preferredThemes.includes(group.id)).flatMap((group) => group.categoryIds);
    return undefined;
  }, [categories, categoryHierarchy, preferenceFilterActive, preferredThemes, selectedCompetitionGroup, selectedRawName, selectedThemeGroup, selectedTopicGroup]);
  const categoryNamesById = useMemo(() => new Map(categories.flatMap((category) => category.categoryIds.map((categoryId) => [categoryId, applyCategoryLabelOverride(category.displayName, categoryOverrides)] as const))), [categories, categoryOverrides]);
  const hasContentPreferences = preferredCountries.length + preferredLanguages.length + preferredThemes.length > 0;
  const displayTheme = useCallback((theme: string) => categoryOverrides[theme] ?? theme, [categoryOverrides]);
  const toggleFacet = useCallback(<T extends string,>(values: T[], value: T, setter: (next: T[]) => void) => setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]), []);
  useFocusEffect(useCallback(() => {
    const countries = preferences.getPreferredCountries();
    const languages = preferences.getPreferredLanguages();
    const themes = preferences.getPreferredThemes();
    setPreferredCountries(countries);
    setPreferredLanguages(languages);
    setPreferredThemes(themes);
    if (countries.length + languages.length + themes.length === 0) setPreferenceFilterActive(false);
    setShowRawCategories(preferences.getShowRawCategories());
    setCategoryOverrides(preferences.getCategoryLabelOverrides());
  }, []));

  const loadChannels = useCallback(async () => {
    if (!id) return;
    const version = ++requestVersion.current;
    const filters = {
      search,
      categoryIds: selectedCategoryIds,
      favoritesOnly: filter === 'favorites',
      recentOnly: filter === 'recent',
      countries: activeCountries.length ? activeCountries : preferenceFilterActive ? preferredCountries : undefined,
      languages: activeLanguages.length ? activeLanguages : preferenceFilterActive ? preferredLanguages : undefined,
      qualities: activeQualities,
      localeMatchAny: preferenceFilterActive && activeCountries.length === 0 && activeLanguages.length === 0,
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
      setError(caught instanceof Error ? caught.message : tx('Chargement impossible.', 'Unable to load.'));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [activeCountries, activeLanguages, activeQualities, filter, id, preferenceFilterActive, preferredCountries, preferredLanguages, search, selectedCategoryIds, tx]);

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
        countries: activeCountries.length ? activeCountries : preferenceFilterActive ? preferredCountries : undefined,
        languages: activeLanguages.length ? activeLanguages : preferenceFilterActive ? preferredLanguages : undefined,
        qualities: activeQualities,
        localeMatchAny: preferenceFilterActive && activeCountries.length === 0 && activeLanguages.length === 0,
        limit: PAGE_SIZE,
        offset: loadedOffset + channels.length,
      });
      if (version === requestVersion.current) {
        setChannels((current) => [...current, ...nextPage]);
      }
    } catch (caught) {
      if (version === requestVersion.current) {
        setError(caught instanceof Error ? caught.message : tx('Chargement de la suite impossible.', 'Unable to load more channels.'));
      }
    } finally {
      loadingMoreRef.current = false;
      if (version === requestVersion.current) setLoadingMore(false);
    }
  }, [activeCountries, activeLanguages, activeQualities, channels.length, filter, id, loadedOffset, loading, preferenceFilterActive, preferredCountries, preferredLanguages, search, selectedCategoryIds, totalCount, tx]);

  const loadPrevious = useCallback(async () => {
    if (!id || loading || loadingMoreRef.current || loadedOffset <= 0) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const version = requestVersion.current;
    const offset = Math.max(0, loadedOffset - PAGE_SIZE);
    try {
      const previousPage = await repository.listByPlaylist(id, {
        search,
        categoryIds: selectedCategoryIds,
        favoritesOnly: filter === 'favorites',
        recentOnly: filter === 'recent',
        countries: activeCountries.length ? activeCountries : preferenceFilterActive ? preferredCountries : undefined,
        languages: activeLanguages.length ? activeLanguages : preferenceFilterActive ? preferredLanguages : undefined,
        qualities: activeQualities,
        localeMatchAny: preferenceFilterActive && activeCountries.length === 0 && activeLanguages.length === 0,
        limit: loadedOffset - offset,
        offset,
      });
      if (version === requestVersion.current) {
        setChannels((current) => [...previousPage, ...current]);
        setLoadedOffset(offset);
      }
    } catch (caught) {
      if (version === requestVersion.current) setError(caught instanceof Error ? caught.message : tx('Chargement des chaînes précédentes impossible.', 'Unable to load previous channels.'));
    } finally {
      loadingMoreRef.current = false;
      if (version === requestVersion.current) setLoadingMore(false);
    }
  }, [activeCountries, activeLanguages, activeQualities, filter, id, loadedOffset, loading, preferenceFilterActive, preferredCountries, preferredLanguages, search, selectedCategoryIds, tx]);

  useEffect(() => {
    if (!id) return;
    Promise.all([repository.listCategories(id, showRawCategories), repository.facets(id)])
      .then(([nextCategories, nextFacets]) => { setCategories(nextCategories); setFacets(nextFacets); })
      .catch(() => { setCategories([]); setFacets({ countries: [], languages: [], qualities: [] }); });
  }, [id, language, showRawCategories]);

  const saveCategoryName = () => {
    if (!selectedThemeGroup) return;
    const value = categoryName.trim();
    preferences.setCategoryLabelOverride(selectedThemeGroup.theme, value || null);
    setCategoryOverrides(preferences.getCategoryLabelOverrides());
    invalidateCatalogData();
    setEditingCategory(false);
  };

  const toggleRawCategories = () => {
    const next = !showRawCategories;
    preferences.setShowRawCategories(next);
    invalidateCatalogData();
    setShowRawCategories(next);
    setFilter('all'); setSelectedTopic(null); setSelectedCompetition(null);
  };

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      void loadChannels();
    }, search ? 200 : 0);
    return () => clearTimeout(timer);
  }, [loadChannels, search]);

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
          <Text style={[styles.title, compact && styles.titleCompact]}>{tx('Chaînes', 'Channels')}</Text>
          {!loading && <Text style={styles.resultCount}>{tx(`${totalCount} résultats`, `${totalCount} results`)}</Text>}
        </View>
        <TextInput
          onChangeText={setSearch}
          accessibilityLabel={tx('Rechercher une chaîne', 'Search for a channel')}
          placeholder={tx('Chaîne, sport, langue, pays ou qualité…', 'Channel, sport, language, country or quality…')}
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
          <FilterButton active={filter === 'all' && !preferenceFilterActive && activeCountries.length + activeLanguages.length + activeQualities.length === 0} label={tx('Tout le Live', 'All Live TV')} onPress={() => { setFilter('all'); setSelectedTopic(null); setSelectedCompetition(null); setPreferenceFilterActive(false); setActiveCountries([]); setActiveLanguages([]); setActiveQualities([]); }} />
          <FilterButton active={filter === 'favorites'} label={tx('Favoris', 'Favorites')} onPress={() => { setFilter('favorites'); setSelectedTopic(null); }} />
          <FilterButton active={filter === 'recent'} label={tx('Regardées récemment', 'Recently watched')} onPress={() => { setFilter('recent'); setSelectedTopic(null); }} />
          {hasContentPreferences && <FilterButton active={preferenceFilterActive} label={tx('Pour moi', 'For me')} onPress={() => setPreferenceFilterActive((value) => !value)} />}
          <FilterButton active={showRefine} label={tx('Affiner', 'Refine')} onPress={() => setShowRefine((value) => !value)} />
          <FilterButton active={false} label={tx('Personnaliser', 'Customize')} onPress={() => router.push('/(tabs)/content-preferences' as Href)} />
        </ScrollView>
        <View style={styles.universeSection}>
          <View style={styles.countryHeading}><Text style={styles.countryTitle}>{showRawCategories ? tx('CATÉGORIES DU FOURNISSEUR', 'PROVIDER CATEGORIES') : tx('UNIVERS', 'INTERESTS')}</Text>{selectedThemeGroup && <FilterButton active={editingCategory} label={tx('Renommer', 'Rename')} onPress={() => { setCategoryName(displayTheme(selectedThemeGroup.theme)); setEditingCategory((value) => !value); }} />}</View>
          <ScrollView contentContainerStyle={styles.countryFilters} horizontal showsHorizontalScrollIndicator={false}>
            {showRawCategories ? categories.map((category) => <FilterButton active={selectedRawName === category.displayName} key={category.id} label={`${category.displayName} (${category.channelCount})`} onPress={() => { setFilter(`${RAW_PREFIX}${category.displayName}`); setSelectedTopic(null); setSelectedCompetition(null); }} />) : categoryHierarchy.map((group) => <FilterButton active={selectedTheme === group.id} key={group.id} label={`${displayTheme(group.theme)} (${group.count})`} onPress={() => { setFilter(`${THEME_PREFIX}${group.id}`); setSelectedTopic(null); setSelectedCompetition(null); }} />)}
          </ScrollView>
          {editingCategory && selectedThemeGroup && <View style={styles.renameRow}><TextInput accessibilityLabel={tx('Nom personnalisé de la catégorie', 'Custom category name')} autoFocus maxLength={40} onChangeText={setCategoryName} onSubmitEditing={saveCategoryName} placeholder={selectedThemeGroup.theme} placeholderTextColor={colors.textMuted} style={styles.renameInput} value={categoryName} /><FilterButton active label={tx('Enregistrer', 'Save')} onPress={saveCategoryName} /><FilterButton active={false} label={tx('Rétablir', 'Restore')} onPress={() => { setCategoryName(''); preferences.setCategoryLabelOverride(selectedThemeGroup.theme, null); setCategoryOverrides(preferences.getCategoryLabelOverrides()); invalidateCatalogData(); setEditingCategory(false); }} /></View>}
          {!!selectedThemeGroup?.topics.length && <><Text style={styles.facetTitle}>{tx('DISCIPLINES ET SOUS-THÈMES', 'TOPICS & SUBCATEGORIES')}</Text><ScrollView contentContainerStyle={styles.countryFilters} horizontal showsHorizontalScrollIndicator={false}><FilterButton active={selectedTopic === null} label={tx('Tout', 'All')} onPress={() => setSelectedTopic(null)} />{selectedThemeGroup.topics.map((topic) => <FilterButton active={selectedTopic === topic.id} key={topic.id} label={`${topic.topic} (${topic.count})`} onPress={() => { setSelectedTopic(topic.id); setSelectedCompetition(null); }} />)}</ScrollView></>}
          {!!selectedThemeGroup?.competitions.length && <><Text style={styles.facetTitle}>{tx('COMPÉTITIONS', 'COMPETITIONS')}</Text><ScrollView contentContainerStyle={styles.countryFilters} horizontal showsHorizontalScrollIndicator={false}><FilterButton active={selectedCompetition === null} label={tx('Toutes', 'All')} onPress={() => setSelectedCompetition(null)} />{selectedThemeGroup.competitions.map((competition) => <FilterButton active={selectedCompetition === competition.id} key={competition.id} label={`${competition.competition} (${competition.count})`} onPress={() => { setSelectedCompetition(competition.id); setSelectedTopic(null); }} />)}</ScrollView></>}
        </View>
        {showRefine && <View style={styles.refinePanel}>
          <View style={styles.refineHeading}><View><Text style={styles.refineTitle}>{tx('Affiner sans perdre le contexte', 'Refine without losing context')}</Text><Text style={styles.refineDetail}>{tx('Langue, pays et qualité se combinent avec l’univers choisi.', 'Language, country and quality combine with your selected interest.')}</Text></View><View style={styles.refineActions}><FilterButton active={showRawCategories} label={showRawCategories ? tx('Vue fournisseur', 'Provider view') : tx('Vue Nexus', 'Nexus view')} onPress={toggleRawCategories} /><FilterButton active={false} label={tx('Effacer', 'Clear')} onPress={() => { setActiveCountries([]); setActiveLanguages([]); setActiveQualities([]); }} /></View></View>
          {!!facets.languages.length && <><Text style={styles.facetTitle}>{tx('LANGUE DU COMMENTAIRE', 'COMMENTARY LANGUAGE')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countryFilters}>{facets.languages.map((facet) => <FilterButton active={activeLanguages.includes(facet.code)} key={facet.code} label={`${localizedLanguageName(facet.code, language)} · ${facet.count}`} onPress={() => toggleFacet(activeLanguages, facet.code, setActiveLanguages)} />)}</ScrollView></>}
          {!!facets.countries.length && <><Text style={styles.facetTitle}>{tx('PAYS OU RÉGION', 'COUNTRY OR REGION')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countryFilters}>{facets.countries.map((facet) => <FilterButton active={activeCountries.includes(facet.code)} key={facet.code} label={`${localizedCountryName(facet.code, language)} · ${facet.count}`} onPress={() => toggleFacet(activeCountries, facet.code, setActiveCountries)} />)}</ScrollView></>}
          {!!facets.qualities.length && <><Text style={styles.facetTitle}>{tx('QUALITÉ', 'QUALITY')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countryFilters}>{facets.qualities.map((facet) => <FilterButton active={activeQualities.includes(facet.code as ContentQuality)} key={facet.code} label={`${facet.code.toUpperCase()} · ${facet.count}`} onPress={() => toggleFacet(activeQualities, facet.code as ContentQuality, setActiveQualities)} />)}</ScrollView></>}
        </View>}

        {loading ? <ActivityIndicator color={colors.accentStrong} /> : (
          <View style={styles.body}>
          <FlatList
            accessibilityLabel={tx(`${channels.length} chaînes chargées sur ${totalCount}`, `${channels.length} of ${totalCount} channels loaded`)}
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
                    <Text numberOfLines={1} style={styles.meta}>{[item.categoryId ? categoryNamesById.get(item.categoryId) : null, item.language ? localizedLanguageName(item.language, language) : null, item.country ? localizedCountryName(item.country, language) : null, item.quality?.toUpperCase()].filter(Boolean).join(' · ') || tx('En direct', 'Live')}</Text>
                  </View>
                </FocusableCard>
                <FocusableCard
                  accessibilityLabel={item.isFavorite ? tx('Retirer des favoris', 'Remove from favorites') : tx('Ajouter aux favoris', 'Add to favorites')}
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
            <Text style={styles.liveBadge}>{tx('● EN DIRECT', '● LIVE')}</Text>
            {programmes[0] ? <><Text style={styles.epgLabel}>{tx('MAINTENANT', 'NOW')}</Text><Text numberOfLines={2} style={styles.epgTitle}>{programmes[0].title}</Text></> : <Text style={styles.previewMeta}>{tx('Aucune donnée EPG disponible.', 'No EPG data available.')}</Text>}
            {programmes[1] && <><Text style={styles.epgLabel}>{tx('ENSUITE', 'NEXT')}</Text><Text numberOfLines={2} style={styles.previewMeta}>{programmes[1].title}</Text></>}
            <Text style={styles.previewHint}>{tx('OK pour regarder · ★ pour ajouter aux favoris', 'OK to watch · ★ to add to favorites')}</Text>
          </View>}
          </View>
        )}
        {!loading && channels.length === 0 && <Text style={styles.empty}>{tx('Aucune chaîne trouvée.', 'No channels found.')}</Text>}
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
  countrySection: { gap: spacing.xs, marginBottom: spacing.sm },
  universeSection: { gap: spacing.xs, marginBottom: spacing.sm },
  countryHeading: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  countryTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  countryFilters: { alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm },
  renameRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  renameInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, flex: 1, fontSize: 15, minHeight: 46, minWidth: 190, paddingHorizontal: spacing.md },
  facetTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginTop: spacing.xs },
  refinePanel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.xs, marginBottom: spacing.sm, padding: spacing.md },
  refineHeading: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  refineTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  refineDetail: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  refineActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterButton: { minHeight: 46, minWidth: 110, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterActive: { backgroundColor: colors.accentSurface, borderColor: colors.emerald },
  filterLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  filterLabelActive: { color: colors.text },
  list: { gap: spacing.sm, paddingBottom: spacing.lg },
  loadingMore: { marginVertical: spacing.lg },
  channelList: { flex: 1, minHeight: 240 },
  body: { flex: 1, flexDirection: 'row', gap: spacing.lg },
  preview: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.lg, width: '34%' },
  previewTitle: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: spacing.md },
  liveBadge: { color: colors.danger, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  epgLabel: { color: colors.emeraldStrong, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginTop: spacing.md },
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
