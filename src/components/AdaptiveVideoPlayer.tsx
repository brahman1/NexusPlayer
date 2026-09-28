import { Platform, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { engineOrder, playbackPreferenceKey, type PlaybackEngine } from '../services/playbackStrategy';
import { preferences } from '../storage/preferences';
import { colors, spacing } from '../theme/tokens';
import { NativeTrackedVideoPlayer } from './NativeTrackedVideoPlayer';
import { TrackedVideoPlayer, type TrackedVideoPlayerProps } from './TrackedVideoPlayer';

const NATIVE_STARTUP_TIMEOUT_MS = 10_000;
const VLC_STARTUP_TIMEOUT_MS = 25_000;

export function AdaptiveVideoPlayer(props: TrackedVideoPlayerProps) {
  const kind = props.mediaKind === 'movie' ? 'movie' : 'episode';
  const preferenceKey = useMemo(() => playbackPreferenceKey(props.uri, kind, Platform.OS), [kind, props.uri]);
  const engines = useMemo(() => engineOrder(props.uri, kind, preferences.getPlaybackEngine(preferenceKey), Platform.OS), [kind, preferenceKey, props.uri]);
  const [engineIndex, setEngineIndex] = useState(0);
  const [readyEngine, setReadyEngine] = useState<PlaybackEngine | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const latestPosition = useRef(props.resumeSeconds);
  const switched = useRef(false);
  const [startPosition, setStartPosition] = useState(props.resumeSeconds);
  const engine = engines[engineIndex] ?? engines[0]!;

  const fallback = useCallback(() => {
    if (switched.current || engines.length < 2) return;
    switched.current = true;
    setStartPosition(latestPosition.current);
    setNotice('Optimisation du flux… changement de moteur.');
    setReadyEngine(null);
    setEngineIndex(1);
  }, [engines.length]);

  const progress = useCallback((seconds: number) => { latestPosition.current = seconds; props.onProgress?.(seconds); }, [props]);

  const ready = useCallback(() => {
    preferences.setPlaybackEngine(preferenceKey, engine);
    setReadyEngine(engine);
    setNotice(null);
    props.onReady?.();
  }, [engine, preferenceKey, props]);

  useEffect(() => {
    if (readyEngine === engine) return;
    const timer = setTimeout(fallback, engine === 'vlc' ? VLC_STARTUP_TIMEOUT_MS : NATIVE_STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [engine, fallback, readyEngine]);

  const shared = { ...props, resumeSeconds: startPosition, onProgress: progress, onFatalError: fallback, onReady: ready };
  return <View style={styles.container}>
    {notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
    {engine === 'native' ? <NativeTrackedVideoPlayer {...shared} key={`native:${props.mediaId}`} /> : <TrackedVideoPlayer {...shared} key={`vlc:${props.mediaId}`} />}
  </View>;
}

export function preferredEngineLabel(engine: PlaybackEngine) { return engine === 'native' ? 'Natif' : 'VLC'; }

const styles = StyleSheet.create({
  container: { flex: 1 },
  notice: { color: colors.warning, fontSize: 14, fontWeight: '800', paddingHorizontal: spacing.md, paddingTop: spacing.sm, textAlign: 'center' },
});
