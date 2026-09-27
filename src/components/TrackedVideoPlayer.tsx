import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { LibVlcPlayerView, type LibVlcPlayerViewRef, type MediaTrack, type Tracks } from 'expo-libvlc-player';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { WatchProgressRepository } from '../repositories/WatchProgressRepository';
import { describePlaybackError } from '../services/playbackError';
import { colors, radii, spacing } from '../theme/tokens';

const progressRepository = new WatchProgressRepository();

type Props = {
  mediaId: string;
  mediaKind: 'movie' | 'episode';
  name: string;
  onEnded?: () => void | Promise<void>;
  onFullscreenChange?: (fullscreen: boolean) => void;
  resumeSeconds: number;
  uri: string;
};

type TrackPanel = 'audio' | 'subtitle' | null;

export function TrackedVideoPlayer({ mediaId, mediaKind, name, onEnded, onFullscreenChange, resumeSeconds, uri }: Props) {
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 600;
  const playerRef = useRef<LibVlcPlayerViewRef>(null);
  const completed = useRef(false);
  const latestPosition = useRef(resumeSeconds);
  const latestDuration = useRef(0);
  const latestRatio = useRef(0);
  const lastSavedAt = useRef(resumeSeconds);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const bufferingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(resumeSeconds);
  const [scrubPosition, setScrubPosition] = useState(resumeSeconds);
  const [seeking, setSeeking] = useState(false);
  const [seekable, setSeekable] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [buffering, setBuffering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const [trackPanel, setTrackPanel] = useState<TrackPanel>(null);
  const [audioTracks, setAudioTracks] = useState<MediaTrack[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<MediaTrack[]>([]);
  const [tracks, setTracks] = useState<Tracks>({ subtitle: -1 });
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

  const clearBufferingTimer = useCallback(() => {
    if (bufferingTimer.current) clearTimeout(bufferingTimer.current);
    bufferingTimer.current = null;
  }, []);

  const scheduleBufferingIndicator = useCallback(() => {
    if (bufferingTimer.current) return;
    bufferingTimer.current = setTimeout(() => setBuffering(true), 650);
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    const target = Math.max(0, Math.min(latestDuration.current || Number.MAX_SAFE_INTEGER, seconds));
    latestPosition.current = target;
    setPosition(target);
    setScrubPosition(target);
    setBuffering(true);
    try {
      await playerRef.current?.seek(Math.round(target * 1000), 'time');
      if (playing) await playerRef.current?.play();
    } catch {
      setBuffering(false);
      setNotice('Impossible d’atteindre cette position dans le flux.');
    }
  }, [playing]);

  const seekBy = useCallback((seconds: number) => seekTo(latestPosition.current + seconds), [seekTo]);

  const togglePlayback = useCallback(() => {
    if (playing) void playerRef.current?.pause();
    else void playerRef.current?.play();
  }, [playing]);

  const stopPlayback = useCallback(() => {
    enqueueSave(true);
    void playerRef.current?.stop();
    setPlaying(false);
  }, [enqueueSave]);

  const toggleFullscreen = useCallback(async () => {
    const next = !fullscreen;
    setFullscreen(next);
    setTrackPanel(null);
    onFullscreenChange?.(next);
    if (!Platform.isTV) {
      try {
        if (next) await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        else await ScreenOrientation.unlockAsync();
      } catch {
        setNotice('La rotation automatique est indisponible sur cet appareil.');
      }
    }
  }, [fullscreen, onFullscreenChange]);

  const startPictureInPicture = useCallback(async (silent = false) => {
    try {
      await playerRef.current?.startPictureInPicture();
      if (!silent) setNotice(null);
    } catch {
      if (!silent) setNotice('Le mode image dans l’image est indisponible pour cette lecture.');
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'inactive' && playing && !pipActive) void startPictureInPicture(true);
      if (state !== 'active') enqueueSave(true);
    });
    return () => {
      subscription.remove();
      enqueueSave(true);
    };
  }, [enqueueSave, pipActive, playing, startPictureInPicture]);

  useEffect(() => () => {
    clearBufferingTimer();
    onFullscreenChange?.(false);
    if (!Platform.isTV) void ScreenOrientation.unlockAsync();
  }, [clearBufferingTimer, onFullscreenChange]);

  const displayedPosition = seeking ? scrubPosition : position;

  return <View style={[styles.container, compact && styles.containerCompact, fullscreen && styles.containerFullscreen]}>
    <StatusBar hidden={fullscreen} />
    <View style={[styles.playerFrame, fullscreen && styles.playerFrameFullscreen]}>
      <LibVlcPlayerView
        ref={playerRef}
        aspectRatio={fullscreen ? undefined : '16:9'}
        autoplay
        contentFit="contain"
        onBuffering={({ value }) => {
          if (value >= 100) {
            clearBufferingTimer();
            setBuffering(false);
          } else {
            scheduleBufferingIndicator();
          }
        }}
        onEncounteredError={({ message }) => {
          clearBufferingTimer();
          setBuffering(false);
          setError(message);
        }}
        onESAdded={({ audio, subtitle }) => {
          setAudioTracks(audio);
          setSubtitleTracks(subtitle);
        }}
        onFirstPlay={({ media }) => {
          clearBufferingTimer();
          const seconds = Math.max(0, media.length / 1000);
          latestDuration.current = seconds;
          setDuration(seconds);
          setSeekable(media.seekable);
          setBuffering(false);
        }}
        onPaused={() => setPlaying(false)}
        onPictureInPictureStart={() => setPipActive(true)}
        onPictureInPictureStop={() => setPipActive(false)}
        onPlaying={() => {
          clearBufferingTimer();
          setPlaying(true);
          setBuffering(false);
          setError(null);
        }}
        onPositionChanged={({ value }) => { latestRatio.current = value; }}
        onStopped={() => {
          clearBufferingTimer();
          setPlaying(false);
          setBuffering(false);
          if (latestRatio.current >= 0.98) finishPlayback();
          else enqueueSave(true);
        }}
        onTimeChanged={({ value }) => {
          clearBufferingTimer();
          setBuffering(false);
          const seconds = Math.max(0, value / 1000);
          latestPosition.current = seconds;
          if (!seeking) {
            setPosition(seconds);
            setScrubPosition(seconds);
          }
          enqueueSave();
        }}
        options={['--network-caching=1500', '--http-reconnect']}
        pictureInPicture
        source={uri}
        style={styles.video}
        time={resumeSeconds >= 10 ? Math.round(resumeSeconds * 1000) : 0}
        tracks={tracks}
      />
      {buffering && !playbackError && <ActivityIndicator color={colors.accentStrong} size="large" style={styles.loading} />}
      {playbackError && <View accessibilityRole="alert" style={styles.errorPanel}><Text style={styles.errorTitle}>{playbackError.title}</Text><Text style={styles.errorDetail}>{playbackError.detail}</Text></View>}
    </View>

    <View style={[styles.controlPanel, fullscreen && styles.controlPanelFullscreen]}>
      <View style={styles.timeline}>
        <Slider
          accessibilityLabel="Position de lecture"
          disabled={!seekable || duration <= 0}
          maximumTrackTintColor={colors.surfaceRaised}
          maximumValue={Math.max(duration, 1)}
          minimumTrackTintColor={colors.accentStrong}
          minimumValue={0}
          onSlidingComplete={(value) => { setSeeking(false); void seekTo(value); }}
          onSlidingStart={() => { setSeeking(true); clearBufferingTimer(); }}
          onValueChange={setScrubPosition}
          step={1}
          style={styles.slider}
          thumbTintColor={colors.text}
          value={Math.min(displayedPosition, Math.max(duration, 1))}
        />
        <View style={styles.timeRow}><Text style={styles.time}>{formatTime(displayedPosition)}</Text><Text style={styles.time}>{duration > 0 ? formatTime(duration) : '--:--'}</Text></View>
      </View>

      <View style={styles.transportControls}>
        <ControlButton compact={compact} icon="play-back" label="-10 s" onPress={() => void seekBy(-10)} style={styles.transportButton} />
        <ControlButton compact={compact} icon={playing ? 'pause' : 'play'} label={playing ? 'Pause' : 'Lire'} onPress={togglePlayback} primary style={styles.transportButton} />
        <ControlButton compact={compact} icon="stop" label="Stop" onPress={stopPlayback} style={styles.transportButton} />
        <ControlButton compact={compact} icon="play-forward" label="+30 s" onPress={() => void seekBy(30)} style={styles.transportButton} />
      </View>
      <View style={styles.secondaryControls}>
        <ControlButton compact={compact} icon="volume-high" label="Audio" onPress={() => setTrackPanel((value) => value === 'audio' ? null : 'audio')} style={compact && styles.secondaryButtonCompact} />
        <ControlButton compact={compact} icon="text" label="Sous-titres" onPress={() => setTrackPanel((value) => value === 'subtitle' ? null : 'subtitle')} style={compact && styles.secondaryButtonCompact} />
        {!Platform.isTV && <ControlButton compact={compact} icon="albums-outline" label="Image dans l’image" onPress={() => void startPictureInPicture()} style={compact && styles.secondaryButtonCompact} />}
        <ControlButton compact={compact} icon={fullscreen ? 'contract' : 'expand'} label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'} onPress={() => void toggleFullscreen()} style={compact && styles.secondaryButtonCompact} />
      </View>

      {trackPanel === 'audio' && <TrackSelector emptyLabel="Aucune autre piste audio détectée" label="Langue audio" onSelect={(id) => setTracks((current) => ({ ...current, audio: id }))} selectedId={tracks.audio} tracks={audioTracks} />}
      {trackPanel === 'subtitle' && <TrackSelector allowDisabled emptyLabel="Aucun sous-titre détecté" label="Sous-titres" onSelect={(id) => setTracks((current) => ({ ...current, subtitle: id }))} selectedId={tracks.subtitle} tracks={subtitleTracks} />}
      {notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
      {!fullscreen && <Text numberOfLines={2} style={styles.title}>{name}</Text>}
      {!fullscreen && resumeSeconds >= 10 && <Text style={styles.resume}>Reprise à {formatTime(resumeSeconds)}</Text>}
    </View>
  </View>;
}

function TrackSelector({ allowDisabled = false, emptyLabel, label, onSelect, selectedId, tracks }: { allowDisabled?: boolean; emptyLabel: string; label: string; onSelect: (id: number) => void; selectedId?: number; tracks: MediaTrack[] }) {
  return <View style={styles.trackPanel}>
    <Text style={styles.trackTitle}>{label}</Text>
    {tracks.length === 0 && !allowDisabled ? <Text style={styles.trackEmpty}>{emptyLabel}</Text> : <ScrollView contentContainerStyle={styles.trackList} horizontal showsHorizontalScrollIndicator={false}>
      {allowDisabled && <TrackButton active={selectedId === -1 || selectedId === undefined} label="Désactivés" onPress={() => onSelect(-1)} />}
      {tracks.map((track) => <TrackButton active={track.id === selectedId} key={track.id} label={track.name || `Piste ${track.id}`} onPress={() => onSelect(track.id)} />)}
      {tracks.length === 0 && <Text style={styles.trackEmpty}>{emptyLabel}</Text>}
    </ScrollView>}
  </View>;
}

function TrackButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.trackButton, active && styles.trackButtonActive]}><Text style={styles.trackButtonText}>{active ? `✓ ${label}` : label}</Text></Pressable>;
}

