import { getDatabase } from '../storage/database';

export type CatalogKind = 'movie' | 'series';
export type CatalogCard = { id: string; name: string; posterUrl: string | null; year: number | null };
export type CatalogGroup = { id: string; name: string; count: number };
export type CatalogFilter = { query?: string; categoryId?: string; favorites?: boolean; recent?: boolean };
export type CatalogPage = { items: CatalogCard[]; total: number };
export type CatalogOverview = { total: number; groups: CatalogGroup[]; recent: CatalogCard[] };

export function catalogWhere(filter: CatalogFilter) {
  const clauses: string[] = [];
  const params: string[] = [];
  if (filter.query?.trim()) {
    clauses.push("m.name LIKE ? ESCAPE '\\'");
    params.push(`%${filter.query.trim().replace(/[\\%_]/g, '\\$&')}%`);
  }
  if (filter.categoryId) { clauses.push('m.category_id = ?'); params.push(filter.categoryId); }
  if (filter.favorites) clauses.push('m.is_favorite = 1');
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export class CatalogRepository {
  async revision() {
    const db = await getDatabase();
    return JSON.stringify(await db.getAllAsync('SELECT id, updated_at, last_synced_at FROM playlists ORDER BY id'));
  }

  async page(kind: CatalogKind, filter: CatalogFilter = {}, offset = 0, limit = 48): Promise<CatalogPage> {
    const db = await getDatabase();
    const table = kind === 'movie' ? 'movies' : 'series';
    const { sql, params } = catalogWhere(filter);
    const order = filter.recent ? (kind === 'movie' ? 'm.release_year DESC, m.rowid DESC' : 'm.rowid DESC') : 'm.name COLLATE NOCASE, m.id';
    const [items, count] = await Promise.all([
      db.getAllAsync<CatalogCard>(`SELECT m.id, m.name, m.poster_url AS posterUrl, ${kind === 'movie' ? 'm.release_year' : 'NULL'} AS year FROM ${table} m ${sql} ORDER BY ${order} LIMIT ? OFFSET ?`, ...params, limit, offset),
      db.getFirstAsync<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table} m ${sql}`, ...params),
    ]);
    return { items, total: count?.total ?? 0 };
  }

  async overview(kind: CatalogKind): Promise<CatalogOverview> {
    const db = await getDatabase();
    const table = kind === 'movie' ? 'movies' : 'series';
    const [groups, recent] = await Promise.all([
      db.getAllAsync<CatalogGroup>(`SELECT c.id, COALESCE(NULLIF(c.display_name, ''), c.name) AS name, COUNT(m.id) AS count FROM categories c JOIN ${table} m ON m.category_id = c.id WHERE c.kind = ? GROUP BY c.id ORDER BY c.position, c.sort_name COLLATE NOCASE, c.id`, kind),
      this.page(kind, { recent: true }, 0, 18),
    ]);
    return { total: recent.total, groups, recent: recent.items };
  }
}

// Small metadata/card cache, invalidated by source import, refresh or removal.
const overviews = new Map<CatalogKind, { revision: string; value: Promise<CatalogOverview> }>();
export function cachedOverview(repository: CatalogRepository, kind: CatalogKind, revision: string) {
  const entry = overviews.get(kind);
  if (entry?.revision === revision) return entry.value;
  const value = repository.overview(kind);
  const next = { revision, value };
  overviews.set(kind, next);
  void value.catch(() => { if (overviews.get(kind) === next) overviews.delete(kind); });
  return value;
}
