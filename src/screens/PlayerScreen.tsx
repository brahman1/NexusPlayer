import { useEvent } from 'expo';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  useTVEventHandler,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';

import { FocusableCard } from '../components/FocusableCard';
import { Screen } from '../components/Screen';
import { SQLiteChannelRepository } from '../repositories/SQLiteChannelRepository';
import { EpgRepository } from '../repositories/EpgRepository';
import { explainPlaybackError } from '../services/playerDiagnostics';
import { resolveXtreamChannel } from '../services/xtreamImportService';
import { colors, radii, spacing } from '../theme/tokens';
import type { Channel } from '../types/domain';

const repository = new SQLiteChannelRepository();
const epgRepository = new EpgRepository();

function sourceForChannel(channel: Channel): VideoSource {
  return channel.streamUrl.toLowerCase().includes('.m3u8')
    ? { uri: channel.streamUrl, contentType: 'hls' }
    : { uri: channel.streamUrl };
}

function PlayerAction({ autoFocus = false, label, onPress }: { autoFocus?: boolean; label: string; onPress: () => void }) {
  return (
    <FocusableCard accessibilityRole="button" autoFocus={autoFocus} onPress={onPress} style={styles.action}>
      <Text style={styles.actionLabel}>{label}</Text>
    </FocusableCard>
  );
}

function PlayerSurface({ channel, onRetry }: { channel: Channel; onRetry: () => void }) {
  const player = useVideoPlayer(sourceForChannel(channel), (instance) => {
    instance.bufferOptions = {
      maxBufferBytes: 0,
      minBufferForPlayback: 1.5,
      preferredForwardBufferDuration: 6,
    };
    instance.play();
  });
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });
  const problem = status === 'error' ? explainPlaybackError(error?.message) : null;

  return (
    <View style={styles.playerBlock}>
      <View style={styles.videoFrame}>
        <VideoView contentFit="contain" nativeControls={!Platform.isTV} player={player} style={styles.video} />
        {status === 'loading' && (
          <View pointerEvents="none" style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.accentStrong} size="large" />
            <Text style={styles.loadingText}>Connexion au flux…</Text>
          </View>
        )}
      </View>
      {problem && (
        <View accessibilityRole="alert" style={styles.problem}>
          <Text style={styles.problemTitle}>{problem.title}</Text>
          <Text style={styles.problemDetail}>{problem.detail}</Text>
          <PlayerAction label="Réessayer" onPress={onRetry} />
        </View>
      )}
    </View>
  );
}

