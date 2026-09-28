import type { Playlist } from '../types/domain';

export function isSourceStale(
  playlist: Playlist,
  now: number,
  intervalHours: number,
) {
  if (intervalHours <= 0 || playlist.syncStatus === 'syncing') return false;
  if (playlist.sourceKind !== 'xtream' && playlist.sourceKind !== 'm3u-url') return false;
  if (!playlist.endpoint || !playlist.lastSyncedAt) return Boolean(playlist.endpoint);
  const lastSync = Date.parse(playlist.lastSyncedAt);
  return !Number.isFinite(lastSync) || now - lastSync >= intervalHours * 60 * 60 * 1000;
}
