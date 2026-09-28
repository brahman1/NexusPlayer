import { getDatabase } from '../storage/database';
import type { Category, Channel } from '../types/domain';
import { inferChannelMetadata, localizeCategoryDisplayName, localizePresentationName } from '../services/channelPresentation';
import { getAppLanguage } from '../i18n';
import { categorySearchTerms, parseContentSearchIntent, type ContentQuality } from '../services/contentTaxonomy';

type ChannelRow = {
  id: string;
  playlist_id: string;
  category_id: string | null;
  name: string;
  display_name: string;
  sort_name: string;
  stream_url: string;
  tvg_id: string | null;
  tvg_name: string | null;
  logo_url: string | null;
  language: string | null;
  country: string | null;
  is_favorite: number;
  last_watched_at: string | null;
};

type CategoryRow = { id: string; playlist_id: string; name: string; display_name: string; position: number; channel_count: number; category_ids: string; raw_names: string };

export type ChannelFacet = { code: string; count: number };
export type ChannelFacets = { countries: ChannelFacet[]; languages: ChannelFacet[]; qualities: ChannelFacet[] };

export type ChannelFilters = {
  search?: string;
  categoryId?: string | null;
  categoryIds?: string[];
  favoritesOnly?: boolean;
  recentOnly?: boolean;
  countries?: string[];
  languages?: string[];
  qualities?: ContentQuality[];
  localeMatchAny?: boolean;
  limit?: number;
  offset?: number;
};

export function buildFilterQuery(playlistId: string, filters: ChannelFilters) {
  const clauses = ['playlist_id = ?'];
  const parameters: (string | number)[] = [playlistId];
  const intent = parseContentSearchIntent(filters.search?.trim() ?? '');
  const search = intent.text;

  if (search) {
    clauses.push(`(name LIKE ? ESCAPE '\\' OR display_name LIKE ? ESCAPE '\\')`);
    const term = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    parameters.push(term, term);
  }
  const categoryTerms = categorySearchTerms(intent.theme, intent.topic);
  if (categoryTerms.length) {
    clauses.push(`category_id IN (SELECT id FROM categories WHERE ${categoryTerms.map(() => `(UPPER(name) LIKE ? OR UPPER(display_name) LIKE ?)`).join(' OR ')})`);
    categoryTerms.forEach((term) => parameters.push(`%${term}%`, `%${term}%`));
  }
  if (filters.categoryId) {
    clauses.push('category_id = ?');
    parameters.push(filters.categoryId);
  }
  if (filters.categoryIds?.length) {
    clauses.push(`category_id IN (${filters.categoryIds.map(() => '?').join(', ')})`);
    parameters.push(...filters.categoryIds);
  }
  if (filters.favoritesOnly) clauses.push('is_favorite = 1');
  if (filters.recentOnly) clauses.push('last_watched_at IS NOT NULL');
  const countries = filters.countries?.length ? filters.countries : intent.country ? [intent.country] : [];
  const languages = filters.languages?.length ? filters.languages : intent.language ? [intent.language] : [];
  const localeClauses: string[] = [];
  if (countries.length) { localeClauses.push(`country IN (${countries.map(() => '?').join(', ')})`); parameters.push(...countries); }
  if (languages.length) { localeClauses.push(`language IN (${languages.map(() => '?').join(', ')})`); parameters.push(...languages); }
  if (localeClauses.length) clauses.push(`(${localeClauses.join(filters.localeMatchAny ? ' OR ' : ' AND ')})`);
  const qualities = filters.qualities?.length ? filters.qualities : intent.quality ? [intent.quality] : [];
  if (qualities.length) {
    const checks = qualities.map((quality) => quality === '4k'
      ? `(UPPER(name) LIKE '%4K%' OR UPPER(name) LIKE '%UHD%' OR UPPER(name) LIKE '%2160%')`
      : quality === 'fhd' ? `(UPPER(name) LIKE '%FHD%' OR UPPER(name) LIKE '%1080%')`
        : quality === 'hd' ? `((UPPER(name) LIKE '%HD%' AND UPPER(name) NOT LIKE '%FHD%' AND UPPER(name) NOT LIKE '%UHD%') OR UPPER(name) LIKE '%720%')`
          : `(UPPER(name) LIKE '% SD%' OR UPPER(name) LIKE 'SD %' OR UPPER(name) LIKE '%480%')`);
    clauses.push(`(${checks.join(' OR ')})`);
  }

  return { where: clauses.join(' AND '), parameters };
}

