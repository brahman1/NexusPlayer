import { useEvent, useEventListener } from 'expo';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WatchProgressRepository } from '../repositories/WatchProgressRepository';
import { describePlaybackError } from '../services/playbackError';
import { colors, spacing } from '../theme/tokens';

const progressRepository = new WatchProgressRepository();

type Props = {
  mediaId: string;
  mediaKind: 'movie' | 'episode';
  name: string;
  onEnded?: () => void | Promise<void>;
  resumeSeconds: number;
  uri: string;
};

export function TrackedVideoPlayer({ mediaId, mediaKind, name, onEnded, resumeSeconds, uri }: Props) {
  const completed = useRef(false);
  const latestPosition = useRef(resumeSeconds);
  const latestDuration = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const player = useVideoPlayer({ uri }, (instance) => {
    instance.timeUpdateEventInterval = 5;
    if (resumeSeconds >= 10) instance.currentTime = resumeSeconds;
    instance.play();
  });
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });
  const playbackError = status === 'error' ? describePlaybackError(error?.message) : null;

  const enqueueSave = useCallback(() => {
    if (completed.current) return;
    const position = latestPosition.current;
    const duration = latestDuration.current;
    queue.current = queue.current.then(() => progressRepository.save(mediaId, mediaKind, position, duration)).catch(() => undefined);
  }, [mediaId, mediaKind]);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    latestPosition.current = currentTime;
    latestDuration.current = player.duration;
    enqueueSave();
  });

  useEventListener(player, 'playToEnd', () => {
    if (completed.current) return;
    completed.current = true;
    queue.current = queue.current
      .then(() => progressRepository.clear(mediaId, mediaKind))
      .then(() => onEnded?.())
      .catch(() => undefined);
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') enqueueSave(); });
    return () => { subscription.remove(); enqueueSave(); };
  }, [enqueueSave]);

  return <View style={styles.container}>
    <VideoView contentFit="contain" nativeControls player={player} style={styles.video} />
    {status === 'loading' && <ActivityIndicator color={colors.accentStrong} size="large" style={styles.loading} />}
    {playbackError && <View accessibilityRole="alert" style={styles.errorPanel}><Text style={styles.errorTitle}>{playbackError.title}</Text><Text style={styles.errorDetail}>{playbackError.detail}</Text></View>}
    <Text style={styles.title}>{name}</Text>
    {resumeSeconds >= 10 && <Text style={styles.resume}>Reprise à {formatTime(resumeSeconds)}</Text>}
  </View>;
}

function formatTime(seconds: number) {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}` : `${minutes}:${String(remaining).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  video: { aspectRatio: 16 / 9, backgroundColor: '#000', width: '100%' },
  loading: { alignSelf: 'center', position: 'absolute' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: spacing.md },
  resume: { color: colors.accentStrong, fontSize: 14, marginTop: spacing.xs },
  errorPanel: { alignSelf: 'center', backgroundColor: 'rgba(24, 12, 18, 0.96)', borderColor: colors.danger, borderRadius: 12, borderWidth: 1, maxWidth: 760, padding: spacing.lg, position: 'absolute', width: '78%' },
  errorTitle: { color: colors.danger, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  errorDetail: { color: colors.text, fontSize: 16, lineHeight: 24, marginTop: spacing.sm, textAlign: 'center' },
});
