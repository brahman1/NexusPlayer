import { getDatabase } from '../storage/database';
import type { Channel, Movie, Series } from '../types/domain';

type ChannelRow = { id: string; playlist_id: string; category_id: string | null; name: string; display_name: string; stream_url: string; tvg_id: string | null; tvg_name: string | null; logo_url: string | null; language: string | null; country: string | null; is_favorite: number; last_watched_at: string | null };
type MovieRow = { id: string; playlist_id: string; category_id: string | null; name: string; stream_url: string; poster_url: string | null; plot: string | null; release_year: number | null; is_favorite: number };
type SeriesRow = { id: string; playlist_id: string; category_id: string | null; name: string; poster_url: string | null; plot: string | null; is_favorite: number };
export type GuideItem = { channelId: string; channelName: string; logoUrl: string | null; title: string; startsAt: string; endsAt: string };
export type SearchResult = { id: string; kind: 'channel' | 'programme' | 'movie' | 'series'; title: string; subtitle: string | null };

const channel = (row: ChannelRow): Channel => ({ id: row.id, playlistId: row.playlist_id, categoryId: row.category_id, name: row.name, displayName: row.display_name || row.name, streamUrl: row.stream_url, tvgId: row.tvg_id, tvgName: row.tvg_name, logoUrl: row.logo_url, language: row.language, country: row.country, isFavorite: row.is_favorite === 1, lastWatchedAt: row.last_watched_at });
const movie = (row: MovieRow): Movie => ({ id: row.id, playlistId: row.playlist_id, categoryId: row.category_id, name: row.name, streamUrl: row.stream_url, posterUrl: row.poster_url, plot: row.plot, releaseYear: row.release_year, isFavorite: row.is_favorite === 1 });
const series = (row: SeriesRow): Series => ({ id: row.id, playlistId: row.playlist_id, categoryId: row.category_id, name: row.name, posterUrl: row.poster_url, plot: row.plot, isFavorite: row.is_favorite === 1 });