function mapChannel(row: ChannelRow): Channel {
  const quality = inferChannelMetadata(row.name, '', row.language, row.country).quality;
  return {
    id: row.id,
    playlistId: row.playlist_id,
    categoryId: row.category_id,
    name: row.name,
    displayName: localizePresentationName(row.display_name || row.name, getAppLanguage()),
    streamUrl: row.stream_url,
    tvgId: row.tvg_id,
    tvgName: row.tvg_name,
    logoUrl: row.logo_url,
    language: row.language,
    country: row.country,
    quality,
    isFavorite: row.is_favorite === 1,
    lastWatchedAt: row.last_watched_at,
  };
}

export class SQLiteChannelRepository {
  async listCategories(playlistId: string, raw = false) {
    const database = await getDatabase();
    const label = raw ? 'c.name' : 'c.display_name';
    const rows = await database.getAllAsync<CategoryRow>(
      `SELECT MIN(c.id) AS id, c.playlist_id, MIN(c.name) AS name, ${label} AS display_name,
              MIN(c.position) AS position, COUNT(ch.id) AS channel_count,
              GROUP_CONCAT(DISTINCT c.id) AS category_ids,
              GROUP_CONCAT(DISTINCT c.name) AS raw_names
       FROM categories c LEFT JOIN channels ch ON ch.category_id = c.id
       WHERE c.playlist_id = ? AND c.kind = 'live'
       GROUP BY c.playlist_id, ${label} HAVING COUNT(ch.id) > 0
       ORDER BY MIN(c.sort_name) COLLATE NOCASE, ${label} COLLATE NOCASE`,
      playlistId,
    );
    return rows.map((row) => ({
      id: row.id,
      playlistId: row.playlist_id,
      name: row.name,
      displayName: raw ? (row.display_name || row.name) : localizeCategoryDisplayName(row.display_name || row.name, getAppLanguage()),
      kind: 'live' as const,
      position: row.position,
      channelCount: row.channel_count,
      categoryIds: row.category_ids.split(',').filter(Boolean),
      rawNames: row.raw_names.split(',').filter(Boolean),
    }));
  }

  async facets(playlistId: string): Promise<ChannelFacets> {
    const database = await getDatabase();
    const [countries, languages, qualities] = await Promise.all([
      database.getAllAsync<ChannelFacet>(`SELECT country AS code, COUNT(*) AS count FROM channels WHERE playlist_id = ? AND country IS NOT NULL AND TRIM(country) <> '' GROUP BY country ORDER BY count DESC`, playlistId),
      database.getAllAsync<ChannelFacet>(`SELECT language AS code, COUNT(*) AS count FROM channels WHERE playlist_id = ? AND language IS NOT NULL AND TRIM(language) <> '' GROUP BY language ORDER BY count DESC`, playlistId),
      database.getAllAsync<ChannelFacet>(`SELECT quality AS code, COUNT(*) AS count FROM (
        SELECT CASE
          WHEN UPPER(name) LIKE '%4K%' OR UPPER(name) LIKE '%UHD%' OR UPPER(name) LIKE '%2160%' THEN '4k'
          WHEN UPPER(name) LIKE '%FHD%' OR UPPER(name) LIKE '%1080%' THEN 'fhd'
          WHEN (UPPER(name) LIKE '%HD%' AND UPPER(name) NOT LIKE '%FHD%' AND UPPER(name) NOT LIKE '%UHD%') OR UPPER(name) LIKE '%720%' THEN 'hd'
          WHEN UPPER(name) LIKE '% SD%' OR UPPER(name) LIKE 'SD %' OR UPPER(name) LIKE '%480%' THEN 'sd'
          ELSE NULL END AS quality FROM channels WHERE playlist_id = ?
      ) WHERE quality IS NOT NULL GROUP BY quality ORDER BY count DESC`, playlistId),
    ]);
    return { countries, languages, qualities };
  }

