import { compatibleLiveMarker } from '../services/xtreamImportService';

jest.mock('../storage/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../storage/credentialVault', () => ({ deleteCredentials: jest.fn(), loadCredentials: jest.fn(), saveCredentials: jest.fn() }));

describe('lecture Xtream par plateforme', () => {
  it('utilise HLS sur iOS pour éviter les flux TS progressifs incompatibles', () => {
    expect(compatibleLiveMarker('xtream://live/42.ts', 'ios')).toBe('xtream://live/42.m3u8');
  });

  it('conserve le flux TS sur Android', () => {
    expect(compatibleLiveMarker('xtream://live/42.ts', 'android')).toBe('xtream://live/42.ts');
  });

  it('ne modifie pas les films', () => {
    expect(compatibleLiveMarker('xtream://movie/42.mp4', 'ios')).toBe('xtream://movie/42.mp4');
  });
});
