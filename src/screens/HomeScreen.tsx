import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ChannelTile, MediaPoster } from '../components/MediaCards';
import { ActionButton, ContentRail, EmptyState, LoadingSkeleton, PageHeader, Panel } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { DiscoveryRepository } from '../repositories/DiscoveryRepository';
import { SQLitePlaylistRepository } from '../repositories/SQLitePlaylistRepository';
import { ContinueWatchingItem, WatchProgressRepository } from '../repositories/WatchProgressRepository';
import { colors, gradients, spacing } from '../theme/tokens';
import type { Channel, Playlist } from '../types/domain';

const discovery = new DiscoveryRepository();
const playlistsRepository = new SQLitePlaylistRepository();
const progressRepository = new WatchProgressRepository();

export function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 600;
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recent, setRecent] = useState<Channel[]>([]);
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [live, setLive] = useState<Channel[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
  const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([playlistsRepository.list(), discovery.recentChannels(), discovery.favoriteChannels(12), discovery.liveNow(), progressRepository.continueWatching()])
      .then(([sources, watched, saved, channels, unfinished]) => { if (active) { setPlaylists(sources); setRecent(watched); setFavorites(saved); setLive(channels); setContinueWatching(unfinished); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));
  const play = (item: Channel) => router.push({ pathname: '/player/[channelId]', params: { channelId: item.id } });
  const resume = (item: ContinueWatchingItem) => router.push({ pathname: item.mediaKind === 'movie' ? '/watch/movie/[id]' : '/watch/episode/[id]', params: { id: item.mediaId } });
  const hero = recent[0] ?? live[0];
  return <Screen navigation><ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
    <PageHeader eyebrow="NEXUSPLAYER" title="Bonsoir" subtitle={playlists.length ? `${playlists.length} source${playlists.length > 1 ? 's' : ''} prête${playlists.length > 1 ? 's' : ''} à regarder` : 'Votre médiathèque personnelle, sans contenu imposé.'} action={<View style={[styles.headerActions, compact && styles.headerActionsCompact]}><ActionButton icon="add" label="Ajouter une source" onPress={() => router.push('/add-playlist')} style={compact && styles.headerButton} /><ActionButton icon="search" label="Rechercher" onPress={() => router.push('/(tabs)/search')} style={compact && styles.headerButton} variant="secondary" /></View>} />
    {loading ? <LoadingSkeleton rows={5} /> : playlists.length === 0 ? <EmptyState icon="add-circle-outline" title="Ajoutez votre première source" detail="Importez une playlist M3U ou connectez un abonnement Xtream Codes que vous êtes autorisé à utiliser." action={<ActionButton autoFocus icon="add" label="Ajouter une source" onPress={() => router.push('/add-playlist')} />} /> : <>
      <Panel style={[styles.hero, compact && styles.heroCompact]}><LinearGradient colors={gradients.hero} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} /><View style={styles.heroText}><Text style={styles.heroEyebrow}>{recent[0] ? 'REPRENDRE' : 'EN DIRECT MAINTENANT'}</Text><Text numberOfLines={2} style={[styles.heroTitle, compact && styles.heroTitleCompact]}>{hero?.name ?? 'Votre Live est prêt'}</Text><Text style={styles.heroDescription}>Retrouvez immédiatement votre dernière chaîne ou explorez le direct.</Text><ActionButton autoFocus icon="play" label="Regarder" onPress={() => hero && play(hero)} /></View></Panel>
      {continueWatching.length > 0 && <ContentRail data={continueWatching} keyExtractor={(item) => `${item.mediaKind}:${item.mediaId}`} renderItem={({ item }) => <MediaPoster imageUrl={item.imageUrl} meta={`${item.subtitle ? `${item.subtitle} · ` : ''}Reprendre à ${Math.floor(item.positionSeconds / 60)} min`} onPress={() => resume(item)} progress={item.positionSeconds / item.durationSeconds} title={item.title} />} title="Continuer à regarder" />}
      {recent.length > 0 && <ContentRail data={recent} keyExtractor={(item) => item.id} renderItem={({ item }) => <ChannelTile channel={item} onPress={() => play(item)} />} title="Reprendre" />}
      <ContentRail data={live} keyExtractor={(item) => item.id} renderItem={({ item }) => <ChannelTile channel={item} onPress={() => play(item)} />} title="En direct maintenant" />
      {favorites.length > 0 && <ContentRail data={favorites} keyExtractor={(item) => item.id} renderItem={({ item }) => <ChannelTile channel={item} onPress={() => play(item)} />} title="Favoris" />}
    </>}
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({ container: { gap: spacing.xl, padding: spacing.xl, paddingBottom: 96 }, containerCompact: { gap: spacing.lg, padding: 20, paddingBottom: 96 }, headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, headerActionsCompact: { flexDirection: 'column' }, headerButton: { justifyContent: 'center', width: '100%' }, hero: { backgroundColor: colors.surfaceRaised, minHeight: 250, overflow: 'hidden' }, heroCompact: { minHeight: 210, padding: spacing.md }, heroText: { justifyContent: 'center', maxWidth: 720 }, heroEyebrow: { color: colors.accentStrong, fontSize: 13, fontWeight: '900', letterSpacing: 2 }, heroTitle: { color: colors.text, fontSize: 42, fontWeight: '900', letterSpacing: -1.5, marginTop: spacing.sm }, heroTitleCompact: { fontSize: 30, lineHeight: 36 }, heroDescription: { color: colors.textMuted, fontSize: 16, lineHeight: 23, marginBottom: spacing.lg, marginTop: spacing.sm } });
