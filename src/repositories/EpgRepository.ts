import { getDatabase } from '../storage/database';
import type { EpgProgramme } from '../types/domain';
import { stableId } from '../utils/ids';
import type { HttpValidators } from '../services/httpValidators';
import type { ParsedXmltvProgramme } from '../services/xmltvParser';

type EpgRow = { id: string; playlist_id: string; channel_tvg_id: string; title: string; description: string | null; starts_at: string; ends_at: string };
function map(row: EpgRow): EpgProgramme {
  return { id: row.id, playlistId: row.playlist_id, channelTvgId: row.channel_tvg_id, title: row.title, description: row.description, startsAt: row.starts_at, endsAt: row.ends_at };
}

export async function replaceEpg(playlistId: string, endpoint: string, programmes: ParsedXmltvProgramme[], validators: HttpValidators) {
  const database = await getDatabase();
  const statement = await database.prepareAsync('INSERT INTO epg_programmes (id, playlist_id, channel_tvg_id, title, description, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const now = new Date();
  const cutoff = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
  const ceiling = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString();
  try {
    await database.withTransactionAsync(async () => {
      await database.runAsync('DELETE FROM epg_programmes WHERE playlist_id = ?', playlistId);
      for (const programme of programmes) {
        if (programme.endsAt < cutoff || programme.startsAt > ceiling) continue;
        await statement.executeAsync(stableId('epg', `${playlistId}:${programme.channelTvgId}:${programme.startsAt}`), playlistId, programme.channelTvgId, programme.title, programme.description, programme.startsAt, programme.endsAt);
      }
      await database.runAsync(`INSERT INTO epg_sources (playlist_id, endpoint, http_etag, http_last_modified, last_synced_at, expires_at, last_error)
        VALUES (?, ?, ?, ?, ?, ?, NULL) ON CONFLICT(playlist_id) DO UPDATE SET endpoint=excluded.endpoint, http_etag=excluded.http_etag,
        http_last_modified=excluded.http_last_modified, last_synced_at=excluded.last_synced_at, expires_at=excluded.expires_at, last_error=NULL`,
      playlistId, endpoint, validators.etag, validators.lastModified, now.toISOString(), new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString());
    });
  } finally { await statement.finalizeAsync(); }
}

export class EpgRepository {
  async nowNext(playlistId: string, tvgId: string | null, tvgName: string | null, channelName: string, at = new Date()) {
    const database = await getDatabase();
    const keys = [tvgId, tvgName, channelName].filter((value): value is string => Boolean(value?.trim()));
    if (keys.length === 0) return [];
    const placeholders = keys.map(() => '?').join(',');
    const rows = await database.getAllAsync<EpgRow>(`SELECT * FROM epg_programmes WHERE playlist_id = ? AND channel_tvg_id IN (${placeholders}) AND ends_at > ? ORDER BY starts_at LIMIT 2`, playlistId, ...keys, at.toISOString());
    return rows.map(map);
  }
}
