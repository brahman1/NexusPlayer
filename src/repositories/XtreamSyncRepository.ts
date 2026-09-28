import { getDatabase } from '../storage/database';
import { deduplicateXtreamCatalog, type XtreamCatalog, type XtreamEpisode } from '../services/xtreamClient';
import { createEntitySyncReport, type SyncEntity, type XtreamSyncReport } from '../services/xtreamSync';
import { categoryDisplayName, categorySortKey, channelDisplayName, episodeDisplayName, mediaDisplayName, naturalSortKey } from '../services/channelPresentation';
import { stableId } from '../utils/ids';

type CategoryRecord = SyncEntity & { name: string; kind: 'live' | 'movie' | 'series'; position: number };
type ChannelRecord = SyncEntity & { categoryId: string | null; name: string; marker: string; tvgId: string | null; logoUrl: string | null };
type MovieRecord = SyncEntity & { categoryId: string | null; name: string; marker: string; posterUrl: string | null; plot: string | null; releaseYear: number | null; externalId: string };
type SeriesRecord = SyncEntity & { categoryId: string | null; name: string; posterUrl: string | null; plot: string | null; externalId: string };
type EpisodeRecord = SyncEntity & { seriesId: string; season: number; episode: number; name: string; marker: string; duration: number | null };

const signature = (...values: unknown[]) => JSON.stringify(values);

