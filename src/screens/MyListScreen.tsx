import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ChannelTile, MediaPoster } from '../components/MediaCards';
import { ContentRail, EmptyState, LoadingSkeleton, PageHeader } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { DiscoveryRepository } from '../repositories/DiscoveryRepository';
import { spacing } from '../theme/tokens';
import { useI18n } from '../i18n';
import type { Channel, Movie, Series } from '../types/domain';
const repository = new DiscoveryRepository();
export function MyListScreen() {
  const { tx } = useI18n();
  const router = useRouter(); const [channels, setChannels] = useState<Channel[]>([]); const [movies, setMovies] = useState<Movie[]>([]); const [series, setSeries] = useState<Series[]>([]); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { Promise.all([repository.favoriteChannels(200), repository.favoriteMovies(), repository.favoriteSeries()]).then(([live, films, shows]) => { setChannels(live); setMovies(films); setSeries(shows); }).finally(() => setLoading(false)); }, []));
  const empty = channels.length + movies.length + series.length === 0;
  return <Screen navigation><ScrollView contentContainerStyle={styles.container}><PageHeader eyebrow={tx('VOTRE SÉLECTION', 'YOUR SELECTION')} title={tx('Favoris', 'Favorites')} subtitle={tx('Toutes vos chaînes, vos films et vos séries favoris.', 'All your favorite channels, movies and series.')} />{loading ? <LoadingSkeleton /> : empty ? <EmptyState icon="heart-outline" title={tx('Aucun favori', 'No favorites yet')} detail={tx('Ajoutez une chaîne, un film ou une série aux favoris pour les retrouver ici.', 'Add a channel, movie or series to find it here.')} /> : <>{channels.length > 0 && <ContentRail data={channels} keyExtractor={(x) => x.id} renderItem={({ item }) => <ChannelTile channel={item} onPress={() => router.push({ pathname: '/player/[channelId]', params: { channelId: item.id } })} />} title={tx(`Chaînes · ${channels.length}`, `Channels · ${channels.length}`)} />}{movies.length > 0 && <ContentRail data={movies} keyExtractor={(x) => x.id} renderItem={({ item }) => <MediaPoster imageUrl={item.posterUrl} onPress={() => router.push({ pathname: '/media/[kind]/[id]', params: { kind: 'movie', id: item.id } })} title={item.name} />} title={tx(`Films · ${movies.length}`, `Movies · ${movies.length}`)} />}{series.length > 0 && <ContentRail data={series} keyExtractor={(x) => x.id} renderItem={({ item }) => <MediaPoster imageUrl={item.posterUrl} onPress={() => router.push({ pathname: '/media/[kind]/[id]', params: { kind: 'series', id: item.id } })} title={item.name} />} title={tx(`Séries · ${series.length}`, `Series · ${series.length}`)} />}</>}</ScrollView></Screen>;
}
const styles = StyleSheet.create({ container: { gap: spacing.xl, padding: spacing.xl, paddingBottom: 96 } });
