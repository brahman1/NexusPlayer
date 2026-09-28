import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { AdaptiveVideoPlayer } from '../components/AdaptiveVideoPlayer';
import { DiscoveryRepository } from '../repositories/DiscoveryRepository';
import { WatchProgressRepository } from '../repositories/WatchProgressRepository';
import { resolveXtreamMedia } from '../services/xtreamImportService';
import { colors, spacing } from '../theme/tokens';

const discovery = new DiscoveryRepository();
const progressRepository = new WatchProgressRepository();

export function MoviePlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [media, setMedia] = useState<{ id: string; name: string; resumeSeconds: number; uri: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    if (!id) return;
    Promise.all([discovery.movieById(id), progressRepository.get(id, 'movie')])
      .then(async ([movie, progress]) => {
        if (!movie) throw new Error('Film introuvable.');
        setMedia({ id: movie.id, name: movie.name, resumeSeconds: progress?.positionSeconds ?? 0, uri: await resolveXtreamMedia(movie.playlistId, movie.streamUrl) });
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Lecture impossible.'));
  }, [id]);
  return <Screen fullscreen={fullscreen}>
    <Stack.Screen options={{ headerShown: !fullscreen, title: media?.name ?? 'Film' }} />
    {media ? <AdaptiveVideoPlayer key={media.id} mediaId={media.id} mediaKind="movie" name={media.name} onFullscreenChange={setFullscreen} resumeSeconds={media.resumeSeconds} uri={media.uri} /> : error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.accentStrong} size="large" />}
  </Screen>;
}

const styles = StyleSheet.create({ error: { color: colors.danger, fontSize: 17, padding: spacing.xl, textAlign: 'center' } });
