import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { FocusableCard } from '../components/FocusableCard';
import { ActionButton, EmptyState, PageHeader, Panel } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { DiscoveryRepository } from '../repositories/DiscoveryRepository';
import { WatchProgressRepository } from '../repositories/WatchProgressRepository';
import { syncXtreamSeriesEpisodes } from '../services/xtreamImportService';
import { colors, spacing } from '../theme/tokens';
import type { Movie, Series } from '../types/domain';

const discovery = new DiscoveryRepository();
const progressRepository = new WatchProgressRepository();
type EpisodeRow = Awaited<ReturnType<DiscoveryRepository['episodes']>>[number];

export function MediaDetailScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: 'movie' | 'series'; id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 600;
  const [item, setItem] = useState<Movie | Series | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([]);
  const [resumeEpisodeId, setResumeEpisodeId] = useState<string | null>(null);
  const [hasMovieProgress, setHasMovieProgress] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const media = kind === 'movie' ? await discovery.movieById(id) : await discovery.seriesById(id);
      setItem(media);
      if (kind === 'movie') {
        setHasMovieProgress(Boolean(await progressRepository.get(id, 'movie')));
        return;
      }
      let rows = await discovery.episodes(id);
      if (rows.length === 0) {
        await syncXtreamSeriesEpisodes(id);
        rows = await discovery.episodes(id);
      }
      setEpisodes(rows);
      setResumeEpisodeId((await progressRepository.resumeEpisodeForSeries(id))?.id ?? null);
    };
    load().catch(() => undefined).finally(() => setLoading(false));
  }, [id, kind]);

  if (loading) return <Screen><ActivityIndicator color={colors.accentStrong} size="large" /></Screen>;
  if (!item) return <Screen><EmptyState detail="Ce contenu n’est plus disponible dans la source." title="Contenu introuvable" /></Screen>;

  const favorite = item.isFavorite;
  const setFavorite = async () => {
    const value = !item.isFavorite;
    await discovery.setMediaFavorite(kind, item.id, value);
    setItem({ ...item, isFavorite: value });
  };
  const targetEpisode = resumeEpisodeId ?? episodes[0]?.id;
  const play = () => {
    if (kind === 'movie') router.push({ pathname: '/watch/movie/[id]', params: { id: item.id } });
    else if (targetEpisode) router.push({ pathname: '/watch/episode/[id]', params: { id: targetEpisode } });
  };
  const playLabel = kind === 'movie' ? (hasMovieProgress ? 'Reprendre le film' : 'Lire') : (resumeEpisodeId ? 'Reprendre la série' : 'Lire le premier épisode');

  return <Screen><View style={[styles.container, compact && styles.containerCompact]}>
    <PageHeader eyebrow={kind === 'movie' ? 'FILM' : 'SÉRIE'} subtitle={item.plot ?? 'Aucune description disponible.'} title={item.name} />
    <Panel><View style={[styles.actions, compact && styles.actionsCompact]}><ActionButton autoFocus disabled={kind === 'series' && !targetEpisode} icon="play" label={playLabel} onPress={play} style={compact && styles.actionCompact} /><ActionButton icon={favorite ? 'bookmark' : 'bookmark-outline'} label={favorite ? 'Retirer de Ma liste' : 'Ajouter à Ma liste'} onPress={() => void setFavorite()} style={compact && styles.actionCompact} /></View></Panel>
    {kind === 'series' && (episodes.length ? <FlatList data={episodes} keyExtractor={(episode) => episode.id} renderItem={({ item: episode }) => <FocusableCard onPress={() => router.push({ pathname: '/watch/episode/[id]', params: { id: episode.id } })} style={styles.episode}><Text style={styles.episodeNumber}>S{episode.season_number} · E{episode.episode_number}</Text><Text style={styles.episodeTitle}>{episode.name}</Text>{episode.id === resumeEpisodeId && <Text style={styles.resume}>À reprendre</Text>}</FocusableCard>} /> : <EmptyState detail="La source n’a pas encore fourni le détail des saisons et épisodes." title="Épisodes indisponibles" />)}
  </View></Screen>;
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg, padding: spacing.xl },
  containerCompact: { gap: spacing.md, padding: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actionsCompact: { flexDirection: 'column' },
  actionCompact: { justifyContent: 'center', width: '100%' },
  episode: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.sm },
  episodeNumber: { color: colors.accentStrong, flexShrink: 0, fontWeight: '900', width: 90 },
  episodeTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '700' },
  resume: { color: colors.accentStrong, fontSize: 13, fontWeight: '800' },
});
