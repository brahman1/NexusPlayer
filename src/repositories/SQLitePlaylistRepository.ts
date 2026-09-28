import { getDatabase } from '../storage/database';
import { translate } from '../i18n';
import type { Playlist } from '../types/domain';
import type { CreatePlaylistInput, PlaylistRepository } from './PlaylistRepository';

type PlaylistRow = {
  id: string;
  name: string;
  source_kind: Playlist['sourceKind'];
  endpoint: string | null;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
  channel_count: number;
  sync_status: Playlist['syncStatus'];
  last_error: string | null;
  http_etag: string | null;
  http_last_modified: string | null;
};

function mapPlaylist(row: PlaylistRow): Playlist {
  return {
    id: row.id,
    name: row.name,
    sourceKind: row.source_kind,
    endpoint: row.endpoint,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSyncedAt: row.last_synced_at,
    channelCount: row.channel_count,
    syncStatus: row.sync_status,
    lastError: row.last_error,
    httpEtag: row.http_etag,
    httpLastModified: row.http_last_modified,
  };
}

export class SQLitePlaylistRepository implements PlaylistRepository {
  async list() {
    const database = await getDatabase();
    const rows = await database.getAllAsync<PlaylistRow>(
      'SELECT * FROM playlists ORDER BY updated_at DESC',
    );
    return rows.map(mapPlaylist);
  }

  async findById(id: string) {
    const database = await getDatabase();
    const row = await database.getFirstAsync<PlaylistRow>(
      'SELECT * FROM playlists WHERE id = ?',
      id,
    );
    return row ? mapPlaylist(row) : null;
  }

  async create(input: CreatePlaylistInput) {
    const database = await getDatabase();
    const now = new Date().toISOString();

    await database.runAsync(
      `INSERT INTO playlists (
        id, name, source_kind, endpoint, created_at, updated_at,
        last_synced_at, channel_count, sync_status, last_error
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, 0, 'idle', NULL)`,
      input.id,
      input.name,
      input.sourceKind,
      input.endpoint,
      now,
      now,
    );

    const playlist = await this.findById(input.id);
    if (!playlist) {
      throw new Error(translate('La playlist créée est introuvable.', 'The created playlist could not be found.'));
    }

    return playlist;
  }

  async rename(id: string, name: string) {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE playlists SET name = ?, updated_at = ? WHERE id = ?',
      name,
      new Date().toISOString(),
      id,
    );
  }

  async remove(id: string) {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM playlists WHERE id = ?', id);
  }
}
