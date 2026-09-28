import { getDatabase } from '../storage/database';
import { getAppLanguage } from '../i18n';
import { applyCategoryLabelOverride, countryCodeFromCategoryLabel, localizedCountryName, localizedLanguageName, localizeCategoryDisplayName, localizePresentationName } from '../services/channelPresentation';
import { subscribeCatalogInvalidation } from '../services/catalogInvalidation';
import { categorySearchTerms, classifyContentText, contentThemeLabel, contentTopicLabel, parseContentSearchIntent, type ContentThemeId, type ContentTopicId } from '../services/contentTaxonomy';

export type CatalogKind = 'movie' | 'series';
export type CatalogCard = { id: string; name: string; posterUrl: string | null; year: number | null };
export type CatalogGroup = { id: string; name: string; count: number; categoryIds: string[]; preview: CatalogCard[]; preferred?: boolean; themeId?: ContentThemeId; topicId?: ContentTopicId | null; countryCode?: string | null };
export type CatalogFacet = { id: string; name: string; count: number; categoryIds: string[] };
export type CatalogFilter = { query?: string; categoryId?: string; categoryIds?: string[]; favorites?: boolean; recent?: boolean };
export type CatalogPage = { items: CatalogCard[]; total: number };
export type CatalogOverview = { total: number; groups: CatalogGroup[]; recent: CatalogCard[]; themes?: CatalogFacet[]; countries?: CatalogFacet[] };
export type CatalogPresentationOptions = { categoryLabelOverrides?: Record<string, string>; preferredCountries?: string[]; preferredThemes?: string[]; showRawCategories?: boolean };

