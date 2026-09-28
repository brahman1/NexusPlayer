import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { FocusableCard } from './FocusableCard';
import type { Channel } from '../types/domain';
import { useI18n } from '../i18n';

export function ChannelTile({ channel, autoFocus = false, onPress }: { channel: Channel; autoFocus?: boolean; onPress: () => void }) {
  const { tx } = useI18n();
  const { width } = useWindowDimensions();
  const [failed, setFailed] = useState(false);
  const tileWidth = Platform.isTV ? 240 : width < 420 ? 184 : 220;
  return <FocusableCard autoFocus={autoFocus} onPress={onPress} style={[styles.channel, { width: tileWidth }]}><View style={styles.logo}>{channel.logoUrl && !failed ? <Image onError={() => setFailed(true)} resizeMode="contain" source={{ uri: channel.logoUrl }} style={styles.logoImage} /> : <Text style={styles.letter}>{channel.displayName.slice(0, 1).toUpperCase()}</Text>}</View><Text numberOfLines={2} style={styles.channelName}>{channel.displayName}</Text><View style={styles.liveRow}><View style={styles.liveDot} /><Text style={styles.meta}>{tx('EN DIRECT', 'LIVE')}</Text></View></FocusableCard>;
}

export function MediaPoster({ title, imageUrl, meta, onPress, progress, width = 176 }: { title: string; imageUrl: string | null; meta?: string | null; onPress?: () => void; progress?: number; width?: number }) {
  const [failed, setFailed] = useState(false);
  return <FocusableCard onPress={onPress} style={[styles.poster, { width }]}>{imageUrl && !failed ? <Image onError={() => setFailed(true)} resizeMode="cover" source={{ uri: imageUrl }} style={styles.posterImage} /> : <View style={[styles.posterImage, styles.posterFallback]}><Ionicons color={colors.textMuted} name="film-outline" size={36} /></View>}{progress !== undefined && <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(0, Math.min(1, progress)) * 100}%` }]} /></View>}<Text numberOfLines={2} style={styles.posterTitle}>{title}</Text>{meta && <Text numberOfLines={1} style={styles.posterMeta}>{meta}</Text>}</FocusableCard>;
}

const styles = StyleSheet.create({
  channel: { minHeight: 168 }, logo: { alignItems: 'center', backgroundColor: colors.background, borderRadius: radii.md, height: 62, justifyContent: 'center', width: 88 }, logoImage: { height: 54, width: 80 }, letter: { color: colors.accentStrong, fontSize: 24, fontWeight: '900' }, channelName: { color: colors.text, fontSize: 17, fontWeight: '800', lineHeight: 21, marginTop: spacing.md, minHeight: 42 }, liveRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm }, liveDot: { backgroundColor: colors.danger, borderRadius: 4, height: 7, width: 7 }, meta: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  poster: { padding: spacing.sm }, posterImage: { aspectRatio: 0.72, backgroundColor: colors.background, borderRadius: radii.md, width: '100%' }, posterFallback: { alignItems: 'center', justifyContent: 'center' }, progressTrack: { backgroundColor: colors.border, height: 5, marginTop: spacing.xs, overflow: 'hidden' }, progressFill: { backgroundColor: colors.accentStrong, height: '100%' }, posterTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: spacing.sm }, posterMeta: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
});