export class DiscoveryRepository {
  async recentChannels(limit = 12) { const db = await getDatabase(); return (await db.getAllAsync<ChannelRow>('SELECT * FROM channels WHERE last_watched_at IS NOT NULL ORDER BY last_watched_at DESC LIMIT ?', limit)).map(channel); }
  async favoriteChannels(limit = 24) { const db = await getDatabase(); return (await db.getAllAsync<ChannelRow>('SELECT * FROM channels WHERE is_favorite = 1 ORDER BY sort_name COLLATE NOCASE LIMIT ?', limit)).map(channel); }
  async liveNow(limit = 16) { const db = await getDatabase(); return (await db.getAllAsync<ChannelRow>('SELECT * FROM channels ORDER BY COALESCE(last_watched_at, \'\') DESC, sort_name COLLATE NOCASE LIMIT ?', limit)).map(channel); }
  async movies(limit = 100) { const db = await getDatabase(); return (await db.getAllAsync<MovieRow>('SELECT * FROM movies ORDER BY name COLLATE NOCASE LIMIT ?', limit)).map(movie); }
  async series(limit = 100) { const db = await getDatabase(); return (await db.getAllAsync<SeriesRow>('SELECT * FROM series ORDER BY name COLLATE NOCASE LIMIT ?', limit)).map(series); }
  async favoriteMovies(limit = 100) { const db = await getDatabase(); return (await db.getAllAsync<MovieRow>('SELECT * FROM movies WHERE is_favorite = 1 ORDER BY name COLLATE NOCASE LIMIT ?', limit)).map(movie); }
  async favoriteSeries(limit = 100) { const db = await getDatabase(); return (await db.getAllAsync<SeriesRow>('SELECT * FROM series WHERE is_favorite = 1 ORDER BY name COLLATE NOCASE LIMIT ?', limit)).map(series); }
  async movieById(id: string) { const db = await getDatabase(); const row = await db.getFirstAsync<MovieRow>('SELECT * FROM movies WHERE id = ?', id); return row ? movie(row) : null; }
  async seriesById(id: string) { const db = await getDatabase(); const row = await db.getFirstAsync<SeriesRow>('SELECT * FROM series WHERE id = ?', id); return row ? series(row) : null; }
  async episodes(seriesId: string) { const db = await getDatabase(); return db.getAllAsync<{ id: string; season_number: number; episode_number: number; name: string; duration_seconds: number | null }>('SELECT id, season_number, episode_number, name, duration_seconds FROM episodes WHERE series_id = ? ORDER BY season_number, episode_number', seriesId); }
  async episodeById(id: string) { const db = await getDatabase(); return db.getFirstAsync<{ id: string; name: string; stream_url: string; playlist_id: string; series_name: string; season_number: number; episode_number: number }>('SELECT ep.id, ep.name, ep.stream_url, ep.season_number, ep.episode_number, s.name AS series_name, s.playlist_id FROM episodes ep JOIN series s ON s.id = ep.series_id WHERE ep.id = ?', id); }
  async nextEpisode(id: string) { const db = await getDatabase(); return db.getFirstAsync<{ id: string; name: string }>(`SELECT candidate.id, candidate.name FROM episodes current JOIN episodes candidate ON candidate.series_id = current.series_id WHERE current.id = ? AND (candidate.season_number > current.season_number OR (candidate.season_number = current.season_number AND candidate.episode_number > current.episode_number)) ORDER BY candidate.season_number, candidate.episode_number LIMIT 1`, id); }
  async setMediaFavorite(kind: 'movie' | 'series', id: string, favorite: boolean) { const db = await getDatabase(); await db.runAsync(`UPDATE ${kind === 'movie' ? 'movies' : 'series'} SET is_favorite = ? WHERE id = ?`, favorite ? 1 : 0, id); }
  async guideNow(limit = 100) {
    const db = await getDatabase(); const now = new Date().toISOString();
    return db.getAllAsync<GuideItem>(`SELECT ch.id AS channelId, ch.display_name AS channelName, ch.logo_url AS logoUrl, ep.title, ep.starts_at AS startsAt, ep.ends_at AS endsAt FROM epg_programmes ep JOIN channels ch ON ch.playlist_id = ep.playlist_id AND (ch.tvg_id = ep.channel_tvg_id OR ch.tvg_name = ep.channel_tvg_id OR ch.name = ep.channel_tvg_id) WHERE ep.starts_at <= ? AND ep.ends_at > ? ORDER BY ch.sort_name COLLATE NOCASE LIMIT ?`, now, now, limit);
  }
  async search(query: string): Promise<SearchResult[]> {
    const term = `%${query.replace(/[\\%_]/g, '\\$&')}%`; const db = await getDatabase();
    const [channels, programmes, movies, series] = await Promise.all([
      db.getAllAsync<{ id: string; title: string }>(`SELECT id, display_name AS title FROM channels WHERE name LIKE ? ESCAPE '\\' OR display_name LIKE ? ESCAPE '\\' ORDER BY sort_name COLLATE NOCASE LIMIT 20`, term, term),
      db.getAllAsync<{ id: string; title: string; subtitle: string }>(`SELECT id, title, channel_tvg_id AS subtitle FROM epg_programmes WHERE title LIKE ? ESCAPE '\\' ORDER BY starts_at LIMIT 20`, term),
      db.getAllAsync<{ id: string; title: string; subtitle: string | null }>(`SELECT id, name AS title, plot AS subtitle FROM movies WHERE name LIKE ? ESCAPE '\\' ORDER BY name COLLATE NOCASE LIMIT 20`, term),
      db.getAllAsync<{ id: string; title: string; subtitle: string | null }>(`SELECT id, name AS title, plot AS subtitle FROM series WHERE name LIKE ? ESCAPE '\\' ORDER BY name COLLATE NOCASE LIMIT 20`, term),
    ]);
    return [...channels.map((x) => ({ ...x, subtitle: 'Chaîne en direct', kind: 'channel' as const })), ...programmes.map((x) => ({ ...x, kind: 'programme' as const })), ...movies.map((x) => ({ ...x, kind: 'movie' as const })), ...series.map((x) => ({ ...x, kind: 'series' as const }))];
  }
}