export async function syncXtreamCatalog(playlistId: string, catalog: XtreamCatalog, episodeCatalogs: Map<string, XtreamEpisode[]>): Promise<XtreamSyncReport> {
  const clean = deduplicateXtreamCatalog(catalog);
  const database = await getDatabase();
  const categories: CategoryRecord[] = [];
  const categoryIds = new Map<string, string>();
  const addCategories = (items: { category_id: string; category_name: string }[], kind: CategoryRecord['kind']) => items.forEach((item, position) => {
    const id = stableId('category', `${playlistId}:${kind}:${item.category_id}`);
    const name = item.category_name || 'Sans catégorie';
    categoryIds.set(`${kind}:${item.category_id}`, id);
    categories.push({ id, name, kind, position, signature: signature(name, kind, position) });
  });
  addCategories(clean.liveCategories, 'live');
  addCategories(clean.vodCategories, 'movie');
  addCategories(clean.seriesCategories, 'series');

  const channels: ChannelRecord[] = clean.liveStreams.map((item) => {
    const categoryId = categoryIds.get(`live:${item.category_id}`) ?? null;
    const marker = `xtream://live/${item.stream_id}.${item.container_extension || 'ts'}`;
    const tvgId = item.epg_channel_id || null;
    const logoUrl = item.stream_icon || null;
    return { id: stableId('channel', `${playlistId}:live:${item.stream_id}`), categoryId, name: item.name, marker, tvgId, logoUrl, signature: signature(categoryId, item.name, marker, tvgId, item.name, logoUrl) };
  });
  const movies: MovieRecord[] = clean.vodStreams.map((item) => {
    const categoryId = categoryIds.get(`movie:${item.category_id}`) ?? null;
    const marker = `xtream://movie/${item.stream_id}.${item.container_extension || 'mp4'}`;
    const posterUrl = item.stream_icon || null;
    const plot = item.plot || null;
    const releaseYear = Number.parseInt(item.releaseDate?.slice(0, 4) || '', 10) || null;
    return { id: stableId('movie', `${playlistId}:${item.stream_id}`), categoryId, name: item.name, marker, posterUrl, plot, releaseYear, externalId: String(item.stream_id), signature: signature(categoryId, item.name, marker, posterUrl, plot, releaseYear, String(item.stream_id)) };
  });
  const series: SeriesRecord[] = clean.series.map((item) => {
    const categoryId = categoryIds.get(`series:${item.category_id}`) ?? null;
    const posterUrl = item.cover || null;
    const plot = item.plot || null;
    return { id: stableId('series', `${playlistId}:${item.series_id}`), categoryId, name: item.name, posterUrl, plot, externalId: String(item.series_id), signature: signature(categoryId, item.name, posterUrl, plot, String(item.series_id)) };
  });
  const episodes: EpisodeRecord[] = [...episodeCatalogs.entries()].flatMap(([seriesId, items]) => items.map((item) => {
    const marker = `xtream://series/${item.id}.${item.extension}`;
    const id = stableId('episode', `${seriesId}:${item.id}`);
    return { id, seriesId, season: item.season, episode: item.episode, name: item.name, marker, duration: item.durationSeconds, signature: signature(seriesId, item.season, item.episode, item.name, marker, item.durationSeconds) };
  }));

  const [existingCategories, existingChannels, existingMovies, existingSeries, existingEpisodes] = await Promise.all([
    database.getAllAsync<{ id: string; name: string; kind: string; position: number }>('SELECT id, name, kind, position FROM categories WHERE playlist_id = ?', playlistId),
    database.getAllAsync<{ id: string; category_id: string | null; name: string; stream_url: string; tvg_id: string | null; tvg_name: string | null; logo_url: string | null }>('SELECT id, category_id, name, stream_url, tvg_id, tvg_name, logo_url FROM channels WHERE playlist_id = ?', playlistId),
    database.getAllAsync<{ id: string; category_id: string | null; name: string; stream_url: string; poster_url: string | null; plot: string | null; release_year: number | null; external_id: string | null }>('SELECT id, category_id, name, stream_url, poster_url, plot, release_year, external_id FROM movies WHERE playlist_id = ?', playlistId),
    database.getAllAsync<{ id: string; category_id: string | null; name: string; poster_url: string | null; plot: string | null; external_id: string | null }>('SELECT id, category_id, name, poster_url, plot, external_id FROM series WHERE playlist_id = ?', playlistId),
    database.getAllAsync<{ id: string; series_id: string; season_number: number; episode_number: number; name: string; stream_url: string; duration_seconds: number | null }>('SELECT ep.* FROM episodes ep JOIN series s ON s.id = ep.series_id WHERE s.playlist_id = ?', playlistId),
  ]);
  const snapshots = {
    categories: existingCategories.map((x) => ({ id: x.id, signature: signature(x.name, x.kind, x.position) })),
    channels: existingChannels.map((x) => ({ id: x.id, signature: signature(x.category_id, x.name, x.stream_url, x.tvg_id, x.tvg_name, x.logo_url) })),
    movies: existingMovies.map((x) => ({ id: x.id, signature: signature(x.category_id, x.name, x.stream_url, x.poster_url, x.plot, x.release_year, x.external_id) })),
    series: existingSeries.map((x) => ({ id: x.id, signature: signature(x.category_id, x.name, x.poster_url, x.plot, x.external_id) })),
    episodes: existingEpisodes.map((x) => ({ id: x.id, signature: signature(x.series_id, x.season_number, x.episode_number, x.name, x.stream_url, x.duration_seconds) })),
  };
  const report: XtreamSyncReport = {
    categories: createEntitySyncReport(snapshots.categories, categories),
    channels: createEntitySyncReport(snapshots.channels, channels),
    movies: createEntitySyncReport(snapshots.movies, movies),
    series: createEntitySyncReport(snapshots.series, series),
    episodes: createEntitySyncReport(snapshots.episodes, episodes),
  };
  const incomingEpisodeIds = new Set(episodes.map((item) => item.id));

  const statements = await Promise.all([
    database.prepareAsync(`INSERT INTO categories (id, playlist_id, name, display_name, sort_name, kind, position) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, display_name=excluded.display_name, sort_name=excluded.sort_name, kind=excluded.kind, position=excluded.position`),
    database.prepareAsync(`INSERT INTO channels (id, playlist_id, category_id, name, display_name, sort_name, stream_url, tvg_id, tvg_name, logo_url, language, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL) ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id, name=excluded.name, display_name=excluded.display_name, sort_name=excluded.sort_name, stream_url=excluded.stream_url, tvg_id=excluded.tvg_id, tvg_name=excluded.tvg_name, logo_url=excluded.logo_url`),
    database.prepareAsync(`INSERT INTO movies (id, playlist_id, category_id, name, display_name, sort_name, stream_url, poster_url, plot, release_year, external_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id, name=excluded.name, display_name=excluded.display_name, sort_name=excluded.sort_name, stream_url=excluded.stream_url, poster_url=excluded.poster_url, plot=excluded.plot, release_year=excluded.release_year, external_id=excluded.external_id`),
    database.prepareAsync(`INSERT INTO series (id, playlist_id, category_id, name, display_name, sort_name, poster_url, plot, external_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id, name=excluded.name, display_name=excluded.display_name, sort_name=excluded.sort_name, poster_url=excluded.poster_url, plot=excluded.plot, external_id=excluded.external_id`),
    database.prepareAsync(`INSERT INTO episodes (id, series_id, season_number, episode_number, name, display_name, sort_name, stream_url, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET season_number=excluded.season_number, episode_number=excluded.episode_number, name=excluded.name, display_name=excluded.display_name, sort_name=excluded.sort_name, stream_url=excluded.stream_url, duration_seconds=excluded.duration_seconds`),
  ]);
  try {
    await database.withTransactionAsync(async () => {
      for (const item of categories) await statements[0]!.executeAsync(item.id, playlistId, item.name, categoryDisplayName(item.name), categorySortKey(item.name), item.kind, item.position);
      for (const item of channels) {
        const displayName = channelDisplayName(item.name);
        await statements[1]!.executeAsync(item.id, playlistId, item.categoryId, item.name, displayName, naturalSortKey(displayName), item.marker, item.tvgId, item.name, item.logoUrl);
      }
      for (const item of movies) {
        const displayName = mediaDisplayName(item.name);
        await statements[2]!.executeAsync(item.id, playlistId, item.categoryId, item.name, displayName, naturalSortKey(displayName), item.marker, item.posterUrl, item.plot, item.releaseYear, item.externalId);
      }
      for (const item of series) {
        const displayName = mediaDisplayName(item.name);
        await statements[3]!.executeAsync(item.id, playlistId, item.categoryId, item.name, displayName, naturalSortKey(displayName), item.posterUrl, item.plot, item.externalId);
      }
      for (const item of episodes) {
        const displayName = episodeDisplayName(item.name, item.season, item.episode);
        await statements[4]!.executeAsync(item.id, item.seriesId, item.season, item.episode, item.name, displayName, naturalSortKey(displayName), item.marker, item.duration);
      }
      await deleteMissing(database, 'channels', playlistId, snapshots.channels, new Set(channels.map((x) => x.id)));
      await deleteMissing(database, 'movies', playlistId, snapshots.movies, new Set(movies.map((x) => x.id)));
      await deleteMissing(database, 'series', playlistId, snapshots.series, new Set(series.map((x) => x.id)));
      for (const item of snapshots.episodes) if (!incomingEpisodeIds.has(item.id)) await database.runAsync('DELETE FROM episodes WHERE id = ?', item.id);
      await deleteMissing(database, 'categories', playlistId, snapshots.categories, new Set(categories.map((x) => x.id)));
      const now = new Date().toISOString();
      await database.runAsync(`UPDATE playlists SET updated_at = ?, last_synced_at = ?, channel_count = ?, sync_status = 'ready', last_error = NULL WHERE id = ?`, now, now, channels.length, playlistId);
    });
  } finally {
    await Promise.all(statements.map((statement) => statement.finalizeAsync()));
  }
  return report;
}

async function deleteMissing(database: Awaited<ReturnType<typeof getDatabase>>, table: 'categories' | 'channels' | 'movies' | 'series', playlistId: string, existing: SyncEntity[], incomingIds: Set<string>) {
  for (const item of existing) if (!incomingIds.has(item.id)) await database.runAsync(`DELETE FROM ${table} WHERE id = ? AND playlist_id = ?`, item.id, playlistId);
}