export function catalogWhere(filter: CatalogFilter) {
  const clauses: string[] = [];
  const params: string[] = [];
  const intent = parseContentSearchIntent(filter.query?.trim() ?? '');
  if (intent.text) {
    clauses.push("(m.name LIKE ? ESCAPE '\\' OR m.display_name LIKE ? ESCAPE '\\')");
    const term = `%${intent.text.replace(/[\\%_]/g, '\\$&')}%`;
    params.push(term, term);
  }
  const intentTerms = categorySearchTerms(intent.theme, intent.topic);
  if (intent.country) intentTerms.push(localizedCountryName(intent.country, 'fr').toUpperCase(), localizedCountryName(intent.country, 'en').toUpperCase());
  if (intent.language) intentTerms.push(localizedLanguageName(intent.language, 'fr').toUpperCase(), localizedLanguageName(intent.language, 'en').toUpperCase());
  if (intentTerms.length) {
    clauses.push(`m.category_id IN (SELECT id FROM categories WHERE ${intentTerms.map(() => `(UPPER(name) LIKE ? OR UPPER(display_name) LIKE ?)`).join(' OR ')})`);
    intentTerms.forEach((term) => params.push(`%${term}%`, `%${term}%`));
  }
  if (intent.quality) {
    const checks = intent.quality === '4k' ? `(UPPER(m.name) LIKE '%4K%' OR UPPER(m.name) LIKE '%UHD%' OR UPPER(m.name) LIKE '%2160%')`
      : intent.quality === 'fhd' ? `(UPPER(m.name) LIKE '%FHD%' OR UPPER(m.name) LIKE '%1080%')`
        : intent.quality === 'hd' ? `((UPPER(m.name) LIKE '%HD%' AND UPPER(m.name) NOT LIKE '%FHD%' AND UPPER(m.name) NOT LIKE '%UHD%') OR UPPER(m.name) LIKE '%720%')`
          : `(UPPER(m.name) LIKE '% SD%' OR UPPER(m.name) LIKE 'SD %' OR UPPER(m.name) LIKE '%480%')`;
    clauses.push(checks);
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
    return { items: items.map((item) => ({ ...item, name: localizePresentationName(item.name, getAppLanguage()) })), total: count?.total ?? 0 };
  }

  async overview(kind: CatalogKind, options: CatalogPresentationOptions = {}): Promise<CatalogOverview> {
    const db = await getDatabase();
    const table = kind === 'movie' ? 'movies' : 'series';
    const categoryLabel = options.showRawCategories ? 'c.name' : `COALESCE(NULLIF(c.display_name, ''), c.name)`;
    const [groupRows, previewRows, recent] = await Promise.all([
      db.getAllAsync<{ id: string; name: string; count: number; categoryIdsCsv: string }>(`SELECT MIN(c.id) AS id, ${categoryLabel} AS name, COUNT(m.id) AS count, GROUP_CONCAT(DISTINCT c.id) AS categoryIdsCsv FROM categories c JOIN ${table} m ON m.category_id = c.id WHERE c.kind = ? GROUP BY ${categoryLabel} ORDER BY MIN(c.sort_name) COLLATE NOCASE, name COLLATE NOCASE`, kind),
      db.getAllAsync<CatalogCard & { categoryName: string }>(`WITH ranked AS (
        SELECT m.id, ${categoryLabel} AS categoryName, COALESCE(NULLIF(m.display_name, ''), m.name) AS name,
               m.poster_url AS posterUrl, ${kind === 'movie' ? 'm.release_year' : 'NULL'} AS year,
               ROW_NUMBER() OVER (PARTITION BY ${categoryLabel} ORDER BY m.sort_name COLLATE NOCASE, m.id) AS categoryRank
        FROM ${table} m JOIN categories c ON c.id = m.category_id
      ) SELECT id, categoryName, name, posterUrl, year FROM ranked WHERE categoryRank <= 12 ORDER BY categoryName, categoryRank`),
      this.page(kind, { recent: true }, 0, 18),
    ]);
    const previews = new Map<string, CatalogCard[]>();
    for (const { categoryName, ...item } of previewRows) {
      const group = previews.get(categoryName) ?? [];
      group.push({ ...item, name: localizePresentationName(item.name, getAppLanguage()) });
      previews.set(categoryName, group);
    }
    const preferredCountries = options.preferredCountries ?? [];
    const preferredThemes = options.preferredThemes ?? [];
    const overrides = options.categoryLabelOverrides ?? {};
    const groups = groupRows.map(({ categoryIdsCsv, ...group }) => {
      const classified = classifyContentText(group.name);
      const themeId = classified.theme;
      const countryCode = countryCodeFromCategoryLabel(group.name);
      return { ...group, name: applyCategoryLabelOverride(options.showRawCategories ? group.name : localizeCategoryDisplayName(group.name, getAppLanguage()), overrides), countryCode, themeId, topicId: classified.topic, categoryIds: categoryIdsCsv.split(',').filter(Boolean), preview: previews.get(group.name) ?? [], preferred: Boolean((countryCode && preferredCountries.includes(countryCode)) || preferredThemes.includes(themeId)) };
    }).sort((left, right) => Number(right.preferred) - Number(left.preferred));
    const makeFacets = (selector: (group: CatalogGroup) => { id: string; name: string } | null) => {
      const values = new Map<string, CatalogFacet>();
      groups.forEach((group) => {
        const selected = selector(group);
        if (!selected) return;
        const current = values.get(selected.id) ?? { ...selected, count: 0, categoryIds: [] };
        current.count += group.count;
        current.categoryIds.push(...group.categoryIds.filter((id) => !current.categoryIds.includes(id)));
        values.set(selected.id, current);
      });
      return [...values.values()].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
    };
    const themes = makeFacets((group) => group.topicId ? { id: group.topicId, name: contentTopicLabel(group.topicId, getAppLanguage()) } : group.themeId && group.themeId !== 'other' ? { id: group.themeId, name: contentThemeLabel(group.themeId, getAppLanguage()) } : null);
    const countries = makeFacets((group) => group.countryCode ? { id: group.countryCode, name: localizedCountryName(group.countryCode, getAppLanguage()) } : null);
    return { total: recent.total, groups, recent: recent.items, themes, countries };
  }
}

// Stale-while-revalidate cache. Resolved values survive tab unmounts and can be
// painted synchronously while the inexpensive revision check runs.
const overviews = new Map<CatalogKind, { resolved?: CatalogOverview; revision: string; value: Promise<CatalogOverview> }>();

export function staleOverview(kind: CatalogKind) {
  return overviews.get(kind)?.resolved ?? null;
}

export function cachedOverview(repository: CatalogRepository, kind: CatalogKind, revision: string, options: CatalogPresentationOptions = {}) {
  const entry = overviews.get(kind);
  if (entry?.revision === revision) return entry.value;
  const value = repository.overview(kind, options);
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
