import { getDatabase } from '../storage/database';
import type { SourceKind } from '../types/domain';
import { stableId } from '../utils/ids';
import type { ParsedM3uChannel } from '../services/m3uParser';
import type { HttpValidators } from '../services/httpValidators';
import { categoryDisplayName, categorySortKey, channelDisplayName, naturalSortKey } from '../services/channelPresentation';
import {
  createPlaylistSyncReport,
  type ExistingChannelSnapshot,
  type PlaylistSyncReport,
} from '../services/playlistSync';

export type StoreM3uImportInput = {
  playlistId: string;
  name: string;
  sourceKind: Extract<SourceKind, 'm3u-url' | 'm3u-file'>;
  endpoint: string;
  sourceFingerprint: string;
  channels: ParsedM3uChannel[];
  httpValidators?: HttpValidators;
};

type ExistingChannelRow = {
  name: string;
  stream_url: string;
  group_title: string | null;
  tvg_id: string | null;
  tvg_name: string | null;
  logo_url: string | null;
  language: string | null;
  country: string | null;
  is_favorite: number;
  last_watched_at: string | null;
};

export class DuplicatePlaylistError extends Error {
  constructor(public readonly existingPlaylistId: string, existingName: string) {
    super(`Cette source existe déjà dans « ${existingName} ».`);
    this.name = 'DuplicatePlaylistError';
  }
}

async function findDuplicate(sourceFingerprint: string, sourceKind: SourceKind, endpoint: string) {
  const database = await getDatabase();
  return database.getFirstAsync<{ id: string; name: string; source_fingerprint: string | null }>(
    `SELECT id, name, source_fingerprint FROM playlists
     WHERE source_fingerprint = ? OR (source_kind = ? AND endpoint = ?)
     ORDER BY updated_at DESC LIMIT 1`,
    sourceFingerprint,
    sourceKind,
    endpoint,
  );
}

async function insertChannels(
  playlistId: string,
  channels: ParsedM3uChannel[],
  preserved = new Map<string, ExistingChannelSnapshot>(),
) {
  const database = await getDatabase();
  const categoryStatement = await database.prepareAsync(
    `INSERT INTO categories (id, playlist_id, name, display_name, sort_name, kind, position)
     VALUES (?, ?, ?, ?, ?, 'live', ?)`,
  );
  const channelStatement = await database.prepareAsync(
    `INSERT INTO channels (
      id, playlist_id, category_id, name, display_name, sort_name, stream_url, tvg_id, tvg_name,
      logo_url, language, country, is_favorite, last_watched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  try {
    const categoryIds = new Map<string, string>();
    for (const channel of channels) {
      let categoryId = categoryIds.get(channel.groupTitle);
      if (!categoryId) {
        categoryId = stableId('category', `${playlistId}:${channel.groupTitle}`);
        categoryIds.set(channel.groupTitle, categoryId);
        await categoryStatement.executeAsync(
          categoryId,
          playlistId,
          channel.groupTitle,
          categoryDisplayName(channel.groupTitle),
          categorySortKey(channel.groupTitle),
          categoryIds.size - 1,
        );
      }

      const previous = preserved.get(channel.streamUrl);
      const displayName = channelDisplayName(channel.name);
      await channelStatement.executeAsync(
        stableId('channel', `${playlistId}:${channel.streamUrl}`),
        playlistId,
        categoryId,
        channel.name,
        displayName,
        naturalSortKey(displayName),
        channel.streamUrl,
        channel.tvgId,
        channel.tvgName,
        channel.logoUrl,
        channel.language,
        channel.country,
        previous?.isFavorite ? 1 : 0,
        previous?.lastWatchedAt ?? null,
      );
    }
  } finally {
    await categoryStatement.finalizeAsync();
    await channelStatement.finalizeAsync();
  }
}

function mapExisting(row: ExistingChannelRow): ExistingChannelSnapshot {
  return {
    name: row.name,
    streamUrl: row.stream_url,
    groupTitle: row.group_title || 'Sans catégorie',
    tvgId: row.tvg_id,
    tvgName: row.tvg_name,
    logoUrl: row.logo_url,
    language: row.language,
    country: row.country,
    isFavorite: row.is_favorite === 1,
    lastWatchedAt: row.last_watched_at,
  };
}

export async function storeM3uImport(input: StoreM3uImportInput) {
  const duplicate = await findDuplicate(input.sourceFingerprint, input.sourceKind, input.endpoint);
  if (duplicate) {
    if (!duplicate.source_fingerprint) {
      const database = await getDatabase();
      await database.runAsync(
        'UPDATE OR IGNORE playlists SET source_fingerprint = ? WHERE id = ?',
        input.sourceFingerprint,
        duplicate.id,
      );
    }
    throw new DuplicatePlaylistError(duplicate.id, duplicate.name);
  }

  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO playlists (
        id, name, source_kind, endpoint, source_fingerprint, created_at, updated_at,
        last_synced_at, channel_count, sync_status, last_error, http_etag, http_last_modified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', NULL, ?, ?)`,
      input.playlistId,
      input.name,
      input.sourceKind,
      input.endpoint,
      input.sourceFingerprint,
      now,
      now,
      now,
      input.channels.length,
      input.httpValidators?.etag ?? null,
      input.httpValidators?.lastModified ?? null,
    );
    await insertChannels(input.playlistId, input.channels);
  });
}

export async function setPlaylistSyncing(playlistId: string) {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE playlists SET sync_status = 'syncing', last_error = NULL WHERE id = ?`,
    playlistId,
  );
}

export async function markPlaylistSyncFailed(playlistId: string, message: string) {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE playlists SET sync_status = 'error', last_error = ?, updated_at = ? WHERE id = ?`,
    message,
    new Date().toISOString(),
    playlistId,
  );
}

export async function replaceM3uContent(
  playlistId: string,
  channels: ParsedM3uChannel[],
  httpValidators?: HttpValidators,
): Promise<PlaylistSyncReport> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<ExistingChannelRow>(
    `SELECT ch.name, ch.stream_url, c.name AS group_title, ch.tvg_id, ch.tvg_name,
            ch.logo_url, ch.language, ch.country, ch.is_favorite, ch.last_watched_at
     FROM channels ch LEFT JOIN categories c ON c.id = ch.category_id
     WHERE ch.playlist_id = ?`,
    playlistId,
  );
  const existing = rows.map(mapExisting);
  const report = createPlaylistSyncReport(existing, channels);
  const preserved = new Map(existing.map((channel) => [channel.streamUrl, channel]));
  const now = new Date().toISOString();

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM channels WHERE playlist_id = ?', playlistId);
    await database.runAsync('DELETE FROM categories WHERE playlist_id = ?', playlistId);
    await insertChannels(playlistId, channels, preserved);
    await database.runAsync(
      `UPDATE playlists SET channel_count = ?, sync_status = 'ready', last_error = NULL,
       last_synced_at = ?, updated_at = ?, http_etag = ?, http_last_modified = ? WHERE id = ?`,
      channels.length,
      now,
      now,
      httpValidators?.etag ?? null,
      httpValidators?.lastModified ?? null,
      playlistId,
    );
  });

  return report;
}

export async function markPlaylistUnchanged(
  playlistId: string,
  httpValidators: HttpValidators,
) {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE playlists SET sync_status = 'ready', last_error = NULL, last_synced_at = ?,
     updated_at = ?, http_etag = ?, http_last_modified = ? WHERE id = ?`,
    now,
    now,
    httpValidators.etag,
    httpValidators.lastModified,
    playlistId,
  );
}
