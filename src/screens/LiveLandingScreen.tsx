import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { EmptyState, LoadingSkeleton, PageHeader } from '../components/NexusUI';
import { FocusableCard } from '../components/FocusableCard';
import { Screen } from '../components/Screen';
import { SQLitePlaylistRepository } from '../repositories/SQLitePlaylistRepository';
import { colors, spacing } from '../theme/tokens';
import { useI18n } from '../i18n';
import type { Playlist } from '../types/domain';
const repository = new SQLitePlaylistRepository();
export function LiveLandingScreen() {
  const { tx } = useI18n();
  const { width } = useWindowDimensions(); const compact = !Platform.isTV && width < 600; const columns = width >= 700 ? 2 : 1;
  const router = useRouter(); const [sources, setSources] = useState<Playlist[]>([]); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { repository.list().then(setSources).finally(() => setLoading(false)); }, []));
  return <Screen navigation><View style={[styles.container, compact && styles.containerCompact]}><PageHeader eyebrow={tx('DIRECT', 'LIVE')} title="Live TV" subtitle={tx('Choisissez une source pour parcourir ses catégories et ses chaînes.', 'Choose a source to browse its categories and channels.')} />{loading ? <LoadingSkeleton /> : sources.length === 0 ? <EmptyState title={tx('Aucune chaîne disponible', 'No channels available')} detail={tx('Ajoutez une source M3U ou Xtream pour accéder au direct.', 'Add an M3U or Xtream source to access live TV.')} /> : <FlatList columnWrapperStyle={columns > 1 ? styles.row : undefined} contentContainerStyle={styles.list} data={sources} key={`sources-${columns}`} keyExtractor={(x) => x.id} numColumns={columns} renderItem={({ item, index }) => <FocusableCard autoFocus={index === 0} onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: item.id } })} style={styles.source}><Text style={styles.name}>{item.name}</Text><Text style={styles.count}>{tx(`${item.channelCount} chaînes`, `${item.channelCount} channels`)}</Text><Text style={styles.status}>{item.syncStatus === 'ready' ? tx('● PRÊTE', '● READY') : item.syncStatus.toUpperCase()}</Text></FocusableCard>} />}</View></Screen>;
}
const styles = StyleSheet.create({ container: { flex: 1, gap: spacing.xl, padding: spacing.xl }, containerCompact: { gap: spacing.lg, padding: 20 }, list: { gap: spacing.md, paddingBottom: 96 }, row: { gap: spacing.md }, source: { flex: 1, minHeight: 126 }, name: { color: colors.text, fontSize: 20, fontWeight: '800' }, count: { color: colors.textMuted, fontSize: 15, marginTop: spacing.sm }, status: { color: colors.success, fontSize: 12, fontWeight: '900', letterSpacing: 1.4, marginTop: spacing.lg } });
