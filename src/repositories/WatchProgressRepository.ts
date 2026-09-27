import { getDatabase } from '../storage/database';
import { shouldKeepProgress } from '../services/watchProgressPolicy';
import type { WatchProgress } from '../types/domain';

export type ContinueWatchingItem = WatchProgress & {
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
};

type ProgressRow = {
  media_id: string;
  media_kind: 'movie' | 'episode';
  position_seconds: number;
  duration_seconds: number;
  updated_at: string;
};

const mapProgress = (row: ProgressRow): WatchProgress => ({
  mediaId: row.media_id,
  mediaKind: row.media_kind,
  positionSeconds: row.position_seconds,
  durationSeconds: row.duration_seconds,
  updatedAt: row.updated_at,
});

export class WatchProgressRepository {
  async get(mediaId: string, mediaKind: 'movie' | 'episode') {
    const database = await getDatabase();
    const row = await database.getFirstAsync<ProgressRow>('SELECT * FROM watch_progress WHERE media_id = ? AND media_kind = ?', mediaId, mediaKind);
    return row ? mapProgress(row) : null;
  }

  async save(mediaId: string, mediaKind: 'movie' | 'episode', positionSeconds: number, durationSeconds: number) {
    if (!Number.isFinite(positionSeconds) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return;
    if (!shouldKeepProgress(positionSeconds, durationSeconds)) {
      await this.clear(mediaId, mediaKind);
      return;
    }
    const database = await getDatabase();
    const persist = async () => {
      if (mediaKind === 'episode') {
        await database.runAsync(
          `DELETE FROM watch_progress
           WHERE media_kind = 'episode' AND media_id <> ? AND media_id IN (
             SELECT sibling.id FROM episodes sibling
             JOIN episodes current ON current.series_id = sibling.series_id
             WHERE current.id = ?
           )`,
          mediaId, mediaId,
        );
      }
      await database.runAsync(
        `INSERT INTO watch_progress (media_id, media_kind, position_seconds, duration_seconds, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(media_id, media_kind) DO UPDATE SET position_seconds = excluded.position_seconds, duration_seconds = excluded.duration_seconds, updated_at = excluded.updated_at`,
        mediaId, mediaKind, positionSeconds, durationSeconds, new Date().toISOString(),
      );
    };
    if (mediaKind === 'episode') await database.withTransactionAsync(persist);
    else await persist();
  }

  async clear(mediaId: string, mediaKind: 'movie' | 'episode') {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM watch_progress WHERE media_id = ? AND media_kind = ?', mediaId, mediaKind);
  }

  async continueWatching(limit = 16): Promise<ContinueWatchingItem[]> {
    const database = await getDatabase();
    return database.getAllAsync<ContinueWatchingItem>(
      `WITH latest_series_progress AS (
         SELECT wp.media_id, wp.media_kind, wp.position_seconds, wp.duration_seconds, wp.updated_at,
                ep.name AS episode_name, ep.season_number, ep.episode_number, ep.series_id,
                ROW_NUMBER() OVER (PARTITION BY ep.series_id ORDER BY wp.updated_at DESC) AS series_rank
         FROM watch_progress wp
         JOIN episodes ep ON wp.media_kind = 'episode' AND ep.id = wp.media_id
       )
       SELECT wp.media_id AS mediaId, wp.media_kind AS mediaKind, wp.position_seconds AS positionSeconds,
              wp.duration_seconds AS durationSeconds, wp.updated_at AS updatedAt,
              m.name AS title, NULL AS subtitle, m.poster_url AS imageUrl
       FROM watch_progress wp JOIN movies m ON wp.media_kind = 'movie' AND m.id = wp.media_id
       UNION ALL
       SELECT latest.media_id AS mediaId, latest.media_kind AS mediaKind, latest.position_seconds AS positionSeconds,
              latest.duration_seconds AS durationSeconds, latest.updated_at AS updatedAt,
              s.name AS title, 'S' || latest.season_number || ' E' || latest.episode_number || ' · ' || latest.episode_name AS subtitle,
              s.poster_url AS imageUrl
       FROM latest_series_progress latest JOIN series s ON s.id = latest.series_id
       WHERE latest.series_rank = 1
       ORDER BY updatedAt DESC LIMIT ?`,
      limit,
    );
  }

  async resumeEpisodeForSeries(seriesId: string) {
    const database = await getDatabase();
    return database.getFirstAsync<{ id: string; position_seconds: number }>(
      `SELECT ep.id, wp.position_seconds FROM watch_progress wp
       JOIN episodes ep ON ep.id = wp.media_id AND wp.media_kind = 'episode'
       WHERE ep.series_id = ? ORDER BY wp.updated_at DESC LIMIT 1`,
      seriesId,
    );
  }
}
