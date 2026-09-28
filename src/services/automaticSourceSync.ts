import { SQLitePlaylistRepository } from '../repositories/SQLitePlaylistRepository';
import { preferences } from '../storage/preferences';
import { invalidateCatalogData } from './catalogInvalidation';
import { refreshM3uPlaylist } from './m3uImportService';
import { isSourceStale } from './sourceSyncPolicy';
import { refreshXtreamPlaylist } from './xtreamImportService';

const repository = new SQLitePlaylistRepository();
const RETRY_COOLDOWN_MS = 5 * 60 * 1000;

let currentRun: Promise<AutomaticSyncReport> | null = null;
let lastAttemptAt = 0;

export type AutomaticSyncReport = {
  checked: number;
  refreshed: number;
  failed: number;
};

async function performAutomaticSourceSync(now: number): Promise<AutomaticSyncReport> {
  const intervalHours = preferences.getAutoSyncIntervalHours();
  if (intervalHours === 0) return { checked: 0, refreshed: 0, failed: 0 };

  const sources = (await repository.list()).filter((source) =>
    isSourceStale(source, now, intervalHours),
  );
  const report: AutomaticSyncReport = { checked: sources.length, refreshed: 0, failed: 0 };

  // Run sequentially: IPTV providers often throttle parallel catalog requests.
  for (const source of sources) {
    try {
      if (source.sourceKind === 'xtream') await refreshXtreamPlaylist(source);
      else await refreshM3uPlaylist(source);
      report.refreshed += 1;
    } catch {
      report.failed += 1;
    }
  }

  if (report.refreshed > 0) invalidateCatalogData();
  return report;
}

export function runAutomaticSourceSync(now = Date.now()) {
  if (currentRun) return currentRun;
  if (now - lastAttemptAt < RETRY_COOLDOWN_MS) {
    return Promise.resolve({ checked: 0, refreshed: 0, failed: 0 });
  }

  lastAttemptAt = now;
  currentRun = performAutomaticSourceSync(now).finally(() => {
    currentRun = null;
  });
  return currentRun;
}

export function resetAutomaticSyncStateForTests() {
  currentRun = null;
  lastAttemptAt = 0;
}
