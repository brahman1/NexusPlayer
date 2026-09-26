import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ChannelTile, MediaPoster } from '../components/MediaCards';
import { ContentRail, EmptyState, LoadingSkeleton, PageHeader } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { DiscoveryRepository } from '../repositories/DiscoveryRepository';
import { spacing } from '../theme/tokens';
import type { Channel, Movie, Series } from '../types/domain';
const repository = new DiscoveryRepository();
export function MyListScreen() {
  const router = useRouter(); const [channels, setChannels] = useState<Channel[]>([]); const [movies, setMovies] = useState<Movie[]>([]); const [series, setSeries] = useState<Series[]>([]); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { Promise.all([repository.favoriteChannels(200), repository.favoriteMovies(), repository.favoriteSeries()]).then(([live, films, shows]) => { setChannels(live); setMovies(films); setSeries(shows); }).finally(() => setLoading(false)); }, []));
  const empty = channels.length + movies.length + series.length === 0;
  return <Screen navigation><ScrollView contentContainerStyle={styles.container}><PageHeader eyebrow="PERSONNEL" title="Ma liste" subtitle="Vos chaînes et contenus favoris." />{loading ? <LoadingSkeleton /> : empty ? <EmptyState icon="bookmark-outline" title="Votre liste est vide" detail="Ajoutez une chaîne, un film ou une série aux favoris." /> : <>{channels.length > 0 && <ContentRail data={channels} keyExtractor={(x) => x.id} renderItem={({ item }) => <ChannelTile channel={item} onPress={() => router.push({ pathname: '/player/[channelId]', params: { channelId: item.id } })} />} title="Chaînes" />}{movies.length > 0 && <ContentRail data={movies} keyExtractor={(x) => x.id} renderItem={({ item }) => <MediaPoster imageUrl={item.posterUrl} onPress={() => router.push({ pathname: '/media/[kind]/[id]', params: { kind: 'movie', id: item.id } })} title={item.name} />} title="Films" />}{series.length > 0 && <ContentRail data={series} keyExtractor={(x) => x.id} renderItem={({ item }) => <MediaPoster imageUrl={item.posterUrl} onPress={() => router.push({ pathname: '/media/[kind]/[id]', params: { kind: 'series', id: item.id } })} title={item.name} />} title="Séries" />}</>}</ScrollView></Screen>;
}
const styles = StyleSheet.create({ container: { gap: spacing.xl, padding: spacing.xl, paddingBottom: 96 } });
