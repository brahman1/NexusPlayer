import { type Href, useFocusEffect, useRouter } from 'expo-router';
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
import { useI18n } from '../i18n';
import type { Channel, Playlist } from '../types/domain';
import { preferences } from '../storage/preferences';
import type { ContentThemeId } from '../services/contentTaxonomy';

const discovery = new DiscoveryRepository();
const playlistsRepository = new SQLitePlaylistRepository();
const progressRepository = new WatchProgressRepository();

export function HomeScreen() {
  const { tx } = useI18n();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 600;
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recent, setRecent] = useState<Channel[]>([]);
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [live, setLive] = useState<Channel[]>([]);
  const [forYou, setForYou] = useState<Channel[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const hasPersonalization = preferences.getPreferredCountries().length + preferences.getPreferredLanguages().length + preferences.getPreferredThemes().length > 0;
  useFocusEffect(useCallback(() => {
    let active = true;
    const countries = preferences.getPreferredCountries();
    const languages = preferences.getPreferredLanguages();
    const themes = preferences.getPreferredThemes() as ContentThemeId[];
    const personalized = countries.length + languages.length + themes.length ? discovery.personalizedChannels(countries, languages, themes) : Promise.resolve([]);
    Promise.all([playlistsRepository.list(), discovery.recentChannels(), discovery.favoriteChannels(12), discovery.liveNow(), personalized, progressRepository.continueWatching()])
      .then(([sources, watched, saved, channels, personalized, unfinished]) => { if (active) { setPlaylists(sources); setRecent(watched); setFavorites(saved); setLive(channels); setForYou(personalized); setContinueWatching(unfinished); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));
  const play = (item: Channel) => router.push({ pathname: '/player/[channelId]', params: { channelId: item.id } });
  const resume = (item: ContinueWatchingItem) => router.push({ pathname: item.mediaKind === 'movie' ? '/watch/movie/[id]' : '/watch/episode/[id]', params: { id: item.mediaId } });
  const hero = recent[0] ?? live[0];
  return <Screen navigation><ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
    <PageHeader eyebrow="NEXUSPLAYER" title={tx('Bonsoir', 'Welcome')} subtitle={playlists.length ? tx(`${playlists.length} source${playlists.length > 1 ? 's' : ''} prête${playlists.length > 1 ? 's' : ''} à regarder`, `${playlists.length} source${playlists.length > 1 ? 's' : ''} ready to watch`) : tx('Votre médiathèque personnelle, sans contenu imposé.', 'Your personal media library, with no imposed content.')} action={<View style={[styles.headerActions, compact && styles.headerActionsCompact]}><ActionButton icon="add" label={tx('Ajouter une source', 'Add a source')} onPress={() => router.push('/add-playlist')} style={compact && styles.headerButton} /><ActionButton icon="search" label={tx('Rechercher', 'Search')} onPress={() => router.push('/(tabs)/search')} style={compact && styles.headerButton} variant="secondary" /></View>} />
    {loading ? <LoadingSkeleton rows={5} /> : playlists.length === 0 ? <EmptyState icon="add-circle-outline" title={tx('Ajoutez votre première source', 'Add your first source')} detail={tx('Importez une playlist M3U ou connectez un abonnement Xtream Codes que vous êtes autorisé à utiliser.', 'Import an M3U playlist or connect an Xtream Codes subscription you are authorized to use.')} action={<ActionButton autoFocus icon="add" label={tx('Ajouter une source', 'Add a source')} onPress={() => router.push('/add-playlist')} />} /> : <>
      {!hasPersonalization && <Panel style={styles.welcomePanel}><View style={styles.welcomeCopy}><Text style={styles.welcomeTitle}>{tx('Créez votre univers en moins d’une minute', 'Build your world in under a minute')}</Text><Text style={styles.heroDescription}>{tx('Choisissez vos sports, genres, langues et régions pour retrouver immédiatement ce que vous aimez.', 'Choose your sports, genres, languages and regions to instantly find what you love.')}</Text></View><ActionButton icon="sparkles-outline" label={tx('Personnaliser', 'Personalize')} onPress={() => router.push('/(tabs)/content-preferences' as Href)} /></Panel>}
      <Panel style={[styles.hero, compact && styles.heroCompact]}><LinearGradient colors={gradients.hero} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} /><LinearGradient colors={gradients.heroGlow} end={{ x: 0, y: 1 }} pointerEvents="none" start={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} /><View style={styles.heroText}><Text style={styles.heroEyebrow}>{recent[0] ? tx('REPRENDRE', 'RESUME') : tx('EN DIRECT MAINTENANT', 'LIVE NOW')}</Text><Text numberOfLines={2} style={[styles.heroTitle, compact && styles.heroTitleCompact]}>{hero?.name ?? tx('Votre Live est prêt', 'Your Live TV is ready')}</Text><Text style={styles.heroDescription}>{tx('Retrouvez immédiatement votre dernière chaîne ou explorez le direct.', 'Return to your last channel or explore live TV.')}</Text><ActionButton autoFocus icon="play" label={tx('Regarder', 'Watch')} onPress={() => hero && play(hero)} /></View></Panel>
      {continueWatching.length > 0 && <ContentRail data={continueWatching} keyExtractor={(item) => `${item.mediaKind}:${item.mediaId}`} renderItem={({ item }) => <MediaPoster imageUrl={item.imageUrl} meta={`${item.subtitle ? `${item.subtitle} · ` : ''}${tx(`Reprendre à ${Math.floor(item.positionSeconds / 60)} min`, `Resume at ${Math.floor(item.positionSeconds / 60)} min`)}`} onPress={() => resume(item)} progress={item.positionSeconds / item.durationSeconds} title={item.title} />} title={tx('Continuer à regarder', 'Continue watching')} />}
      {forYou.length > 0 && <ContentRail data={forYou} keyExtractor={(item) => item.id} renderItem={({ item }) => <ChannelTile channel={item} onPress={() => play(item)} />} title={tx('Votre univers', 'Your world')} />}
      {recent.length > 0 && <ContentRail data={recent} keyExtractor={(item) => item.id} renderItem={({ item }) => <ChannelTile channel={item} onPress={() => play(item)} />} title={tx('Reprendre', 'Resume')} />}
      <ContentRail data={live} keyExtractor={(item) => item.id} renderItem={({ item }) => <ChannelTile channel={item} onPress={() => play(item)} />} title={tx('En direct maintenant', 'Live now')} />
      {favorites.length > 0 && <ContentRail data={favorites} keyExtractor={(item) => item.id} renderItem={({ item }) => <ChannelTile channel={item} onPress={() => play(item)} />} title={tx('Favoris', 'Favorites')} />}
    </>}
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({ container: { gap: spacing.xl, padding: spacing.xl, paddingBottom: 96 }, containerCompact: { gap: spacing.lg, padding: 20, paddingBottom: 96 }, headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, headerActionsCompact: { flexDirection: 'column' }, headerButton: { justifyContent: 'center', width: '100%' }, welcomePanel: { alignItems: 'center', backgroundColor: 'rgba(18,59,50,0.72)', borderColor: colors.emeraldDeep, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, justifyContent: 'space-between' }, welcomeCopy: { flex: 1, minWidth: 220 }, welcomeTitle: { color: colors.text, fontSize: 20, fontWeight: '900' }, hero: { backgroundColor: colors.surfaceRaised, borderColor: colors.emeraldDeep, minHeight: 250, overflow: 'hidden' }, heroCompact: { minHeight: 210, padding: spacing.md }, heroText: { justifyContent: 'center', maxWidth: 720 }, heroEyebrow: { color: colors.emeraldStrong, fontSize: 13, fontWeight: '900', letterSpacing: 2 }, heroTitle: { color: colors.text, fontSize: 42, fontWeight: '900', letterSpacing: -1.5, marginTop: spacing.sm }, heroTitleCompact: { fontSize: 30, lineHeight: 36 }, heroDescription: { color: colors.textMuted, fontSize: 16, lineHeight: 23, marginBottom: spacing.lg, marginTop: spacing.sm } });
