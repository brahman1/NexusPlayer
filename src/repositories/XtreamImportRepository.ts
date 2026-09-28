import { getDatabase } from '../storage/database';
import { translate } from '../i18n';
import { stableId } from '../utils/ids';
import { deduplicateXtreamCatalog, type XtreamCatalog } from '../services/xtreamClient';
import { categoryDisplayName, categorySortKey, channelDisplayName, inferChannelMetadata, mediaDisplayName, naturalSortKey } from '../services/channelPresentation';

export async function storeXtreamCatalog(playlistId: string, name: string, endpoint: string, sourceFingerprint: string, catalog: XtreamCatalog) {
  const cleanCatalog = deduplicateXtreamCatalog(catalog);
  const database = await getDatabase();
  const duplicate = await database.getFirstAsync<{ name: string }>('SELECT name FROM playlists WHERE source_fingerprint = ?', sourceFingerprint);
  if (duplicate) throw new Error(translate(`Cette source existe déjà dans « ${duplicate.name} ».`, `This source already exists in "${duplicate.name}".`));
  const category = await database.prepareAsync(`INSERT INTO categories (id, playlist_id, name, display_name, sort_name, kind, position) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const channel = await database.prepareAsync(`INSERT INTO channels (id, playlist_id, category_id, name, display_name, sort_name, stream_url, tvg_id, tvg_name, logo_url, language, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const movie = await database.prepareAsync(`INSERT INTO movies (id, playlist_id, category_id, name, display_name, sort_name, stream_url, poster_url, plot, release_year, external_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const series = await database.prepareAsync(`INSERT INTO series (id, playlist_id, category_id, name, display_name, sort_name, poster_url, plot, external_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const categoryIds = new Map<string, string>();
  const categoryNames = new Map<string, string>();
  const addCategories = async (items: { category_id: string; category_name: string }[], kind: 'live' | 'movie' | 'series') => {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]!; const id = stableId('category', `${playlistId}:${kind}:${item.category_id}`);
      const rawName = item.category_name || 'Sans catégorie';
      categoryIds.set(`${kind}:${item.category_id}`, id); categoryNames.set(`${kind}:${item.category_id}`, rawName); await category.executeAsync(id, playlistId, rawName, categoryDisplayName(rawName, kind), categorySortKey(rawName, kind), kind, index);
    }
  };
  try {
    await database.withTransactionAsync(async () => {
      const now = new Date().toISOString();
      await database.runAsync(`INSERT INTO playlists (id, name, source_kind, endpoint, source_fingerprint, created_at, updated_at, last_synced_at, channel_count, sync_status) VALUES (?, ?, 'xtream', ?, ?, ?, ?, ?, ?, 'ready')`, playlistId, name, endpoint, sourceFingerprint, now, now, now, cleanCatalog.liveStreams.length);
      await addCategories(cleanCatalog.liveCategories, 'live'); await addCategories(cleanCatalog.vodCategories, 'movie'); await addCategories(cleanCatalog.seriesCategories, 'series');
      for (const item of cleanCatalog.liveStreams) {
        const displayName = channelDisplayName(item.name);
        const rawCategory = categoryNames.get(`live:${item.category_id}`) ?? '';
        const metadata = inferChannelMetadata(item.name, rawCategory);
        await channel.executeAsync(stableId('channel', `${playlistId}:live:${item.stream_id}`), playlistId, categoryIds.get(`live:${item.category_id}`) ?? null, item.name, displayName, naturalSortKey(displayName), `xtream://live/${item.stream_id}.${item.container_extension || 'ts'}`, item.epg_channel_id || null, item.name, item.stream_icon || null, metadata.language, metadata.country);
      }
      for (const item of cleanCatalog.vodStreams) {
        const displayName = mediaDisplayName(item.name);
        await movie.executeAsync(stableId('movie', `${playlistId}:${item.stream_id}`), playlistId, categoryIds.get(`movie:${item.category_id}`) ?? null, item.name, displayName, naturalSortKey(displayName), `xtream://movie/${item.stream_id}.${item.container_extension || 'mp4'}`, item.stream_icon || null, item.plot || null, Number.parseInt(item.releaseDate?.slice(0, 4) || '', 10) || null, String(item.stream_id));
      }
      for (const item of cleanCatalog.series) {
        const displayName = mediaDisplayName(item.name);
        await series.executeAsync(stableId('series', `${playlistId}:${item.series_id}`), playlistId, categoryIds.get(`series:${item.category_id}`) ?? null, item.name, displayName, naturalSortKey(displayName), item.cover || null, item.plot || null, String(item.series_id));
      }
    });
  } finally { await category.finalizeAsync(); await channel.finalizeAsync(); await movie.finalizeAsync(); await series.finalizeAsync(); }
  return { channels: cleanCatalog.liveStreams.length, movies: cleanCatalog.vodStreams.length, series: cleanCatalog.series.length };
}
