import { useEvent, useEventListener } from 'expo';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useTVEventHandler,
  useWindowDimensions,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView, type AudioTrack, type SubtitleTrack, type VideoPlayer, type VideoSource, type VideoTrack } from 'expo-video';
import { LibVlcPlayerView } from 'expo-libvlc-player';

import { FocusableCard } from '../components/FocusableCard';
import { Screen } from '../components/Screen';
import { SQLiteChannelRepository } from '../repositories/SQLiteChannelRepository';
import { EpgRepository } from '../repositories/EpgRepository';
import { explainPlaybackError } from '../services/playerDiagnostics';
import { isRecoverableLiveError, liveReconnectDelay, MAX_LIVE_RECONNECT_ATTEMPTS } from '../services/liveReconnect';
import { resolveXtreamChannel, resolveXtreamChannelCandidates } from '../services/xtreamImportService';
import { alternateEngine, engineOrder, playbackPreferenceKey, type PlaybackEngine } from '../services/playbackStrategy';
import { preferences } from '../storage/preferences';
import { usePlaybackActivity } from '../hooks/usePlaybackActivity';
import { translate, useI18n } from '../i18n';
import { colors, radii, spacing } from '../theme/tokens';
import type { Channel } from '../types/domain';

const repository = new SQLiteChannelRepository();
const epgRepository = new EpgRepository();
const LIVE_VLC_OPTIONS = ['--network-caching=1200', '--http-reconnect', '--clock-jitter=0', '--http-user-agent=VLC/3.0.20 LibVLC/3.0.20'];

function sourceForChannel(channel: Channel): VideoSource {
  return channel.streamUrl.toLowerCase().includes('.m3u8')
    ? { uri: channel.streamUrl, contentType: 'hls' }
    : { uri: channel.streamUrl };
}

function mediaTrackLabel(track: AudioTrack | SubtitleTrack) {
  return track.label || track.name || track.language || translate('Piste', 'Track');
}

function videoTrackLabel(track: VideoTrack) {
  const resolution = track.size.height ? `${track.size.height}p` : translate('Qualité', 'Quality');
  const bitrate = track.peakBitrate ? ` · ${Math.round(track.peakBitrate / 1_000)} kb/s` : '';
  return `${resolution}${bitrate}`;
}

function applyAudioTrack(player: VideoPlayer, track: AudioTrack) { player.audioTrack = track; }
function applySubtitleTrack(player: VideoPlayer, track: SubtitleTrack | null) { player.subtitleTrack = track; }

function PlayerAction({ autoFocus = false, label, onPress }: { autoFocus?: boolean; label: string; onPress: () => void }) {
  return (
    <FocusableCard accessibilityRole="button" autoFocus={autoFocus} onPress={onPress} style={styles.action}>
      <Text style={styles.actionLabel}>{label}</Text>
    </FocusableCard>
  );
}

type AdjacentChannels = { previous: Channel | null; next: Channel | null };

