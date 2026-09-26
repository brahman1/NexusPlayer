import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { FocusableCard } from '../components/FocusableCard';
import { EmptyState, FilterChip, LoadingSkeleton, PageHeader } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { DiscoveryRepository, type GuideItem } from '../repositories/DiscoveryRepository';
import { colors, radii, spacing } from '../theme/tokens';

const repository = new DiscoveryRepository();
export function GuideScreen() {
  const router = useRouter();
  const [items, setItems] = useState<GuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('now');
  const [now] = useState(() => Date.now());
  useFocusEffect(useCallback(() => { repository.guideNow().then(setItems).finally(() => setLoading(false)); }, []));
  return <Screen navigation><View style={styles.container}>
    <PageHeader eyebrow="PROGRAMMES" title="Guide TV" subtitle="Ce qui est diffusé maintenant sur vos chaînes." />
    <View style={styles.filters}><FilterChip active={view === 'now'} label="Maintenant" onPress={() => setView('now')} /><FilterChip active={view === 'grid'} label="Grille" onPress={() => setView('grid')} /><FilterChip active={view === 'programme'} label="Programme" onPress={() => setView('programme')} /></View>
    {loading ? <LoadingSkeleton rows={6} /> : items.length === 0 ? <EmptyState icon="calendar-outline" title="Guide indisponible" detail="Associez une source XMLTV contenant les identifiants de vos chaînes pour afficher les programmes." /> : <FlatList contentContainerStyle={styles.list} data={items} keyExtractor={(x) => `${x.channelId}:${x.startsAt}`} renderItem={({ item, index }) => {
      const duration = new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime();
      const progress = Math.max(0, Math.min(1, (now - new Date(item.startsAt).getTime()) / duration));
      return <FocusableCard autoFocus={index === 0} onPress={() => router.push({ pathname: '/player/[channelId]', params: { channelId: item.channelId } })} style={styles.row}><View style={styles.time}><Text style={styles.timeText}>{new Date(item.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text><Text style={styles.channel}>{item.channelName}</Text></View><View style={styles.program}><Text numberOfLines={1} style={styles.title}>{item.title}</Text><View style={styles.track}><View style={[styles.progress, { width: `${progress * 100}%` }]} /></View></View><Text style={styles.live}>● DIRECT</Text></FocusableCard>;
    }} />}
  </View></Screen>;
}
const styles = StyleSheet.create({ container: { flex: 1, gap: spacing.lg, padding: spacing.xl }, filters: { flexDirection: 'row', gap: spacing.sm }, list: { gap: spacing.sm, paddingBottom: spacing.xl }, row: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg, minHeight: 86 }, time: { width: 180 }, timeText: { color: colors.text, fontSize: 16, fontWeight: '800' }, channel: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs }, program: { flex: 1 }, title: { color: colors.text, fontSize: 18, fontWeight: '800' }, track: { backgroundColor: colors.border, borderRadius: radii.pill, height: 5, marginTop: spacing.sm, overflow: 'hidden' }, progress: { backgroundColor: colors.accentStrong, height: '100%' }, live: { color: colors.danger, fontSize: 12, fontWeight: '900' } });
