import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { WatchProgressRepository } from '../repositories/WatchProgressRepository';
import { describePlaybackError } from '../services/playbackError';
import { mediaExtension } from '../services/playbackStrategy';
import { colors, spacing } from '../theme/tokens';
import type { TrackedVideoPlayerProps } from './TrackedVideoPlayer';

const progressRepository = new WatchProgressRepository();

function sourceFor(uri: string): VideoSource {
  const extension = mediaExtension(uri);
  return extension === 'm3u8' ? { uri, contentType: 'hls' } : { uri, contentType: 'progressive' };
}

export function NativeTrackedVideoPlayer({ mediaId, mediaKind, name, nextEpisode, onEnded, onFatalError, onFullscreenChange, onReady, onProgress, resumeSeconds, uri }: TrackedVideoPlayerProps) {
  const lastSaved = useRef(resumeSeconds);
  const latestPosition = useRef(resumeSeconds);
  const latestDuration = useRef(0);
  const completed = useRef(false);
  const source = useMemo(() => sourceFor(uri), [uri]);
  const player = useVideoPlayer(source, (instance) => {
    instance.timeUpdateEventInterval = 1;
    instance.seekTolerance = { toleranceBefore: 2, toleranceAfter: 2 };
    instance.bufferOptions = { maxBufferBytes: 0, minBufferForPlayback: 1.5, preferredForwardBufferDuration: 8 };
    if (resumeSeconds >= 10) instance.currentTime = resumeSeconds;
    instance.play();
  });
  const { status, error } = useEvent(player, 'statusChange', { status: player.status, error: undefined });
  const problem = status === 'error' ? describePlaybackError(error?.message ?? 'Erreur du lecteur natif.') : null;

  const save = useCallback((force = false) => {
    if (completed.current || latestDuration.current <= 0) return;
    if (!force && Math.abs(latestPosition.current - lastSaved.current) < 5) return;
    lastSaved.current = latestPosition.current;
    void progressRepository.save(mediaId, mediaKind, latestPosition.current, latestDuration.current).catch(() => undefined);
  }, [mediaId, mediaKind]);

  useEventListener(player, 'sourceLoad', ({ duration }) => { latestDuration.current = duration; });
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (resumeSeconds >= 10 && latestPosition.current === resumeSeconds && currentTime < 1) return;
    latestPosition.current = currentTime; onProgress?.(currentTime); save();
  });
  useEventListener(player, 'playToEnd', () => {
    completed.current = true;
    void progressRepository.clear(mediaId, mediaKind).then(() => onEnded?.());
  });

  useEffect(() => {
    if (status === 'readyToPlay') onReady?.();
    if (status === 'error') onFatalError?.(error?.message ?? 'Erreur du lecteur natif.');
  }, [error?.message, onFatalError, onReady, status]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') save(true); });
    return () => { subscription.remove(); save(true); };
  }, [save]);

  return <View style={styles.container}>
    <View style={styles.frame}>
      <VideoView allowsPictureInPicture contentFit="contain" fullscreenOptions={{ enable: true }} nativeControls onFullscreenEnter={() => onFullscreenChange?.(true)} onFullscreenExit={() => onFullscreenChange?.(false)} player={player} startsPictureInPictureAutomatically style={styles.video} />
      {problem && <View style={styles.error}><Text style={styles.errorTitle}>{problem.title}</Text><Text style={styles.errorDetail}>{problem.detail}</Text></View>}
    </View>
    <View style={styles.details}><Text numberOfLines={2} style={styles.title}>{name}</Text>{nextEpisode && <Pressable accessibilityLabel={`Lire l’épisode suivant, ${nextEpisode.name}`} accessibilityRole="button" onPress={nextEpisode.onPress} style={styles.nextButton}><Text style={styles.nextLabel}>Épisode suivant</Text></Pressable>}</View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.md },
  frame: { aspectRatio: 16 / 9, backgroundColor: '#000', position: 'relative', width: '100%' },
  video: { height: '100%', width: '100%' },
  details: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between', marginTop: spacing.sm },
  title: { color: colors.text, flex: 1, fontSize: 20, fontWeight: '800', minWidth: 180 },
  nextButton: { backgroundColor: colors.surface, borderColor: colors.accentStrong, borderRadius: 999, borderWidth: 1, minHeight: 48, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  nextLabel: { color: colors.text, fontSize: 14, fontWeight: '800' },
  error: { alignSelf: 'center', backgroundColor: 'rgba(24, 12, 18, 0.96)', padding: spacing.lg, position: 'absolute', top: '30%', width: '80%' },
  errorTitle: { color: colors.danger, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  errorDetail: { color: colors.text, marginTop: spacing.sm, textAlign: 'center' },
});