function PlayerSurface({ channel, fullscreen, onAutomaticRetry, onEngineFailure, onEngineReady, onFullscreenChange, onRecovered, onRetry, retryAttempt, showSettings }: {
  channel: Channel;
  fullscreen: boolean;
  onAutomaticRetry: () => void;
  onRecovered: () => void;
  onRetry: () => void;
  retryAttempt: number;
  showSettings: boolean;
  onEngineFailure?: () => void;
  onEngineReady?: () => void;
  onFullscreenChange: (fullscreen: boolean) => void;
}) {
  const { tx } = useI18n();
  const player = useVideoPlayer(sourceForChannel(channel), (instance) => {
    instance.timeUpdateEventInterval = 0.5;
    instance.bufferOptions = {
      maxBufferBytes: 0,
      minBufferForPlayback: 1.5,
      preferredForwardBufferDuration: 6,
    };
    instance.play();
  });
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });
  const activity = usePlaybackActivity();
  useEventListener(player, 'timeUpdate', ({ currentTime }) => activity.onProgress(currentTime));
  useEventListener(player, 'statusChange', ({ status: next }) => activity.onBuffering(next === 'loading' ? 0 : 100));
  const problem = status === 'error' ? explainPlaybackError(error?.message) : null;
  const recoverable = status === 'error' && isRecoverableLiveError(error?.message);
  const [autoReconnectEnabled, setAutoReconnectEnabled] = useState(true);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [videoTracks, setVideoTracks] = useState<VideoTrack[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [contentFit, setContentFit] = useState(preferences.getVideoContentFit());
  const reconnectPending = recoverable && autoReconnectEnabled && retryAttempt < MAX_LIVE_RECONNECT_ATTEMPTS;

  useEffect(() => {
    if (status === 'readyToPlay' || status === 'error') return;
    const timer = setTimeout(() => onEngineFailure?.(), 10_000);
    return () => clearTimeout(timer);
  }, [channel.streamUrl, onEngineFailure, status]);

  useEffect(() => {
    if (status === 'readyToPlay') {
      onEngineReady?.();
      onRecovered();
      return;
    }
    if (status === 'error') onEngineFailure?.();
    if (!reconnectPending) return;
    const timer = setTimeout(onAutomaticRetry, liveReconnectDelay(retryAttempt));
    return () => clearTimeout(timer);
  }, [onAutomaticRetry, onEngineFailure, onEngineReady, onRecovered, reconnectPending, retryAttempt, status]);

  useEventListener(player, 'sourceLoad', ({ availableAudioTracks, availableSubtitleTracks, availableVideoTracks }) => {
    setAudioTracks(availableAudioTracks);
    setSubtitleTracks(availableSubtitleTracks);
    setVideoTracks(availableVideoTracks);
    setSelectedAudio(player.audioTrack ? mediaTrackLabel(player.audioTrack) : null);
    setSelectedSubtitle(player.subtitleTrack ? mediaTrackLabel(player.subtitleTrack) : null);
  });

  const chooseQuality = useCallback(async (track: VideoTrack | null) => {
    setSelectedQuality(track?.id ?? 'auto');
    await player.replaceAsync(track?.url ? { uri: track.url, contentType: 'hls' } : sourceForChannel(channel));
    player.play();
  }, [channel, player]);

  const cycleContentFit = useCallback(() => {
    const next = contentFit === 'contain' ? 'cover' : contentFit === 'cover' ? 'fill' : 'contain';
    setContentFit(next);
    preferences.setVideoContentFit(next);
  }, [contentFit]);

  return (
    <View style={[styles.playerBlock, fullscreen && styles.playerBlockFullscreen]}>
      <View style={[styles.videoFrame, fullscreen && styles.videoFrameFullscreen]}>
        <VideoView allowsPictureInPicture contentFit={contentFit} fullscreenOptions={{ enable: true }} nativeControls={!Platform.isTV} onFullscreenEnter={() => onFullscreenChange(true)} onFullscreenExit={() => onFullscreenChange(false)} player={player} startsPictureInPictureAutomatically={!Platform.isTV} style={styles.video} />
        {status === 'loading' && activity.buffering && (
          <View pointerEvents="none" style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.accentStrong} size="large" />
            <Text style={styles.loadingText}>{tx('Connexion au flux…', 'Connecting to stream…')}</Text>
          </View>
        )}
      </View>
      {problem && (
        <View accessibilityRole="alert" style={styles.problem}>
          <Text style={styles.problemTitle}>{problem.title}</Text>
          <Text style={styles.problemDetail}>{problem.detail}</Text>
          {reconnectPending && <Text style={styles.reconnect}>{tx(`Nouvelle tentative ${retryAttempt + 1}/${MAX_LIVE_RECONNECT_ATTEMPTS} dans ${liveReconnectDelay(retryAttempt) / 1000} s…`, `Retry ${retryAttempt + 1}/${MAX_LIVE_RECONNECT_ATTEMPTS} in ${liveReconnectDelay(retryAttempt) / 1000}s…`)}</Text>}
          <PlayerAction label={tx('Réessayer', 'Try again')} onPress={onRetry} />
          {reconnectPending && <PlayerAction label={tx('Annuler la reconnexion', 'Cancel reconnection')} onPress={() => setAutoReconnectEnabled(false)} />}
        </View>
      )}
      {showSettings && <View style={styles.panel}>
        <Text style={styles.panelTitle}>{tx('Options de lecture', 'Playback options')}</Text>
        <Text style={styles.optionTitle}>Audio</Text>
        <View style={styles.optionRow}>{audioTracks.length ? audioTracks.map((track, index) => {
          const label = mediaTrackLabel(track);
          return <PlayerAction key={`${track.id ?? track.language}:${index}`} label={`${selectedAudio === label ? '✓ ' : ''}${label}`} onPress={() => { applyAudioTrack(player, track); setSelectedAudio(label); }} />;
        }) : <Text style={styles.diagnostic}>{tx('Aucune piste audio alternative annoncée.', 'No alternative audio track available.')}</Text>}</View>
        <Text style={styles.optionTitle}>{tx('Sous-titres', 'Subtitles')}</Text>
        <View style={styles.optionRow}><PlayerAction label={`${selectedSubtitle === null ? '✓ ' : ''}${tx('Désactivés', 'Off')}`} onPress={() => { applySubtitleTrack(player, null); setSelectedSubtitle(null); }} />{subtitleTracks.map((track, index) => {
          const label = mediaTrackLabel(track);
          return <PlayerAction key={`${track.id ?? track.language}:${index}`} label={`${selectedSubtitle === label ? '✓ ' : ''}${label}`} onPress={() => { applySubtitleTrack(player, track); setSelectedSubtitle(label); }} />;
        })}</View>
        <Text style={styles.optionTitle}>{tx('Qualité', 'Quality')}</Text>
        <View style={styles.optionRow}><PlayerAction label={`${selectedQuality === 'auto' ? '✓ ' : ''}${tx('Automatique', 'Automatic')}`} onPress={() => void chooseQuality(null)} />{videoTracks.filter((track) => track.url).map((track) => <PlayerAction key={track.id} label={`${selectedQuality === track.id ? '✓ ' : ''}${videoTrackLabel(track)}`} onPress={() => void chooseQuality(track)} />)}</View>
        <Text style={styles.optionTitle}>{tx('Format d’image', 'Picture format')}</Text>
        <View style={styles.optionRow}><PlayerAction label={contentFit === 'contain' ? tx('Ajuster', 'Fit') : contentFit === 'cover' ? tx('Remplir', 'Fill') : tx('Étirer', 'Stretch')} onPress={cycleContentFit} /></View>
        <Text style={styles.diagnostic}>{tx('Vidéo', 'Video')} : {player.videoTrack ? videoTrackLabel(player.videoTrack) : tx('détection automatique', 'automatic detection')} · {tx('Les adresses et identifiants restent masqués.', 'Addresses and credentials remain hidden.')}</Text>
      </View>}
    </View>
  );
}

