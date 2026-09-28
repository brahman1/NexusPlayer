import { getDatabase } from '../storage/database';
import { subscribeCatalogInvalidation } from '../services/catalogInvalidation';

export type CatalogKind = 'movie' | 'series';
export type CatalogCard = { id: string; name: string; posterUrl: string | null; year: number | null };
export type CatalogGroup = { id: string; name: string; count: number; preview: CatalogCard[] };
export type CatalogFilter = { query?: string; categoryId?: string; favorites?: boolean; recent?: boolean };
export type CatalogPage = { items: CatalogCard[]; total: number };
export type CatalogOverview = { total: number; groups: CatalogGroup[]; recent: CatalogCard[] };

export function catalogWhere(filter: CatalogFilter) {
  const clauses: string[] = [];
  const params: string[] = [];
  if (filter.query?.trim()) {
    clauses.push("(m.name LIKE ? ESCAPE '\\' OR m.display_name LIKE ? ESCAPE '\\')");
    const term = `%${filter.query.trim().replace(/[\\%_]/g, '\\$&')}%`;
    params.push(term, term);
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
    const order = filter.recent ? (kind === 'movie' ? 'm.release_year DESC, m.rowid DESC' : 'm.rowid DESC') : 'm.sort_name COLLATE NOCASE, m.id';
    const [items, count] = await Promise.all([
      db.getAllAsync<CatalogCard>(`SELECT m.id, COALESCE(NULLIF(m.display_name, ''), m.name) AS name, m.poster_url AS posterUrl, ${kind === 'movie' ? 'm.release_year' : 'NULL'} AS year FROM ${table} m ${sql} ORDER BY ${order} LIMIT ? OFFSET ?`, ...params, limit, offset),
      db.getFirstAsync<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table} m ${sql}`, ...params),
    ]);
    return { items, total: count?.total ?? 0 };
  }

  async overview(kind: CatalogKind): Promise<CatalogOverview> {
    const db = await getDatabase();
    const table = kind === 'movie' ? 'movies' : 'series';
    const [groupRows, previewRows, recent] = await Promise.all([
      db.getAllAsync<Omit<CatalogGroup, 'preview'>>(`SELECT c.id, COALESCE(NULLIF(c.display_name, ''), c.name) AS name, COUNT(m.id) AS count FROM categories c JOIN ${table} m ON m.category_id = c.id WHERE c.kind = ? GROUP BY c.id ORDER BY c.position, c.sort_name COLLATE NOCASE, c.id`, kind),
      db.getAllAsync<CatalogCard & { categoryId: string }>(`WITH ranked AS (
        SELECT m.id, m.category_id AS categoryId, COALESCE(NULLIF(m.display_name, ''), m.name) AS name,
               m.poster_url AS posterUrl, ${kind === 'movie' ? 'm.release_year' : 'NULL'} AS year,
               ROW_NUMBER() OVER (PARTITION BY m.category_id ORDER BY m.sort_name COLLATE NOCASE, m.id) AS categoryRank
        FROM ${table} m WHERE m.category_id IS NOT NULL
      ) SELECT id, categoryId, name, posterUrl, year FROM ranked WHERE categoryRank <= 12 ORDER BY categoryId, categoryRank`),
      this.page(kind, { recent: true }, 0, 18),
    ]);
    const previews = new Map<string, CatalogCard[]>();
    for (const { categoryId, ...item } of previewRows) {
      const group = previews.get(categoryId) ?? [];
      group.push(item);
      previews.set(categoryId, group);
    }
    const groups = groupRows.map((group) => ({ ...group, preview: previews.get(group.id) ?? [] }));
    return { total: recent.total, groups, recent: recent.items };
  }
}

// Stale-while-revalidate cache. Resolved values survive tab unmounts and can be
// painted synchronously while the inexpensive revision check runs.
const overviews = new Map<CatalogKind, { resolved?: CatalogOverview; revision: string; value: Promise<CatalogOverview> }>();

export function staleOverview(kind: CatalogKind) {
  return overviews.get(kind)?.resolved ?? null;
}

export function cachedOverview(repository: CatalogRepository, kind: CatalogKind, revision: string) {
  const entry = overviews.get(kind);
  if (entry?.revision === revision) return entry.value;
  const value = repository.overview(kind);
  const next = { resolved: entry?.resolved, revision, value };
  overviews.set(kind, next);
  void value.then(
    (resolved) => {
      if (overviews.get(kind) === next) next.resolved = resolved;
    },
    () => {
      if (overviews.get(kind) === next) overviews.delete(kind);
    },
  );
  return value;
}

export function clearCatalogOverviewCache() {
  overviews.clear();
}

subscribeCatalogInvalidation(clearCatalogOverviewCache);
