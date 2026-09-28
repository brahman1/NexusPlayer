import { cachedOverview, CatalogRepository, catalogWhere } from '../repositories/CatalogRepository';
import { getDatabase } from '../storage/database';

jest.mock('../storage/database', () => ({ getDatabase: jest.fn() }));

describe('complete catalog access', () => {
  it('searches the database before applying pagination, including titles after 2000', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([{ id: '3001', name: 'Zorro', posterUrl: null, year: 2024 }]);
    const getFirstAsync = jest.fn().mockResolvedValue({ total: 3500 });
    jest.mocked(getDatabase).mockResolvedValue({ getAllAsync, getFirstAsync } as never);
    const page = await new CatalogRepository().page('movie', { query: 'Zorro' }, 2016, 48);
    expect(page.total).toBe(3500);
    expect(page.items[0]?.id).toBe('3001');
    expect(getAllAsync).toHaveBeenCalledWith(expect.stringMatching(/WHERE m.name LIKE.*ORDER BY.*LIMIT \? OFFSET \?/), '%Zorro%', 48, 2016);
    expect(getFirstAsync).toHaveBeenCalledWith(expect.not.stringContaining('LIMIT'), '%Zorro%');
  });
  it('binds literal search characters and combines category/favorites filters', () => {
    const filter = catalogWhere({ query: "  100%_\\'  ", categoryId: 'group', favorites: true });
    expect(filter.params).toEqual(["%100\\%\\_\\\\'%", 'group']);
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
});