  async listByPlaylist(playlistId: string, filters: ChannelFilters = {}) {
    const database = await getDatabase();
    const { parameters, where } = buildFilterQuery(playlistId, filters);
    const order = filters.recentOnly ? 'last_watched_at DESC' : 'sort_name COLLATE NOCASE, id';
    const limit = Math.min(Math.max(filters.limit ?? 250, 1), 1000);
    const offset = Math.max(filters.offset ?? 0, 0);
    const rows = await database.getAllAsync<ChannelRow>(
      `SELECT * FROM channels WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...parameters, limit, offset],
    );
    return rows.map(mapChannel);
  }

  async countByPlaylist(playlistId: string, filters: ChannelFilters = {}) {
    const database = await getDatabase();
    const { parameters, where } = buildFilterQuery(playlistId, filters);
    const row = await database.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM channels WHERE ${where}`,
      parameters,
    );
    return row?.total ?? 0;
  }

  async findById(id: string) {
    const database = await getDatabase();
    const row = await database.getFirstAsync<ChannelRow>('SELECT * FROM channels WHERE id = ?', id);
    return row ? mapChannel(row) : null;
  }

  async indexOfChannel(playlistId: string, id: string) {
    const database = await getDatabase();
    const current = await database.getFirstAsync<Pick<ChannelRow, 'id' | 'sort_name'>>(
      'SELECT id, sort_name FROM channels WHERE playlist_id = ? AND id = ?', playlistId, id,
    );
    if (!current) return null;
    const row = await database.getFirstAsync<{ position: number }>(
      `SELECT COUNT(*) AS position FROM channels
       WHERE playlist_id = ? AND (sort_name COLLATE NOCASE < ? COLLATE NOCASE OR (sort_name = ? COLLATE NOCASE AND id < ?))`,
      playlistId, current.sort_name, current.sort_name, current.id,
    );
    return row?.position ?? 0;
  }

  async findAdjacent(id: string, direction: 'previous' | 'next') {
    const database = await getDatabase();
    const current = await database.getFirstAsync<Pick<ChannelRow, 'id' | 'playlist_id' | 'sort_name'>>(
      'SELECT id, playlist_id, sort_name FROM channels WHERE id = ?',
      id,
    );
    if (!current) return null;

    const isNext = direction === 'next';
    const comparison = isNext
      ? `(sort_name COLLATE NOCASE > ? COLLATE NOCASE OR (sort_name = ? COLLATE NOCASE AND id > ?))`
      : `(sort_name COLLATE NOCASE < ? COLLATE NOCASE OR (sort_name = ? COLLATE NOCASE AND id < ?))`;
    const order = isNext ? 'ASC' : 'DESC';
    let row = await database.getFirstAsync<ChannelRow>(
      `SELECT * FROM channels WHERE playlist_id = ? AND ${comparison}
       ORDER BY sort_name COLLATE NOCASE ${order}, id ${order} LIMIT 1`,
      current.playlist_id,
      current.sort_name,
      current.sort_name,
      current.id,
    );

    if (!row) {
      row = await database.getFirstAsync<ChannelRow>(
        `SELECT * FROM channels WHERE playlist_id = ?
         ORDER BY sort_name COLLATE NOCASE ${order}, id ${order} LIMIT 1`,
        current.playlist_id,
      );
    }
    return row ? mapChannel(row) : null;
  }

  async setFavorite(id: string, favorite: boolean) {
    const database = await getDatabase();
    await database.runAsync('UPDATE channels SET is_favorite = ? WHERE id = ?', favorite ? 1 : 0, id);
  }

  async markWatched(id: string) {
    const database = await getDatabase();
    await database.runAsync('UPDATE channels SET last_watched_at = ? WHERE id = ?', new Date().toISOString(), id);
  }
}

export type ChannelCategory = Category & { categoryIds: string[]; channelCount: number; rawNames: string[] };
