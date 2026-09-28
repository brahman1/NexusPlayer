import { getDatabase } from '../storage/database';
import { translate } from '../i18n';
import type { Channel, Movie, Series } from '../types/domain';
import { inferChannelMetadata, localizedCountryName, localizedLanguageName } from '../services/channelPresentation';
import { categorySearchTerms, parseContentSearchIntent, type ContentThemeId } from '../services/contentTaxonomy';

type ChannelRow = { id: string; playlist_id: string; category_id: string | null; name: string; display_name: string; stream_url: string; tvg_id: string | null; tvg_name: string | null; logo_url: string | null; language: string | null; country: string | null; is_favorite: number; last_watched_at: string | null };
type MovieRow = { id: string; playlist_id: string; category_id: string | null; name: string; display_name: string; stream_url: string; poster_url: string | null; plot: string | null; release_year: number | null; is_favorite: number };
type SeriesRow = { id: string; playlist_id: string; category_id: string | null; name: string; display_name: string; poster_url: string | null; plot: string | null; is_favorite: number };
export type GuideItem = { channelId: string; channelName: string; logoUrl: string | null; title: string; startsAt: string; endsAt: string };
export type SearchResult = { id: string; kind: 'channel' | 'programme' | 'movie' | 'series'; title: string; subtitle: string | null };
export type CatalogCategory = { id: string; name: string };

const channel = (row: ChannelRow): Channel => ({ id: row.id, playlistId: row.playlist_id, categoryId: row.category_id, name: row.name, displayName: row.display_name || row.name, streamUrl: row.stream_url, tvgId: row.tvg_id, tvgName: row.tvg_name, logoUrl: row.logo_url, language: row.language, country: row.country, quality: inferChannelMetadata(row.name, '', row.language, row.country).quality, isFavorite: row.is_favorite === 1, lastWatchedAt: row.last_watched_at });
const movie = (row: MovieRow): Movie => ({ id: row.id, playlistId: row.playlist_id, categoryId: row.category_id, name: row.display_name || row.name, displayName: row.display_name || row.name, streamUrl: row.stream_url, posterUrl: row.poster_url, plot: row.plot, releaseYear: row.release_year, isFavorite: row.is_favorite === 1 });
const series = (row: SeriesRow): Series => ({ id: row.id, playlistId: row.playlist_id, categoryId: row.category_id, name: row.display_name || row.name, displayName: row.display_name || row.name, posterUrl: row.poster_url, plot: row.plot, isFavorite: row.is_favorite === 1 });