export function PlayerScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [programmes, setProgrammes] = useState<Awaited<ReturnType<EpgRepository['nowNext']>>>([]);
  const [overlay, setOverlay] = useState<'compact' | 'guide' | 'settings' | null>('compact');

  useEffect(() => {
    if (!channelId) return;
    repository.findById(channelId)
      .then((found) => {
        if (!found) throw new Error('Chaîne introuvable.');
        return resolveXtreamChannel(found).then((resolved) => {
          setChannel(resolved);
          return repository.markWatched(found.id);
        });
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Lecture impossible.'));
  }, [channelId]);

  useEffect(() => {
    if (!channel) return;
    epgRepository.nowNext(channel.playlistId, channel.tvgId, channel.tvgName, channel.name)
      .then(setProgrammes)
      .catch(() => setProgrammes([]));
  }, [channel]);

  const changeChannel = useCallback(async (direction: 'previous' | 'next') => {
    if (!channel || switching) return;
    setSwitching(true);
    setError(null);
    try {
      const adjacent = await repository.findAdjacent(channel.id, direction);
      if (!adjacent) throw new Error('Aucune autre chaîne disponible.');
      setChannel(await resolveXtreamChannel(adjacent));
      setRetryKey(0);
      await repository.markWatched(adjacent.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Changement de chaîne impossible.');
    } finally {
      setSwitching(false);
    }
  }, [channel, switching]);

  useTVEventHandler((event) => {
    if (!Platform.isTV || event.eventKeyAction === 1) return;
    if (event.eventType === 'up') void changeChannel('previous');
    if (event.eventType === 'down') void changeChannel('next');
    if (event.eventType === 'select') setOverlay((current) => current === null ? 'compact' : current === 'compact' ? 'guide' : null);
    if (event.eventType === 'left') setOverlay('guide');
    if (event.eventType === 'right') setOverlay('settings');
  });

  return (
    <Screen>
      <View style={styles.container}>
        {channel ? (
          <PlayerSurface
            channel={channel}
            key={`${channel.id}:${retryKey}`}
            onRetry={() => setRetryKey((current) => current + 1)}
          />
        ) : !error && <ActivityIndicator color={colors.accentStrong} size="large" />}
        {channel && overlay && (
          <View style={styles.details}>
            <View style={styles.channelDetails}>
              <Text numberOfLines={1} style={styles.title}>{channel.name}</Text>
              {programmes[0] && <Text numberOfLines={1} style={styles.now}>Maintenant · {programmes[0].title}</Text>}
              {programmes[1] && <Text numberOfLines={1} style={styles.next}>Ensuite · {programmes[1].title}</Text>}
              <Text style={styles.hint}>D-pad haut/bas : changer de chaîne</Text>
            </View>
            <View style={styles.actions}>
              <PlayerAction autoFocus label="Chaîne précédente" onPress={() => void changeChannel('previous')} />
              <PlayerAction label="Chaîne suivante" onPress={() => void changeChannel('next')} />
              <PlayerAction label="Mini-guide" onPress={() => setOverlay('guide')} />
              <PlayerAction label="Options" onPress={() => setOverlay('settings')} />
            </View>
          </View>
        )}
        {overlay === 'guide' && <View style={styles.panel}><Text style={styles.panelTitle}>Mini-guide</Text>{programmes.length ? programmes.map((item, index) => <View key={item.id} style={styles.programmeRow}><Text style={styles.programmeTime}>{index === 0 ? 'Maintenant' : 'Ensuite'}</Text><Text numberOfLines={2} style={styles.programmeTitle}>{item.title}</Text></View>) : <Text style={styles.next}>Aucun programme disponible pour cette chaîne.</Text>}</View>}
        {overlay === 'settings' && <View style={styles.panel}><Text style={styles.panelTitle}>Options de lecture</Text><View style={styles.optionRow}>{['Audio', 'Sous-titres', 'Qualité auto', 'Format', 'Diagnostic'].map((label) => <PlayerAction key={label} label={label} onPress={() => undefined} />)}</View><Text style={styles.diagnostic}>Les données sensibles de la source restent masquées.</Text></View>}
        {switching && <Text style={styles.switching}>Changement de chaîne…</Text>}
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  playerBlock: { width: '100%' },
  videoFrame: { aspectRatio: 16 / 9, alignSelf: 'center', backgroundColor: '#000', position: 'relative', width: Platform.isTV ? '74%' : '100%' },
  video: { height: '100%', width: '100%' },
  loadingOverlay: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', bottom: 0, gap: spacing.md, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  loadingText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  details: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg, justifyContent: 'space-between', marginTop: spacing.md },
  channelDetails: { flex: 1 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  now: { color: colors.accentStrong, fontSize: 15, fontWeight: '700', marginTop: spacing.xs },
  next: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  actionLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  switching: { color: colors.accentStrong, fontSize: 14, marginTop: spacing.sm },
  problem: { backgroundColor: colors.surfaceRaised, borderColor: colors.danger, borderRadius: radii.md, borderWidth: 1, gap: spacing.sm, marginTop: spacing.md, padding: spacing.md },
  problemTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  problemDetail: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  error: { color: colors.danger, fontSize: 17, marginTop: spacing.md, textAlign: 'center' },
  panel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, marginTop: spacing.md, padding: spacing.lg },
  panelTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  programmeRow: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: spacing.lg, paddingTop: spacing.sm },
  programmeTime: { color: colors.accentStrong, fontSize: 13, fontWeight: '800', width: 90 },
  programmeTitle: { color: colors.text, flex: 1, fontSize: 16, fontWeight: '700' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  diagnostic: { color: colors.textMuted, fontSize: 12 },
});