function VlcLiveSurface({ channel, fullscreen, onEngineFailure, onEngineReady }: { channel: Channel; fullscreen: boolean; onEngineFailure: () => void; onEngineReady: () => void }) {
  const { tx } = useI18n();
  const activity = usePlaybackActivity();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problem = error ? explainPlaybackError(error) : null;
  useEffect(() => {
    if (ready || error) return;
    const timer = setTimeout(() => {
      setError(tx('Délai de connexion dépassé pour ce flux.', 'Connection timed out for this stream.'));
      onEngineFailure();
    }, 10_000);
    return () => clearTimeout(timer);
  }, [error, onEngineFailure, ready, tx]);
  return <View style={[styles.playerBlock, fullscreen && styles.playerBlockFullscreen]}>
    <View style={[styles.videoFrame, fullscreen && styles.videoFrameFullscreen]}>
      <LibVlcPlayerView
        autoplay
        contentFit="contain"
        onBuffering={({ value }) => activity.onBuffering(value)}
        onTimeChanged={({ value }) => {
          if (activity.onProgress(value / 1000) && !ready) { setReady(true); onEngineReady(); }
        }}
        onEncounteredError={({ message }) => { setError(message); onEngineFailure(); }}
        onPlaying={() => { activity.onPlaying(); setReady(true); setError(null); onEngineReady(); }}
        options={LIVE_VLC_OPTIONS}
        pictureInPicture={!Platform.isTV}
        source={channel.streamUrl}
        style={styles.video}
      />
      {activity.buffering && !error && <View pointerEvents="none" style={styles.loadingOverlay}><ActivityIndicator color={colors.accentStrong} size="large" /><Text style={styles.loadingText}>{tx('Connexion au flux…', 'Connecting to stream…')}</Text></View>}
    </View>
    {problem && <View accessibilityRole="alert" style={styles.problem}><Text style={styles.problemTitle}>{problem.title}</Text><Text style={styles.problemDetail}>{problem.detail}</Text></View>}
  </View>;
}