export class DiscoveryRepository {
  async recentChannels(limit = 12) { const db = await getDatabase(); return (await db.getAllAsync<ChannelRow>('SELECT * FROM channels WHERE last_watched_at IS NOT NULL ORDER BY last_watched_at DESC LIMIT ?', limit)).map(channel); }
  async favoriteChannels(limit = 24) { const db = await getDatabase(); return (await db.getAllAsync<ChannelRow>('SELECT * FROM channels WHERE is_favorite = 1 ORDER BY sort_name COLLATE NOCASE LIMIT ?', limit)).map(channel); }
  async liveNow(limit = 16) { const db = await getDatabase(); return (await db.getAllAsync<ChannelRow>('SELECT * FROM channels ORDER BY COALESCE(last_watched_at, \'\') DESC, sort_name COLLATE NOCASE LIMIT ?', limit)).map(channel); }
  async personalizedChannels(countries: string[], languages: string[], themes: ContentThemeId[], limit = 16) {
    const db = await getDatabase();
    const clauses: string[] = [];
    const params: (string | number)[] = [];
    if (countries.length) { clauses.push(`ch.country IN (${countries.map(() => '?').join(', ')})`); params.push(...countries); }
    if (languages.length) { clauses.push(`ch.language IN (${languages.map(() => '?').join(', ')})`); params.push(...languages); }
    const terms = themes.flatMap((theme) => categorySearchTerms(theme, null));
    if (terms.length) {
      clauses.push(`ch.category_id IN (SELECT id FROM categories WHERE ${terms.map(() => `(UPPER(name) LIKE ? OR UPPER(display_name) LIKE ?)`).join(' OR ')})`);
      terms.forEach((term) => params.push(`%${term}%`, `%${term}%`));
    }
    if (!clauses.length) return this.liveNow(limit);
    return (await db.getAllAsync<ChannelRow>(`SELECT ch.* FROM channels ch WHERE ${clauses.map((clause) => `(${clause})`).join(' OR ')} ORDER BY ch.is_favorite DESC, COALESCE(ch.last_watched_at, '') DESC, ch.sort_name COLLATE NOCASE LIMIT ?`, ...params, limit)).map(channel);
  }
  async movies(limit = 100) { const db = await getDatabase(); return (await db.getAllAsync<MovieRow>('SELECT * FROM movies ORDER BY sort_name COLLATE NOCASE LIMIT ?', limit)).map(movie); }
  async series(limit = 100) { const db = await getDatabase(); return (await db.getAllAsync<SeriesRow>('SELECT * FROM series ORDER BY sort_name COLLATE NOCASE LIMIT ?', limit)).map(series); }
  async recentMovies(limit = 24) { const db = await getDatabase(); return (await db.getAllAsync<MovieRow>('SELECT * FROM movies ORDER BY COALESCE(release_year, 0) DESC, rowid DESC LIMIT ?', limit)).map(movie); }
  async recentSeries(limit = 24) { const db = await getDatabase(); return (await db.getAllAsync<SeriesRow>('SELECT * FROM series ORDER BY rowid DESC LIMIT ?', limit)).map(series); }
  async catalogCategories(kind: 'movie' | 'series', limit = 12): Promise<CatalogCategory[]> {
    const db = await getDatabase();
    const table = kind === 'movie' ? 'movies' : 'series';
    return db.getAllAsync<CatalogCategory>(`SELECT c.id, COALESCE(NULLIF(c.display_name, ''), c.name) AS name FROM categories c WHERE c.kind = ? AND EXISTS (SELECT 1 FROM ${table} media WHERE media.category_id = c.id) ORDER BY c.position, c.sort_name COLLATE NOCASE LIMIT ?`, kind, limit);
  }
  async favoriteMovies(limit = 100) { const db = await getDatabase(); return (await db.getAllAsync<MovieRow>('SELECT * FROM movies WHERE is_favorite = 1 ORDER BY sort_name COLLATE NOCASE LIMIT ?', limit)).map(movie); }
  async favoriteSeries(limit = 100) { const db = await getDatabase(); return (await db.getAllAsync<SeriesRow>('SELECT * FROM series WHERE is_favorite = 1 ORDER BY sort_name COLLATE NOCASE LIMIT ?', limit)).map(series); }
  async movieById(id: string) { const db = await getDatabase(); const row = await db.getFirstAsync<MovieRow>('SELECT * FROM movies WHERE id = ?', id); return row ? movie(row) : null; }
  async seriesById(id: string) { const db = await getDatabase(); const row = await db.getFirstAsync<SeriesRow>('SELECT * FROM series WHERE id = ?', id); return row ? series(row) : null; }
  async episodes(seriesId: string) { const db = await getDatabase(); return db.getAllAsync<{ id: string; season_number: number; episode_number: number; name: string; duration_seconds: number | null }>(`SELECT id, season_number, episode_number, COALESCE(NULLIF(display_name, ''), name) AS name, duration_seconds FROM episodes WHERE series_id = ? ORDER BY season_number, episode_number`, seriesId); }
  async episodeById(id: string) { const db = await getDatabase(); return db.getFirstAsync<{ id: string; name: string; stream_url: string; playlist_id: string; series_name: string; season_number: number; episode_number: number }>(`SELECT ep.id, COALESCE(NULLIF(ep.display_name, ''), ep.name) AS name, ep.stream_url, ep.season_number, ep.episode_number, COALESCE(NULLIF(s.display_name, ''), s.name) AS series_name, s.playlist_id FROM episodes ep JOIN series s ON s.id = ep.series_id WHERE ep.id = ?`, id); }
  async nextEpisode(id: string) { const db = await getDatabase(); return db.getFirstAsync<{ id: string; name: string }>(`SELECT candidate.id, COALESCE(NULLIF(candidate.display_name, ''), candidate.name) AS name FROM episodes current JOIN episodes candidate ON candidate.series_id = current.series_id WHERE current.id = ? AND (candidate.season_number > current.season_number OR (candidate.season_number = current.season_number AND candidate.episode_number > current.episode_number)) ORDER BY candidate.season_number, candidate.episode_number LIMIT 1`, id); }
  async setMediaFavorite(kind: 'movie' | 'series', id: string, favorite: boolean) { const db = await getDatabase(); await db.runAsync(`UPDATE ${kind === 'movie' ? 'movies' : 'series'} SET is_favorite = ? WHERE id = ?`, favorite ? 1 : 0, id); }
  async guideNow(limit = 100) {
    const db = await getDatabase(); const now = new Date().toISOString();
    return db.getAllAsync<GuideItem>(`SELECT ch.id AS channelId, ch.display_name AS channelName, ch.logo_url AS logoUrl, ep.title, ep.starts_at AS startsAt, ep.ends_at AS endsAt FROM epg_programmes ep JOIN channels ch ON ch.playlist_id = ep.playlist_id AND (ch.tvg_id = ep.channel_tvg_id OR ch.tvg_name = ep.channel_tvg_id OR ch.name = ep.channel_tvg_id) WHERE ep.starts_at <= ? AND ep.ends_at > ? ORDER BY ch.sort_name COLLATE NOCASE LIMIT ?`, now, now, limit);
  }
  async search(query: string): Promise<SearchResult[]> {
    const intent = parseContentSearchIntent(query);
    const escaped = intent.text.replace(/[\\%_]/g, '\\$&');
    const categoryTerms = categorySearchTerms(intent.theme, intent.topic);
    if (intent.country) categoryTerms.push(localizedCountryName(intent.country, 'fr').toUpperCase(), localizedCountryName(intent.country, 'en').toUpperCase());
    if (intent.language) categoryTerms.push(localizedLanguageName(intent.language, 'fr').toUpperCase(), localizedLanguageName(intent.language, 'en').toUpperCase());
    const buildWhere = (alias: string, locale: boolean) => {
      const clauses: string[] = [];
      const params: string[] = [];
      if (escaped) { clauses.push(`(${alias}.name LIKE ? ESCAPE '\\' OR ${alias}.display_name LIKE ? ESCAPE '\\')`); params.push(`%${escaped}%`, `%${escaped}%`); }
      if (categoryTerms.length) {
        clauses.push(`${alias}.category_id IN (SELECT id FROM categories WHERE ${categoryTerms.map(() => `(UPPER(name) LIKE ? OR UPPER(display_name) LIKE ?)`).join(' OR ')})`);
        categoryTerms.forEach((term) => params.push(`%${term}%`, `%${term}%`));
      }
      if (locale && intent.country) { clauses.push(`${alias}.country = ?`); params.push(intent.country); }
      if (locale && intent.language) { clauses.push(`${alias}.language = ?`); params.push(intent.language); }
      if (intent.quality) {
        const patterns = intent.quality === '4k' ? ['%4K%', '%UHD%', '%2160%'] : intent.quality === 'fhd' ? ['%FHD%', '%1080%'] : intent.quality === 'hd' ? ['% HD%', 'HD %', '%720%'] : ['% SD%', 'SD %', '%480%'];
        clauses.push(`(${patterns.map(() => `UPPER(${alias}.name) LIKE ?`).join(' OR ')})`); params.push(...patterns);
      }
      return { sql: clauses.length ? clauses.join(' AND ') : '1 = 0', params };
    };
    const channelWhere = buildWhere('ch', true);
    const movieWhere = buildWhere('m', false);
    const seriesWhere = buildWhere('s', false);
    const db = await getDatabase();
    const [channels, programmes, movies, series] = await Promise.all([
      db.getAllAsync<{ id: string; title: string }>(`SELECT ch.id, ch.display_name AS title FROM channels ch WHERE ${channelWhere.sql} ORDER BY ch.sort_name COLLATE NOCASE LIMIT 20`, ...channelWhere.params),
      escaped ? db.getAllAsync<{ id: string; title: string; subtitle: string }>(`SELECT id, title, channel_tvg_id AS subtitle FROM epg_programmes WHERE title LIKE ? ESCAPE '\\' ORDER BY starts_at LIMIT 20`, `%${escaped}%`) : Promise.resolve([]),
      db.getAllAsync<{ id: string; title: string; subtitle: string | null }>(`SELECT m.id, COALESCE(NULLIF(m.display_name, ''), m.name) AS title, m.plot AS subtitle FROM movies m WHERE ${movieWhere.sql} ORDER BY m.sort_name COLLATE NOCASE LIMIT 20`, ...movieWhere.params),
      db.getAllAsync<{ id: string; title: string; subtitle: string | null }>(`SELECT s.id, COALESCE(NULLIF(s.display_name, ''), s.name) AS title, s.plot AS subtitle FROM series s WHERE ${seriesWhere.sql} ORDER BY s.sort_name COLLATE NOCASE LIMIT 20`, ...seriesWhere.params),
    ]);
    return [...channels.map((x) => ({ ...x, subtitle: translate('Chaîne en direct', 'Live channel'), kind: 'channel' as const })), ...programmes.map((x) => ({ ...x, kind: 'programme' as const })), ...movies.map((x) => ({ ...x, kind: 'movie' as const })), ...series.map((x) => ({ ...x, kind: 'series' as const }))];
  }
}
