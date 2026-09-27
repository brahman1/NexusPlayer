import { getDatabase } from '../storage/database';
import type { Category, Channel } from '../types/domain';

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

type CategoryRow = { id: string; playlist_id: string; name: string; display_name: string; position: number; channel_count: number; category_ids: string };

export type ChannelFilters = {
  search?: string;
  categoryId?: string | null;
  categoryIds?: string[];
  favoritesOnly?: boolean;
  recentOnly?: boolean;
  limit?: number;
  offset?: number;
};

function buildFilterQuery(playlistId: string, filters: ChannelFilters) {
  const clauses = ['playlist_id = ?'];
  const parameters: (string | number)[] = [playlistId];
  const search = filters.search?.trim();

  if (search) {
    clauses.push(`(name LIKE ? ESCAPE '\\' OR display_name LIKE ? ESCAPE '\\')`);
    const term = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    parameters.push(term, term);
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

  return { where: clauses.join(' AND '), parameters };
}

function mapChannel(row: ChannelRow): Channel {
  return {
    id: row.id,
    playlistId: row.playlist_id,
    categoryId: row.category_id,
    name: row.name,
    displayName: row.display_name || row.name,
    streamUrl: row.stream_url,
    tvgId: row.tvg_id,
    tvgName: row.tvg_name,
    logoUrl: row.logo_url,
    language: row.language,
    country: row.country,
    isFavorite: row.is_favorite === 1,
    lastWatchedAt: row.last_watched_at,
  };
}

export class SQLiteChannelRepository {
  async listCategories(playlistId: string) {
    const database = await getDatabase();
    const rows = await database.getAllAsync<CategoryRow>(
      `SELECT MIN(c.id) AS id, c.playlist_id, MIN(c.name) AS name, c.display_name,
              MIN(c.position) AS position, COUNT(ch.id) AS channel_count,
              GROUP_CONCAT(DISTINCT c.id) AS category_ids
       FROM categories c LEFT JOIN channels ch ON ch.category_id = c.id
       WHERE c.playlist_id = ? AND c.kind = 'live'
       GROUP BY c.playlist_id, c.display_name HAVING COUNT(ch.id) > 0
       ORDER BY MIN(c.sort_name) COLLATE NOCASE, c.display_name COLLATE NOCASE`,
      playlistId,
    );
    return rows.map((row) => ({
      id: row.id,
      playlistId: row.playlist_id,
      name: row.name,
      displayName: row.display_name || row.name,
      kind: 'live' as const,
      position: row.position,
      channelCount: row.channel_count,
      categoryIds: row.category_ids.split(',').filter(Boolean),
    }));
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

export type ChannelCategory = Category & { categoryIds: string[]; channelCount: number };
