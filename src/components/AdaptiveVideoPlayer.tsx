import { Platform, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { engineOrder, playbackPreferenceKey, type PlaybackEngine } from '../services/playbackStrategy';
import { preferences } from '../storage/preferences';
import { colors, spacing } from '../theme/tokens';
import { NativeTrackedVideoPlayer } from './NativeTrackedVideoPlayer';
import { TrackedVideoPlayer, type TrackedVideoPlayerProps } from './TrackedVideoPlayer';

const STARTUP_TIMEOUT_MS = 10_000;

export function AdaptiveVideoPlayer(props: TrackedVideoPlayerProps) {
  const kind = props.mediaKind === 'movie' ? 'movie' : 'episode';
  const preferenceKey = useMemo(() => playbackPreferenceKey(props.uri, kind, Platform.OS), [kind, props.uri]);
  const engines = useMemo(() => engineOrder(props.uri, kind, preferences.getPlaybackEngine(preferenceKey)), [kind, preferenceKey, props.uri]);
  const [engineIndex, setEngineIndex] = useState(0);
  const [readyEngine, setReadyEngine] = useState<PlaybackEngine | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const engine = engines[engineIndex] ?? engines[0]!;

  const fallback = useCallback(() => {
    setEngineIndex((current) => {
      if (current + 1 >= engines.length) return current;
      setNotice('Optimisation du flux… changement de moteur.');
      setReadyEngine(null);
      return current + 1;
    });
  }, [engines.length]);

  const ready = useCallback(() => {
    preferences.setPlaybackEngine(preferenceKey, engine);
    setReadyEngine(engine);
    setNotice(null);
  }, [engine, preferenceKey]);

  useEffect(() => {
    if (readyEngine === engine) return;
    const timer = setTimeout(fallback, STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [engine, fallback, readyEngine]);

  const shared = { ...props, onFatalError: fallback, onReady: ready };
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
