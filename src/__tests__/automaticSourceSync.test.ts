import { isSourceStale } from '../services/sourceSyncPolicy';
import type { Playlist } from '../types/domain';

const base: Playlist = {
  id: 'source',
  name: 'Source',
  sourceKind: 'xtream',
  endpoint: 'https://provider.invalid',
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
  lastSyncedAt: '2026-09-28T06:00:00.000Z',
  channelCount: 10,
  syncStatus: 'ready',
  lastError: null,
  httpEtag: null,
  httpLastModified: null,
};

describe('automatic source sync policy', () => {
  const now = Date.parse('2026-09-28T12:30:00.000Z');

  it('refreshes a remote source once its interval has elapsed', () => {
    expect(isSourceStale(base, now, 6)).toBe(true);
    expect(isSourceStale({ ...base, lastSyncedAt: '2026-09-28T08:00:00.000Z' }, now, 6)).toBe(false);
  });

  it('does not refresh local files, active syncs or manual mode', () => {
    expect(isSourceStale({ ...base, sourceKind: 'm3u-file' }, now, 6)).toBe(false);
    expect(isSourceStale({ ...base, syncStatus: 'syncing' }, now, 6)).toBe(false);
    expect(isSourceStale(base, now, 0)).toBe(false);
  });

  it('refreshes a never-synced remote source', () => {
    expect(isSourceStale({ ...base, lastSyncedAt: null }, now, 6)).toBe(true);
  });
});
