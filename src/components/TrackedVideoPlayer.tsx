import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { LibVlcPlayerView, type LibVlcPlayerViewRef, type MediaTrack, type Tracks } from 'expo-libvlc-player';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { WatchProgressRepository } from '../repositories/WatchProgressRepository';
import { describePlaybackError } from '../services/playbackError';
import { colors, radii, spacing } from '../theme/tokens';

const progressRepository = new WatchProgressRepository();
const VOD_PLAYER_OPTIONS = ['--network-caching=750', '--input-fast-seek', '--http-reconnect'];

export type TrackedVideoPlayerProps = {
  mediaId: string;
  mediaKind: 'movie' | 'episode';
  name: string;
  nextEpisode?: { name: string; onPress: () => void };
  onEnded?: () => void | Promise<void>;
  onFatalError?: (message: string) => void;
  onFullscreenChange?: (fullscreen: boolean) => void;
  onReady?: () => void;
  resumeSeconds: number;
  uri: string;
};

type TrackPanel = 'audio' | 'subtitle' | null;

function playableTracks(items: MediaTrack[]) {
  return items.filter((item, index) => item.id >= 0 && items.findIndex((candidate) => candidate.id === item.id) === index);
}

export function TrackedVideoPlayer({ mediaId, mediaKind, name, nextEpisode, onEnded, onFatalError, onFullscreenChange, onReady, resumeSeconds, uri }: TrackedVideoPlayerProps) {
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
  const seekWatchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekGeneration = useRef(0);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [controlsVisible, setControlsVisible] = useState(true);
  const playbackError = error ? describePlaybackError(error) : null;
  const playerOptions = useMemo(
    () => resumeSeconds >= 10
      ? [...VOD_PLAYER_OPTIONS, `--start-time=${Math.floor(resumeSeconds)}`]
      : VOD_PLAYER_OPTIONS,
    [resumeSeconds],
  );

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

  const clearSeekWatchdog = useCallback(() => {
    if (seekWatchdog.current) clearTimeout(seekWatchdog.current);
    seekWatchdog.current = null;
  }, []);

  const clearControlsTimer = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = null;
  }, []);

  const revealControls = useCallback(() => {
    clearControlsTimer();
    setControlsVisible(true);
    if (fullscreen) controlsTimer.current = setTimeout(() => setControlsVisible(false), 3500);
  }, [clearControlsTimer, fullscreen]);

  const seekTo = useCallback(async (seconds: number) => {
    const target = Math.max(0, Math.min(latestDuration.current || Number.MAX_SAFE_INTEGER, seconds));
    const generation = ++seekGeneration.current;
    latestPosition.current = target;
    setPosition(target);
    setScrubPosition(target);
    clearBufferingTimer();
    clearSeekWatchdog();
    scheduleBufferingIndicator();
    seekWatchdog.current = setTimeout(() => {
      if (seekGeneration.current !== generation) return;
      clearBufferingTimer();
      setBuffering(false);
      setNotice('Le serveur met trop de temps à atteindre cette position. Réessayez ou utilisez les boutons ±10/30 s.');
    }, 8000);
    try {
      const mediaDuration = latestDuration.current;
      if (mediaDuration > 0) await playerRef.current?.seek(Math.max(0, Math.min(1, target / mediaDuration)), 'position');
      else await playerRef.current?.seek(Math.round(target * 1000), 'time');
      if (playing) await playerRef.current?.play();
    } catch {
      clearSeekWatchdog();
      clearBufferingTimer();
      setBuffering(false);
      setNotice('Impossible d’atteindre cette position dans le flux.');
    }
  }, [clearBufferingTimer, clearSeekWatchdog, playing, scheduleBufferingIndicator]);

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
    clearControlsTimer();
    setControlsVisible(true);
    if (next) controlsTimer.current = setTimeout(() => setControlsVisible(false), 3500);
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
  }, [clearControlsTimer, fullscreen, onFullscreenChange]);

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
    clearSeekWatchdog();
    clearControlsTimer();
    onFullscreenChange?.(false);
    if (!Platform.isTV) void ScreenOrientation.unlockAsync();
  }, [clearBufferingTimer, clearControlsTimer, clearSeekWatchdog, onFullscreenChange]);

  const selectAudioTrack = useCallback((id: number) => {
    setTracks((current) => ({ ...current, audio: id }));
    const selected = audioTracks.find((track) => track.id === id);
    setNotice(selected ? `Langue audio : ${selected.name}` : null);
    if (playing) setTimeout(() => { void playerRef.current?.play(); }, 50);
  }, [audioTracks, playing]);

  const selectSubtitleTrack = useCallback((id: number) => {
    setTracks((current) => ({ ...current, subtitle: id }));
    const selected = subtitleTracks.find((track) => track.id === id);
    setNotice(id === -1 ? 'Sous-titres désactivés.' : selected ? `Sous-titres : ${selected.name}` : 'Piste de sous-titres sélectionnée.');
    if (playing) setTimeout(() => { void playerRef.current?.play(); }, 50);
  }, [playing, subtitleTracks]);

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
            clearSeekWatchdog();
            setBuffering(false);
          } else {
            scheduleBufferingIndicator();
          }
        }}
        onEncounteredError={({ message }) => {
          clearBufferingTimer();
          clearSeekWatchdog();
          setBuffering(false);
          setError(message);
          onFatalError?.(message);
        }}
        onESAdded={({ audio, subtitle }) => {
          setAudioTracks(playableTracks(audio));
          setSubtitleTracks(playableTracks(subtitle));
        }}
        onFirstPlay={({ media }) => {
          clearBufferingTimer();
          clearSeekWatchdog();
          const seconds = Math.max(0, media.length / 1000);
          latestDuration.current = seconds;
          setDuration(seconds);
          setSeekable(media.seekable);
          setBuffering(false);
          onReady?.();
        }}
        onPaused={() => setPlaying(false)}
        onPictureInPictureStart={() => setPipActive(true)}
        onPictureInPictureStop={() => setPipActive(false)}
        onPlaying={() => {
          clearBufferingTimer();
          clearSeekWatchdog();
          setPlaying(true);
          setBuffering(false);
          setError(null);
        }}
        onPositionChanged={({ value }) => { latestRatio.current = value; }}
        onStopped={() => {
          clearBufferingTimer();
          clearSeekWatchdog();
          setPlaying(false);
          setBuffering(false);
          if (latestRatio.current >= 0.98) finishPlayback();
          else enqueueSave(true);
        }}
        onTimeChanged={({ value }) => {
          clearBufferingTimer();
          clearSeekWatchdog();
          setBuffering(false);
          const seconds = Math.max(0, value / 1000);
          latestPosition.current = seconds;
          if (!seeking) {
            setPosition(seconds);
            setScrubPosition(seconds);
          }
          enqueueSave();
        }}
        options={playerOptions}
        pictureInPicture
        source={uri}
        style={styles.video}
        tracks={tracks}
      />
      {fullscreen && <Pressable accessibilityLabel={controlsVisible ? 'Masquer les commandes' : 'Afficher les commandes'} accessibilityRole="button" onPress={() => { if (controlsVisible) { clearControlsTimer(); setControlsVisible(false); } else revealControls(); }} style={styles.fullscreenTouchLayer} />}
      {buffering && !playbackError && <ActivityIndicator color={colors.accentStrong} size="large" style={styles.loading} />}
      {playbackError && <View accessibilityRole="alert" style={styles.errorPanel}><Text style={styles.errorTitle}>{playbackError.title}</Text><Text style={styles.errorDetail}>{playbackError.detail}</Text></View>}
    </View>

    {(!fullscreen || controlsVisible) && <View onTouchStart={revealControls} style={[styles.controlPanel, fullscreen && styles.controlPanelFullscreen]}>
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
        {nextEpisode && <ControlButton accessibilityLabel={`Lire l’épisode suivant, ${nextEpisode.name}`} compact={compact} icon="play-skip-forward" label="Épisode suivant" onPress={nextEpisode.onPress} style={compact && styles.secondaryButtonCompact} />}
        <ControlButton compact={compact} icon="volume-high" label="Audio" onPress={() => setTrackPanel((value) => value === 'audio' ? null : 'audio')} style={compact && styles.secondaryButtonCompact} />
        <ControlButton compact={compact} icon="text" label="Sous-titres" onPress={() => setTrackPanel((value) => value === 'subtitle' ? null : 'subtitle')} style={compact && styles.secondaryButtonCompact} />
        {!Platform.isTV && <ControlButton compact={compact} icon="albums-outline" label="Image dans l’image" onPress={() => void startPictureInPicture()} style={compact && styles.secondaryButtonCompact} />}
        <ControlButton compact={compact} icon={fullscreen ? 'contract' : 'expand'} label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'} onPress={() => void toggleFullscreen()} style={compact && styles.secondaryButtonCompact} />
      </View>

      {trackPanel === 'audio' && <TrackSelector emptyLabel="Aucune autre piste audio détectée" label="Langue audio" onSelect={selectAudioTrack} selectedId={tracks.audio} tracks={audioTracks} />}
      {trackPanel === 'subtitle' && <TrackSelector allowDisabled emptyLabel="Aucun sous-titre intégré détecté dans cette vidéo" label="Sous-titres" onSelect={selectSubtitleTrack} selectedId={tracks.subtitle} tracks={subtitleTracks} />}
      {notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
      {!fullscreen && <Text numberOfLines={2} style={styles.title}>{name}</Text>}
      {!fullscreen && resumeSeconds >= 10 && <Text style={styles.resume}>Reprise à {formatTime(resumeSeconds)}</Text>}
    </View>}
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

function ControlButton({ accessibilityLabel, compact = false, icon, label, onPress, primary = false, style }: { accessibilityLabel?: string; compact?: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; primary?: boolean; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessibilityLabel={accessibilityLabel ?? label} accessibilityRole="button" onPress={onPress} style={({ focused, pressed }) => [styles.controlButton, compact && styles.controlButtonCompact, primary && styles.controlButtonPrimary, (focused || pressed) && styles.controlButtonFocused, style]}>
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
  fullscreenTouchLayer: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 1 },
  controlPanel: { width: '100%' },
  controlPanelFullscreen: { backgroundColor: 'rgba(3, 6, 13, 0.82)', bottom: 0, left: 0, padding: spacing.md, position: 'absolute', right: 0, zIndex: 2 },
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