export function PlayerScreen() {
  const { tx } = useI18n();
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 700;
  const [channel, setChannel] = useState<Channel | null>(null);
  const [channelVariants, setChannelVariants] = useState<Channel[]>([]);
  const [variantIndex, setVariantIndex] = useState(0);
  const [liveEngine, setLiveEngine] = useState<PlaybackEngine>('native');
  const [engineFallbackUsed, setEngineFallbackUsed] = useState(false);
  const [adjacent, setAdjacent] = useState<AdjacentChannels>({ previous: null, next: null });
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const switchingRef = useRef(false);
  const [retryGeneration, setRetryGeneration] = useState(0);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [programmes, setProgrammes] = useState<Awaited<ReturnType<EpgRepository['nowNext']>>>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenControlsVisible, setFullscreenControlsVisible] = useState(true);
  const fullscreenControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const revealFullscreenControls = useCallback(() => {
    setFullscreenControlsVisible(true);
    if (fullscreenControlsTimer.current) clearTimeout(fullscreenControlsTimer.current);
    if (fullscreen) {
      fullscreenControlsTimer.current = setTimeout(() => setFullscreenControlsVisible(false), 3_500);
    }
  }, [fullscreen]);

  const handleFullscreenChange = useCallback((next: boolean) => {
    setFullscreen(next);
    setFullscreenControlsVisible(true);
    if (fullscreenControlsTimer.current) clearTimeout(fullscreenControlsTimer.current);
    if (next) fullscreenControlsTimer.current = setTimeout(() => setFullscreenControlsVisible(false), 3_500);
  }, []);

  useEffect(() => {
    return () => {
      if (fullscreenControlsTimer.current) clearTimeout(fullscreenControlsTimer.current);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const next = !fullscreen;
    handleFullscreenChange(next);
    if (Platform.isTV) return;
    try {
      if (next) await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      else await ScreenOrientation.unlockAsync();
    } catch {
      // The video still fills the available screen when rotation locking is unavailable.
    }
  }, [fullscreen, handleFullscreenChange]);

  useEffect(() => () => {
    if (!Platform.isTV) void ScreenOrientation.unlockAsync().catch(() => undefined);
  }, []);

  const configureVariants = useCallback((variants: Channel[]) => {
    const initial = variants[0]!;
    const initialKey = playbackPreferenceKey(initial.streamUrl, 'live', Platform.OS);
    const selectedEngine = engineOrder(initial.streamUrl, 'live', preferences.getPlaybackEngine(initialKey), Platform.OS)[0]!;
    const transportStream = selectedEngine === 'vlc' ? variants.find((item) => /\.ts(?:[?#]|$)/i.test(item.streamUrl)) : undefined;
    const orderedVariants = transportStream ? [transportStream, ...variants.filter((item) => item !== transportStream)] : variants;
    const first = orderedVariants[0]!;
    setChannelVariants(orderedVariants);
    setVariantIndex(0);
    setLiveEngine(selectedEngine);
    setEngineFallbackUsed(false);
    setChannel(first);
  }, []);

  useEffect(() => {
    if (!channelId) return;
    repository.findById(channelId)
      .then((found) => {
        if (!found) throw new Error(tx('Chaîne introuvable.', 'Channel not found.'));
        return resolveXtreamChannelCandidates(found).then((resolved) => {
          configureVariants(resolved);
          preferences.setLastPlayingChannel(found.id);
          return repository.markWatched(found.id);
        });
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : tx('Lecture impossible.', 'Playback failed.')));
  }, [channelId, configureVariants, tx]);

  useEffect(() => {
    if (!channel) return;
    let active = true;
    Promise.all([
      repository.findAdjacent(channel.id, 'previous'),
      repository.findAdjacent(channel.id, 'next'),
    ]).then(async ([previous, next]) => ({
      previous: previous ? await resolveXtreamChannel(previous) : null,
      next: next ? await resolveXtreamChannel(next) : null,
    })).then((resolved) => { if (active) setAdjacent(resolved); })
      .catch(() => { if (active) setAdjacent({ previous: null, next: null }); });
    return () => { active = false; };
  }, [channel]);

  useEffect(() => {
    if (!channel) return;
    epgRepository.nowNext(channel.playlistId, channel.tvgId, channel.tvgName, channel.name)
      .then(setProgrammes)
      .catch(() => setProgrammes([]));
  }, [channel]);

  const changeChannel = useCallback(async (direction: 'previous' | 'next') => {
    if (!channel || switchingRef.current) return;
    switchingRef.current = true;
    setSwitching(true);
    setError(null);
    try {
      const preloaded = adjacent[direction];
      const found = preloaded ?? await repository.findAdjacent(channel.id, direction);
      if (!found) throw new Error(tx('Aucune autre chaîne disponible.', 'No other channel available.'));
      const variants = preloaded ? [preloaded] : await resolveXtreamChannelCandidates(found);
      setAdjacent({ previous: null, next: null });
      configureVariants(variants);
      setRetryAttempt(0);
      setRetryGeneration(0);
      preferences.setLastPlayingChannel(found.id);
      await repository.markWatched(found.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tx('Changement de chaîne impossible.', 'Unable to change channel.'));
    } finally {
      switchingRef.current = false;
      setSwitching(false);
    }
  }, [adjacent, channel, configureVariants, tx]);

  const retryAutomatically = useCallback(() => {
    const nextVariant = variantIndex + 1;
    if (nextVariant < channelVariants.length) {
      setVariantIndex(nextVariant);
      setChannel(channelVariants[nextVariant]!);
      setRetryAttempt(0);
      setRetryGeneration((current) => current + 1);
      return;
    }
    setRetryAttempt((current) => Math.min(current + 1, MAX_LIVE_RECONNECT_ATTEMPTS));
    setRetryGeneration((current) => current + 1);
  }, [channelVariants, variantIndex]);
  const retryManually = useCallback(() => {
    setRetryAttempt(0);
    setRetryGeneration((current) => current + 1);
  }, []);
  const markRecovered = useCallback(() => {
    setRetryAttempt((current) => current === 0 ? current : 0);
    if (channel) preferences.setPlaybackEngine(playbackPreferenceKey(channel.streamUrl, 'live', Platform.OS), liveEngine);
  }, [channel, liveEngine]);
  const handleEngineFailure = useCallback(() => {
    const nextVariant = variantIndex + 1;
    if (nextVariant < channelVariants.length) {
      setVariantIndex(nextVariant);
      setChannel(channelVariants[nextVariant]!);
      setRetryGeneration((current) => current + 1);
      return;
    }
    const supportsAlternateEngine = channel
      ? engineOrder(channel.streamUrl, 'live', null, Platform.OS).length > 1
      : false;
    if (!engineFallbackUsed && supportsAlternateEngine) {
      setEngineFallbackUsed(true);
      setLiveEngine((current) => alternateEngine(current));
      setRetryGeneration((current) => current + 1);
    }
  }, [channel, channelVariants, engineFallbackUsed, variantIndex]);

  useTVEventHandler((event) => {
    if (!Platform.isTV || event.eventKeyAction === 1) return;
    if (fullscreen) revealFullscreenControls();
    if (event.eventType === 'up') void changeChannel('previous');
    if (event.eventType === 'down') void changeChannel('next');
    if (event.eventType === 'select') {
      if (fullscreen && !fullscreenControlsVisible) revealFullscreenControls();
      else void toggleFullscreen();
    }
  });

  return (
    <Screen fullscreen={fullscreen}>
      <Stack.Screen options={{ headerShown: !fullscreen, title: channel?.displayName ?? tx('Direct', 'Live') }} />
      <View style={[styles.container, compact && !fullscreen && styles.containerCompact, fullscreen && styles.containerFullscreen]}>
        {channel ? liveEngine === 'native' ? (
          <PlayerSurface
            channel={channel}
            fullscreen={fullscreen}
            key={`native:${channel.id}:${retryGeneration}`}
            onAutomaticRetry={retryAutomatically}
            onEngineFailure={handleEngineFailure}
            onEngineReady={markRecovered}
            onFullscreenChange={handleFullscreenChange}
            onRecovered={markRecovered}
            onRetry={retryManually}
            retryAttempt={retryAttempt}
            showSettings={false}
          />
        ) : <VlcLiveSurface channel={channel} fullscreen={fullscreen} key={`vlc:${channel.id}:${retryGeneration}`} onEngineFailure={handleEngineFailure} onEngineReady={markRecovered} /> : !error && <ActivityIndicator color={colors.accentStrong} size="large" />}
        {channel && !fullscreen && (
          <View style={[styles.details, compact && styles.detailsCompact]}>
            <View style={styles.channelDetails}>
              <Text numberOfLines={1} style={styles.title}>{channel.displayName}</Text>
              {programmes[0] && <Text numberOfLines={1} style={styles.now}>{tx('Maintenant', 'Now')} · {programmes[0].title}</Text>}
              {programmes[1] && <Text numberOfLines={1} style={styles.next}>{tx('Ensuite', 'Next')} · {programmes[1].title}</Text>}
              {Platform.isTV && <Text style={styles.hint}>{tx('D-pad haut/bas : changer de chaîne', 'D-pad up/down: change channel')}</Text>}
            </View>
            <View style={styles.actions}>
              <PlayerAction autoFocus label={tx('Plein écran', 'Full screen')} onPress={() => void toggleFullscreen()} />
            </View>
          </View>
        )}
        {channel && fullscreen && <Pressable accessibilityLabel={tx('Afficher les commandes', 'Show controls')} accessibilityRole="button" onPress={revealFullscreenControls} style={styles.fullscreenTouchLayer} />}
        {channel && fullscreen && fullscreenControlsVisible && <View style={styles.fullscreenAction}><PlayerAction autoFocus label={tx('Quitter le plein écran', 'Exit full screen')} onPress={() => void toggleFullscreen()} /></View>}
        {!fullscreen && switching && <Text style={styles.switching}>{tx('Changement de chaîne…', 'Changing channel…')}</Text>}
        {!fullscreen && error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  containerCompact: { justifyContent: 'flex-start', padding: spacing.sm },
  containerFullscreen: { backgroundColor: '#000', padding: 0 },
  playerBlock: { width: '100%' },
  playerBlockFullscreen: { flex: 1 },
  videoFrame: { aspectRatio: 16 / 9, alignSelf: 'center', backgroundColor: '#000', position: 'relative', width: Platform.isTV ? '74%' : '100%' },
  videoFrameFullscreen: { aspectRatio: undefined, flex: 1, width: '100%' },
  video: { height: '100%', width: '100%' },
  loadingOverlay: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', bottom: 0, gap: spacing.md, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  loadingText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  details: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg, justifyContent: 'space-between', marginTop: spacing.md },
  detailsCompact: { alignItems: 'stretch', flexDirection: 'column', gap: spacing.md },
  channelDetails: { flex: 1 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  now: { color: colors.accentStrong, fontSize: 15, fontWeight: '700', marginTop: spacing.xs },
  next: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  fullscreenAction: { bottom: spacing.md, position: 'absolute', right: spacing.md, zIndex: 4 },
  fullscreenTouchLayer: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 3 },
  action: { minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  actionLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  switching: { color: colors.accentStrong, fontSize: 14, marginTop: spacing.sm },
  problem: { backgroundColor: colors.surfaceRaised, borderColor: colors.danger, borderRadius: radii.md, borderWidth: 1, gap: spacing.sm, marginTop: spacing.md, padding: spacing.md },
  problemTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  problemDetail: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  reconnect: { color: colors.warning, fontSize: 14, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 17, marginTop: spacing.md, textAlign: 'center' },
  panel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, marginTop: spacing.md, padding: spacing.lg },
  panelTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  optionTitle: { color: colors.textMuted, fontSize: 13, fontWeight: '900', letterSpacing: 1, marginTop: spacing.sm, textTransform: 'uppercase' },
  programmeRow: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: spacing.lg, paddingTop: spacing.sm },
  programmeTime: { color: colors.accentStrong, fontSize: 13, fontWeight: '800', width: 90 },
  programmeTitle: { color: colors.text, flex: 1, fontSize: 16, fontWeight: '700' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  diagnostic: { color: colors.textMuted, fontSize: 12 },
});
