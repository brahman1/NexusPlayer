import { cachedOverview, CatalogRepository, catalogWhere, clearCatalogOverviewCache } from '../repositories/CatalogRepository';
import { getDatabase } from '../storage/database';

jest.mock('../storage/database', () => ({ getDatabase: jest.fn() }));

describe('complete catalog access', () => {
  beforeEach(() => clearCatalogOverviewCache());
  it('searches the database before applying pagination, including titles after 2000', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([{ id: '3001', name: 'Zorro', posterUrl: null, year: 2024 }]);
    const getFirstAsync = jest.fn().mockResolvedValue({ total: 3500 });
    jest.mocked(getDatabase).mockResolvedValue({ getAllAsync, getFirstAsync } as never);
    const page = await new CatalogRepository().page('movie', { query: 'Zorro' }, 2016, 48);
    expect(page.total).toBe(3500);
    expect(page.items[0]?.id).toBe('3001');
    expect(getAllAsync).toHaveBeenCalledWith(expect.stringMatching(/WHERE \(m.name LIKE.*m.display_name LIKE.*ORDER BY.*LIMIT \? OFFSET \?/), '%Zorro%', '%Zorro%', 48, 2016);
    expect(getFirstAsync).toHaveBeenCalledWith(expect.not.stringContaining('LIMIT'), '%Zorro%', '%Zorro%');
  });
  it('binds literal search characters and combines category/favorites filters', () => {
    const filter = catalogWhere({ query: "  100%_\\'  ", categoryId: 'group', favorites: true });
    expect(filter.params).toEqual(["%100\\%\\_\\\\'%", "%100\\%\\_\\\\'%", 'group']);
    expect(filter.sql).toContain('m.category_id = ? AND m.is_favorite = 1');
  });
  it('reuses overview queries and refreshes after source revisions', async () => {
    const repo = new CatalogRepository();
    const overview = jest.spyOn(repo, 'overview').mockResolvedValue({ total: 5000, groups: [], recent: [] });
    await Promise.all([cachedOverview(repo, 'series', 'one'), cachedOverview(repo, 'series', 'one')]);
    expect(overview).toHaveBeenCalledTimes(1);
    await cachedOverview(repo, 'series', 'two');
    expect(overview).toHaveBeenCalledTimes(2);
  });
  it('does not cache failed loads forever', async () => {
    const repo = new CatalogRepository();
    jest.spyOn(repo, 'overview').mockRejectedValueOnce(new Error('busy')).mockResolvedValue({ total: 3, groups: [], recent: [] });
    await expect(cachedOverview(repo, 'movie', 'retry')).rejects.toThrow('busy');
    await expect(cachedOverview(repo, 'movie', 'retry')).resolves.toMatchObject({ total: 3 });
  });

  it('loads all category previews in one ranked query', async () => {
    const getAllAsync = jest.fn()
      .mockResolvedValueOnce([
        { id: 'action', name: 'Action', count: 2 },
        { id: 'drama', name: 'Drame', count: 1 },
      ])
      .mockResolvedValueOnce([
        { id: 'm1', categoryId: 'action', name: 'Alpha', posterUrl: null, year: 2025 },
        { id: 'm2', categoryId: 'action', name: 'Bravo', posterUrl: null, year: 2024 },
        { id: 'm3', categoryId: 'drama', name: 'Charlie', posterUrl: null, year: 2023 },
      ])
      .mockResolvedValueOnce([{ id: 'm1', name: 'Alpha', posterUrl: null, year: 2025 }]);
    const getFirstAsync = jest.fn().mockResolvedValue({ total: 3 });
    jest.mocked(getDatabase).mockResolvedValue({ getAllAsync, getFirstAsync } as never);

    const result = await new CatalogRepository().overview('movie');

    expect(result.groups[0]?.preview).toHaveLength(2);
    expect(result.groups[1]?.preview[0]?.id).toBe('m3');
    expect(getAllAsync).toHaveBeenCalledTimes(3);
    expect(getAllAsync.mock.calls[1]?.[0]).toContain('ROW_NUMBER() OVER');
  });
});
