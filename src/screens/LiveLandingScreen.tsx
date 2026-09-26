import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { EmptyState, LoadingSkeleton, PageHeader } from '../components/NexusUI';
import { FocusableCard } from '../components/FocusableCard';
import { Screen } from '../components/Screen';
import { SQLitePlaylistRepository } from '../repositories/SQLitePlaylistRepository';
import { colors, spacing } from '../theme/tokens';
import type { Playlist } from '../types/domain';
const repository = new SQLitePlaylistRepository();
export function LiveLandingScreen() {
  const router = useRouter(); const [sources, setSources] = useState<Playlist[]>([]); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { repository.list().then(setSources).finally(() => setLoading(false)); }, []));
  return <Screen navigation><View style={styles.container}><PageHeader eyebrow="DIRECT" title="Live TV" subtitle="Choisissez une source pour parcourir ses catégories et ses chaînes." />{loading ? <LoadingSkeleton /> : sources.length === 0 ? <EmptyState title="Aucune chaîne disponible" detail="Ajoutez une source M3U ou Xtream pour accéder au direct." /> : <FlatList contentContainerStyle={styles.list} data={sources} keyExtractor={(x) => x.id} numColumns={2} renderItem={({ item, index }) => <FocusableCard autoFocus={index === 0} onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: item.id } })} style={styles.source}><Text style={styles.name}>{item.name}</Text><Text style={styles.count}>{item.channelCount} chaînes</Text><Text style={styles.status}>{item.syncStatus === 'ready' ? '● PRÊTE' : item.syncStatus.toUpperCase()}</Text></FocusableCard>} />}</View></Screen>;
}
const styles = StyleSheet.create({ container: { flex: 1, gap: spacing.xl, padding: spacing.xl }, list: { gap: spacing.md }, source: { flex: 1, margin: spacing.sm, minHeight: 160 }, name: { color: colors.text, fontSize: 22, fontWeight: '800' }, count: { color: colors.textMuted, fontSize: 15, marginTop: spacing.sm }, status: { color: colors.success, fontSize: 12, fontWeight: '900', letterSpacing: 1.4, marginTop: spacing.lg } });
