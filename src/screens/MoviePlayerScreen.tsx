import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { AdaptiveVideoPlayer } from '../components/AdaptiveVideoPlayer';
import { DiscoveryRepository } from '../repositories/DiscoveryRepository';
import { WatchProgressRepository } from '../repositories/WatchProgressRepository';
import { resolveXtreamMedia } from '../services/xtreamImportService';
import { PlaybackLaunchTrace } from '../services/playbackPerformance';
import { colors, spacing } from '../theme/tokens';
import { useI18n } from '../i18n';

const discovery = new DiscoveryRepository();
const progressRepository = new WatchProgressRepository();

export function MoviePlayerScreen() {
  const { tx } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [media, setMedia] = useState<{ id: string; name: string; resumeSeconds: number; uri: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const launchTrace = useRef<PlaybackLaunchTrace | null>(null);
  useEffect(() => {
    if (!id) return;
    const trace = new PlaybackLaunchTrace('movie');
    launchTrace.current = trace;
    Promise.all([discovery.movieById(id), progressRepository.get(id, 'movie')])
      .then(async ([movie, progress]) => {
        if (!movie) throw new Error(tx('Film introuvable.', 'Movie not found.'));
        trace.mark('media-ready');
        trace.setResumeRequested((progress?.positionSeconds ?? 0) >= 10);
        const uri = await resolveXtreamMedia(movie.playlistId, movie.streamUrl);
        trace.mark('url-ready');
        setMedia({ id: movie.id, name: movie.name, resumeSeconds: progress?.positionSeconds ?? 0, uri });
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : tx('Lecture impossible.', 'Playback failed.')));
  }, [id, tx]);
  const onReady = useCallback(() => launchTrace.current?.mark('engine-ready'), []);
  const onProgress = useCallback(() => {
    const trace = launchTrace.current;
    if (!trace) return;
    trace.mark('first-progress');
    trace.report();
    launchTrace.current = null;
  }, []);
  return <Screen fullscreen={fullscreen}>
    <Stack.Screen options={{ headerShown: !fullscreen, title: media?.name ?? tx('Film', 'Movie') }} />
    {media ? <AdaptiveVideoPlayer key={media.id} mediaId={media.id} mediaKind="movie" name={media.name} onFullscreenChange={setFullscreen} onProgress={onProgress} onReady={onReady} resumeSeconds={media.resumeSeconds} uri={media.uri} /> : error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.accentStrong} size="large" />}
  </Screen>;
}

const styles = StyleSheet.create({ error: { color: colors.danger, fontSize: 17, padding: spacing.xl, textAlign: 'center' } });