function ControlButton({ compact = false, icon, label, onPress, primary = false, style }: { compact?: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; primary?: boolean; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={({ focused, pressed }) => [styles.controlButton, compact && styles.controlButtonCompact, primary && styles.controlButtonPrimary, (focused || pressed) && styles.controlButtonFocused, style]}>
    <Ionicons color={colors.text} name={icon} size={compact ? 19 : 22} />
    <Text adjustsFontSizeToFit maxFontSizeMultiplier={1.25} numberOfLines={1} style={[styles.controlLabel, compact && styles.controlLabelCompact]}>{label}</Text>
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
  containerCompact: { justifyContent: 'flex-start', padding: 12 },
  containerFullscreen: { backgroundColor: '#000', padding: 0 },
  playerFrame: { aspectRatio: 16 / 9, backgroundColor: '#000', position: 'relative', width: '100%' },
  playerFrameFullscreen: { aspectRatio: undefined, flex: 1 },
  video: { flex: 1 },
  loading: { alignSelf: 'center', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  controlPanel: { width: '100%' },
  controlPanelFullscreen: { backgroundColor: 'rgba(3, 6, 13, 0.82)', bottom: 0, left: 0, padding: spacing.md, position: 'absolute', right: 0 },
  timeline: { marginTop: spacing.sm },
  slider: { height: 38, width: '100%' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -spacing.xs },
  time: { color: colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
  transportControls: { alignItems: 'stretch', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.sm },
  transportButton: { flex: 1, minWidth: 0 },
  secondaryControls: { alignItems: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', paddingBottom: spacing.sm },
  secondaryButtonCompact: { flexBasis: '47%', flexGrow: 1, minWidth: 0 },
  controlButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 48, minWidth: 96, paddingHorizontal: spacing.md },
  controlButtonCompact: { gap: spacing.xs, minWidth: 0, paddingHorizontal: spacing.sm },
  controlButtonPrimary: { backgroundColor: colors.accent, borderColor: colors.accentStrong },
  controlButtonFocused: { borderColor: colors.focus, borderWidth: 3, transform: [{ scale: 1.04 }] },
  controlLabel: { color: colors.text, fontSize: 14, fontWeight: '800' },
  controlLabelCompact: { fontSize: 12 },
  trackPanel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, marginTop: spacing.sm, padding: spacing.sm },
  trackTitle: { color: colors.text, fontSize: 15, fontWeight: '900', marginBottom: spacing.xs },
  trackList: { alignItems: 'center', gap: spacing.sm },
  trackButton: { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, minHeight: 42, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  trackButtonActive: { borderColor: colors.accentStrong },
  trackButtonText: { color: colors.text, fontWeight: '700' },
  trackEmpty: { color: colors.textMuted, paddingVertical: spacing.sm },
  notice: { color: colors.warning, fontSize: 13, marginTop: spacing.xs, textAlign: 'center' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: spacing.sm },
  resume: { color: colors.accentStrong, fontSize: 14, marginTop: spacing.xs },
  errorPanel: { alignSelf: 'center', backgroundColor: 'rgba(24, 12, 18, 0.96)', borderColor: colors.danger, borderRadius: 12, borderWidth: 1, maxWidth: 760, padding: spacing.lg, position: 'absolute', top: '28%', width: '78%' },
  errorTitle: { color: colors.danger, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  errorDetail: { color: colors.text, fontSize: 16, lineHeight: 24, marginTop: spacing.sm, textAlign: 'center' },
});
