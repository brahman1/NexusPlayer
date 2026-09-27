import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ActionButton, Panel } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { TrackedVideoPlayer } from '../components/TrackedVideoPlayer';
import { DiscoveryRepository } from '../repositories/DiscoveryRepository';
import { WatchProgressRepository } from '../repositories/WatchProgressRepository';
import { resolveXtreamMedia } from '../services/xtreamImportService';
import { colors, spacing } from '../theme/tokens';

const discovery = new DiscoveryRepository();
const progressRepository = new WatchProgressRepository();

type EpisodeMedia = { headerTitle: string; id: string; name: string; next: { id: string; name: string } | null; resumeSeconds: number; uri: string };

export function EpisodePlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 600;
  const [media, setMedia] = useState<EpisodeMedia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([discovery.episodeById(id), discovery.nextEpisode(id), progressRepository.get(id, 'episode')])
      .then(async ([episode, next, progress]) => {
        if (!episode) throw new Error('Épisode introuvable.');
        setError(null);
        setCountdown(null);
        setFinished(false);
        setMedia({ headerTitle: `${episode.series_name} · S${episode.season_number} E${episode.episode_number}`, id: episode.id, name: episode.name, next, resumeSeconds: progress?.positionSeconds ?? 0, uri: await resolveXtreamMedia(episode.playlist_id, episode.stream_url) });
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Lecture impossible.'));
  }, [id]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0 && media?.next) {
      router.replace({ pathname: '/watch/episode/[id]', params: { id: media.next.id } });
      return;
    }
    const timer = setTimeout(() => setCountdown((value) => value === null ? null : value - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, media?.next, router]);

  const onEnded = () => {
    setFinished(true);
    if (media?.next) setCountdown(8);
  };
  const playNext = () => media?.next && router.replace({ pathname: '/watch/episode/[id]', params: { id: media.next.id } });

  return <Screen fullscreen={fullscreen}><View style={styles.screen}>
    <Stack.Screen options={{ headerShown: !fullscreen, title: media?.headerTitle ?? 'Épisode' }} />
    {media?.id === id ? <TrackedVideoPlayer key={media.id} mediaId={media.id} mediaKind="episode" name={media.name} onEnded={onEnded} onFullscreenChange={setFullscreen} resumeSeconds={media.resumeSeconds} uri={media.uri} /> : error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.accentStrong} size="large" />}
    {finished && media?.id === id && <Panel style={[styles.nextPanel, compact && styles.nextPanelCompact]}>{media.next ? <><Text style={styles.nextTitle}>Épisode suivant dans {countdown ?? 0} s</Text><Text numberOfLines={2} style={styles.nextName}>{media.next.name}</Text><View style={styles.actions}><ActionButton autoFocus icon="play" label="Lire maintenant" onPress={playNext} /><ActionButton icon="close" label="Annuler" onPress={() => { setCountdown(null); setFinished(false); }} variant="secondary" /></View></> : <Text style={styles.nextTitle}>Série terminée</Text>}</Panel>}
  </View></Screen>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  nextPanel: { alignSelf: 'center', bottom: spacing.xl, maxWidth: 680, position: 'absolute', width: '80%' },
  nextPanelCompact: { bottom: spacing.sm, padding: spacing.md, width: '94%' },
  nextTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  nextName: { color: colors.textMuted, fontSize: 16, marginTop: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  error: { color: colors.danger, fontSize: 17, padding: spacing.xl, textAlign: 'center' },
});
