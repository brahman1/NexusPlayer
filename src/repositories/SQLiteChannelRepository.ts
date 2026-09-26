import { getDatabase } from '../storage/database';
import type { Category, Channel } from '../types/domain';

type ChannelRow = {
  id: string;
  playlist_id: string;
  category_id: string | null;
  name: string;
  stream_url: string;
  tvg_id: string | null;
  tvg_name: string | null;
  logo_url: string | null;
  language: string | null;
  country: string | null;
  is_favorite: number;
  last_watched_at: string | null;
};

type CategoryRow = { id: string; playlist_id: string; name: string; position: number; channel_count: number };

export type ChannelFilters = {
  search?: string;
  categoryId?: string | null;
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
    clauses.push(`name LIKE ? ESCAPE '\\'`);
    parameters.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`);
  }
  if (filters.categoryId) {
    clauses.push('category_id = ?');
    parameters.push(filters.categoryId);
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
      `SELECT c.id, c.playlist_id, c.name, c.position, COUNT(ch.id) AS channel_count
       FROM categories c LEFT JOIN channels ch ON ch.category_id = c.id
       WHERE c.playlist_id = ? GROUP BY c.id ORDER BY c.position, c.name COLLATE NOCASE`,
      playlistId,
    );
    return rows.map((row) => ({
      id: row.id,
      playlistId: row.playlist_id,
      name: row.name,
      kind: 'live' as const,
      position: row.position,
      channelCount: row.channel_count,
    }));
  }

  async listByPlaylist(playlistId: string, filters: ChannelFilters = {}) {
    const database = await getDatabase();
    const { parameters, where } = buildFilterQuery(playlistId, filters);
    const order = filters.recentOnly ? 'last_watched_at DESC' : 'name COLLATE NOCASE';
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

  async findAdjacent(id: string, direction: 'previous' | 'next') {
    const database = await getDatabase();
    const current = await database.getFirstAsync<Pick<ChannelRow, 'id' | 'playlist_id' | 'name'>>(
      'SELECT id, playlist_id, name FROM channels WHERE id = ?',
      id,
    );
    if (!current) return null;

    const isNext = direction === 'next';
    const comparison = isNext
      ? `(name COLLATE NOCASE > ? COLLATE NOCASE OR (name = ? COLLATE NOCASE AND id > ?))`
      : `(name COLLATE NOCASE < ? COLLATE NOCASE OR (name = ? COLLATE NOCASE AND id < ?))`;
    const order = isNext ? 'ASC' : 'DESC';
    let row = await database.getFirstAsync<ChannelRow>(
      `SELECT * FROM channels WHERE playlist_id = ? AND ${comparison}
       ORDER BY name COLLATE NOCASE ${order}, id ${order} LIMIT 1`,
      current.playlist_id,
      current.name,
      current.name,
      current.id,
    );

    if (!row) {
      row = await database.getFirstAsync<ChannelRow>(
        `SELECT * FROM channels WHERE playlist_id = ?
         ORDER BY name COLLATE NOCASE ${order}, id ${order} LIMIT 1`,
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

export type ChannelCategory = Category & { channelCount: number };
