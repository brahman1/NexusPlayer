import { getDatabase } from '../storage/database';
import { WatchProgressRepository } from '../repositories/WatchProgressRepository';

jest.mock('../storage/database', () => ({ getDatabase: jest.fn() }));

const mockedGetDatabase = jest.mocked(getDatabase);

describe('WatchProgressRepository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ne conserve qu’un épisode récent par série dans Continuer à regarder', async () => {
    const getAllAsync = jest.fn().mockResolvedValue([]);
    mockedGetDatabase.mockResolvedValue({ getAllAsync } as never);

    await new WatchProgressRepository().continueWatching(9);

    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('PARTITION BY ep.series_id'),
      9,
    );
    expect(getAllAsync.mock.calls[0][0]).toContain('latest.series_rank = 1');
  });

  it('retire les anciennes reprises de la série avant de sauvegarder un épisode', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const database = {
      runAsync,
      withTransactionAsync: jest.fn(async (action: () => Promise<void>) => action()),
    };
    mockedGetDatabase.mockResolvedValue(database as never);

    await new WatchProgressRepository().save('episode-2', 'episode', 120, 1800);

    expect(database.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(runAsync.mock.calls[0][0]).toContain("media_kind = 'episode'");
    expect(runAsync.mock.calls[0].slice(1)).toEqual(['episode-2', 'episode-2']);
    expect(runAsync.mock.calls[1][0]).toContain('INSERT INTO watch_progress');
  });
});
