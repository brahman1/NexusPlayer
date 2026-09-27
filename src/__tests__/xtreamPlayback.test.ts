import { getDatabase } from '../storage/database';
import { loadCredentials } from '../storage/credentialVault';
import { compatibleLiveMarker, resolveXtreamMedia } from '../services/xtreamImportService';

jest.mock('../storage/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../storage/credentialVault', () => ({ deleteCredentials: jest.fn(), loadCredentials: jest.fn(), saveCredentials: jest.fn() }));

describe('lecture Xtream par plateforme', () => {
  beforeEach(() => jest.clearAllMocks());

  it('utilise HLS sur iOS pour éviter les flux TS progressifs incompatibles', () => {
    expect(compatibleLiveMarker('xtream://live/42.ts', 'ios')).toBe('xtream://live/42.m3u8');
  });

  it('conserve le flux TS sur Android', () => {
    expect(compatibleLiveMarker('xtream://live/42.ts', 'android')).toBe('xtream://live/42.ts');
  });

  it('ne modifie pas les films', () => {
    expect(compatibleLiveMarker('xtream://movie/42.mp4', 'ios')).toBe('xtream://movie/42.mp4');
  });

  it('réutilise les accès Xtream déjà chargés pour les épisodes suivants', async () => {
    const getFirstAsync = jest.fn().mockResolvedValue({ endpoint: 'https://provider.example' });
    jest.mocked(getDatabase).mockResolvedValue({ getFirstAsync } as never);
    jest.mocked(loadCredentials).mockResolvedValue({ username: 'viewer', password: 'secret' });

    const first = await resolveXtreamMedia('playlist-cache-test', 'xtream://series/41.mp4');
    const second = await resolveXtreamMedia('playlist-cache-test', 'xtream://series/42.mp4');

    expect(first).toBe('https://provider.example/series/viewer/secret/41.mp4');
    expect(second).toBe('https://provider.example/series/viewer/secret/42.mp4');
    expect(getFirstAsync).toHaveBeenCalledTimes(1);
    expect(loadCredentials).toHaveBeenCalledTimes(1);
  });
});
