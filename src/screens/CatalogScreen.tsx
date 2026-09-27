import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { MediaPoster } from '../components/MediaCards';
import { EmptyState, LoadingSkeleton, PageHeader } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { DiscoveryRepository } from '../repositories/DiscoveryRepository';
import { layout, spacing } from '../theme/tokens';
import type { Movie, Series } from '../types/domain';
const repository = new DiscoveryRepository();
export function CatalogScreen({ kind }: { kind: 'movie' | 'series' }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 600;
  const availableWidth = width - (Platform.isTV ? layout.tvSidebarCollapsed : 0);
  const columns = Platform.isTV ? 5 : width >= 1000 ? 4 : width >= 700 ? 3 : 2;
  const gutter = compact ? 20 : 32;
  const cardWidth = Math.floor((availableWidth - gutter * 2 - spacing.sm * (columns - 1)) / columns);
  const [items, setItems] = useState<(Movie | Series)[]>([]); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { (kind === 'movie' ? repository.movies() : repository.series()).then(setItems).finally(() => setLoading(false)); }, [kind]));
  return <Screen navigation><View style={[styles.container, compact && styles.containerCompact]}><PageHeader eyebrow="CATALOGUE" title={kind === 'movie' ? 'Films' : 'Séries'} subtitle={`${items.length} titres disponibles dans vos sources`} />{loading ? <LoadingSkeleton /> : items.length === 0 ? <EmptyState icon={kind === 'movie' ? 'film-outline' : 'albums-outline'} title={`Aucun${kind === 'movie' ? ' film' : 'e série'}`} detail="Connectez une source Xtream contenant ce type de catalogue." /> : <FlatList columnWrapperStyle={styles.row} contentContainerStyle={styles.grid} data={items} key={`catalog-${columns}`} keyExtractor={(x) => x.id} numColumns={columns} renderItem={({ item }) => <MediaPoster imageUrl={'posterUrl' in item ? item.posterUrl : null} meta={'releaseYear' in item ? item.releaseYear?.toString() : 'Série'} onPress={() => router.push({ pathname: '/media/[kind]/[id]', params: { kind, id: item.id } })} title={item.name} width={cardWidth} />} />}</View></Screen>;
}
const styles = StyleSheet.create({ container: { flex: 1, gap: spacing.xl, padding: spacing.xl }, containerCompact: { gap: spacing.lg, padding: 20 }, grid: { gap: spacing.sm, paddingBottom: 96 }, row: { gap: spacing.sm } });
