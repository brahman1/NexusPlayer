import { getDatabase } from '../storage/database';
import { subscribeCatalogInvalidation } from '../services/catalogInvalidation';

export type CatalogKind = 'movie' | 'series';
export type CatalogCard = { id: string; name: string; posterUrl: string | null; year: number | null };
export type CatalogGroup = { id: string; name: string; count: number; categoryIds: string[]; preview: CatalogCard[] };
export type CatalogFilter = { query?: string; categoryId?: string; categoryIds?: string[]; favorites?: boolean; recent?: boolean };
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
  if (filter.categoryIds?.length) {
    clauses.push(`m.category_id IN (${filter.categoryIds.map(() => '?').join(', ')})`);
    params.push(...filter.categoryIds);
  }
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
      db.getAllAsync<{ id: string; name: string; count: number; categoryIdsCsv: string }>(`SELECT MIN(c.id) AS id, COALESCE(NULLIF(c.display_name, ''), c.name) AS name, COUNT(m.id) AS count, GROUP_CONCAT(DISTINCT c.id) AS categoryIdsCsv FROM categories c JOIN ${table} m ON m.category_id = c.id WHERE c.kind = ? GROUP BY COALESCE(NULLIF(c.display_name, ''), c.name) ORDER BY MIN(c.sort_name) COLLATE NOCASE, name COLLATE NOCASE`, kind),
      db.getAllAsync<CatalogCard & { categoryName: string }>(`WITH ranked AS (
        SELECT m.id, COALESCE(NULLIF(c.display_name, ''), c.name) AS categoryName, COALESCE(NULLIF(m.display_name, ''), m.name) AS name,
               m.poster_url AS posterUrl, ${kind === 'movie' ? 'm.release_year' : 'NULL'} AS year,
               ROW_NUMBER() OVER (PARTITION BY COALESCE(NULLIF(c.display_name, ''), c.name) ORDER BY m.sort_name COLLATE NOCASE, m.id) AS categoryRank
        FROM ${table} m JOIN categories c ON c.id = m.category_id
      ) SELECT id, categoryName, name, posterUrl, year FROM ranked WHERE categoryRank <= 12 ORDER BY categoryName, categoryRank`),
      this.page(kind, { recent: true }, 0, 18),
    ]);
    const previews = new Map<string, CatalogCard[]>();
    for (const { categoryName, ...item } of previewRows) {
      const group = previews.get(categoryName) ?? [];
      group.push(item);
      previews.set(categoryName, group);
    }
    const groups = groupRows.map(({ categoryIdsCsv, ...group }) => ({ ...group, categoryIds: categoryIdsCsv.split(',').filter(Boolean), preview: previews.get(group.name) ?? [] }));
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
