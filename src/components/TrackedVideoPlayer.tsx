import { Ionicons } from '@expo/vector-icons';
import { LibVlcPlayerView, type LibVlcPlayerViewRef } from 'expo-libvlc-player';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { WatchProgressRepository } from '../repositories/WatchProgressRepository';
import { describePlaybackError } from '../services/playbackError';
import { colors, radii, spacing } from '../theme/tokens';

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
  const playerRef = useRef<LibVlcPlayerViewRef>(null);
  const completed = useRef(false);
  const latestPosition = useRef(resumeSeconds);
  const latestDuration = useRef(0);
  const latestRatio = useRef(0);
  const lastSavedAt = useRef(resumeSeconds);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(resumeSeconds);
  const [playing, setPlaying] = useState(true);
  const [buffering, setBuffering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const playbackError = error ? describePlaybackError(error) : null;

  const enqueueSave = useCallback((force = false) => {
    if (completed.current) return;
    const currentPosition = latestPosition.current;
    if (!force && Math.abs(currentPosition - lastSavedAt.current) < 5) return;
    lastSavedAt.current = currentPosition;
    queue.current = queue.current
      .then(() => progressRepository.save(mediaId, mediaKind, currentPosition, latestDuration.current))
      .catch(() => undefined);
  }, [mediaId, mediaKind]);

  const finishPlayback = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    queue.current = queue.current
      .then(() => progressRepository.clear(mediaId, mediaKind))
      .then(() => onEnded?.())
      .catch(() => undefined);
  }, [mediaId, mediaKind, onEnded]);

  const seekBy = useCallback((seconds: number) => {
    const target = Math.max(0, Math.min(latestDuration.current || Number.MAX_SAFE_INTEGER, latestPosition.current + seconds));
    latestPosition.current = target;
    setPosition(target);
    void playerRef.current?.seek(Math.round(target * 1000));
  }, []);

  const togglePlayback = useCallback(() => {
    if (playing) void playerRef.current?.pause();
    else void playerRef.current?.play();
  }, [playing]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') enqueueSave(true);
    });
    return () => {
      subscription.remove();
      enqueueSave(true);
    };
  }, [enqueueSave]);

  return <View style={styles.container}>
    <View style={styles.playerFrame}>
      <LibVlcPlayerView
        ref={playerRef}
        aspectRatio="16:9"
        autoplay
        contentFit="contain"
        onBuffering={({ value }) => setBuffering(value < 100)}
        onEncounteredError={({ message }) => {
          setBuffering(false);
          setError(message);
        }}
        onFirstPlay={({ media }) => {
          const seconds = Math.max(0, media.length / 1000);
          latestDuration.current = seconds;
          setDuration(seconds);
          setBuffering(false);
        }}
        onPaused={() => setPlaying(false)}
        onPlaying={() => {
          setPlaying(true);
          setBuffering(false);
          setError(null);
        }}
        onPositionChanged={({ value }) => { latestRatio.current = value; }}
        onStopped={() => {
          setPlaying(false);
          setBuffering(false);
          if (latestRatio.current >= 0.98) finishPlayback();
          else enqueueSave(true);
        }}
        onTimeChanged={({ value }) => {
          const seconds = Math.max(0, value / 1000);
          latestPosition.current = seconds;
          setPosition(seconds);
          enqueueSave();
        }}
        options={['--network-caching=1500', '--http-reconnect']}
        pictureInPicture
        source={uri}
        style={styles.video}
        time={resumeSeconds >= 10 ? Math.round(resumeSeconds * 1000) : 0}
      />
      {buffering && !playbackError && <ActivityIndicator color={colors.accentStrong} size="large" style={styles.loading} />}
      {playbackError && <View accessibilityRole="alert" style={styles.errorPanel}><Text style={styles.errorTitle}>{playbackError.title}</Text><Text style={styles.errorDetail}>{playbackError.detail}</Text></View>}
    </View>

    <View style={styles.timeline}>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${duration > 0 ? Math.min(100, (position / duration) * 100) : 0}%` }]} /></View>
      <View style={styles.timeRow}><Text style={styles.time}>{formatTime(position)}</Text><Text style={styles.time}>{duration > 0 ? formatTime(duration) : '--:--'}</Text></View>
    </View>

    <View style={styles.controls}>
      <ControlButton icon="play-back" label="-10 s" onPress={() => seekBy(-10)} />
      <ControlButton icon={playing ? 'pause' : 'play'} label={playing ? 'Pause' : 'Lire'} onPress={togglePlayback} primary />
      <ControlButton icon="play-forward" label="+30 s" onPress={() => seekBy(30)} />
    </View>
    <Text numberOfLines={2} style={styles.title}>{name}</Text>
    {resumeSeconds >= 10 && <Text style={styles.resume}>Reprise à {formatTime(resumeSeconds)}</Text>}
  </View>;
}

function ControlButton({ icon, label, onPress, primary = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; primary?: boolean }) {
  return <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={({ focused, pressed }) => [styles.controlButton, primary && styles.controlButtonPrimary, (focused || pressed) && styles.controlButtonFocused]}>
    <Ionicons color={colors.text} name={icon} size={22} />
    <Text style={styles.controlLabel}>{label}</Text>
  </Pressable>;
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}` : `${minutes}:${String(remaining).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  playerFrame: { aspectRatio: 16 / 9, backgroundColor: '#000', position: 'relative', width: '100%' },
  video: { flex: 1 },
  loading: { alignSelf: 'center', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  timeline: { marginTop: spacing.md },
  progressTrack: { backgroundColor: colors.surfaceRaised, borderRadius: radii.pill, height: 6, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.accentStrong, height: '100%' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  time: { color: colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
  controls: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.md },
  controlButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 48, minWidth: 104, paddingHorizontal: spacing.md },
  controlButtonPrimary: { backgroundColor: colors.accent, borderColor: colors.accentStrong },
  controlButtonFocused: { borderColor: colors.focus, borderWidth: 3, transform: [{ scale: 1.04 }] },
  controlLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: spacing.md },
  resume: { color: colors.accentStrong, fontSize: 14, marginTop: spacing.xs },
  errorPanel: { alignSelf: 'center', backgroundColor: 'rgba(24, 12, 18, 0.96)', borderColor: colors.danger, borderRadius: 12, borderWidth: 1, maxWidth: 760, padding: spacing.lg, position: 'absolute', top: '28%', width: '78%' },
  errorTitle: { color: colors.danger, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  errorDetail: { color: colors.text, fontSize: 16, lineHeight: 24, marginTop: spacing.sm, textAlign: 'center' },
});
