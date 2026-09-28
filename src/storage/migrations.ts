export const DATABASE_VERSION = 10;

export const migrationV1 = `
  CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    source_kind TEXT NOT NULL,
    endpoint TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_synced_at TEXT,
    channel_count INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'idle',
    last_error TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    playlist_id TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY NOT NULL,
    playlist_id TEXT NOT NULL,
    category_id TEXT,
    name TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    tvg_id TEXT,
    tvg_name TEXT,
    logo_url TEXT,
    language TEXT,
    country TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    last_watched_at TEXT,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY NOT NULL,
    playlist_id TEXT NOT NULL,
    category_id TEXT,
    name TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    poster_url TEXT,
    plot TEXT,
    release_year INTEGER,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS series (
    id TEXT PRIMARY KEY NOT NULL,
    playlist_id TEXT NOT NULL,
    category_id TEXT,
    name TEXT NOT NULL,
    poster_url TEXT,
    plot TEXT,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS episodes (
    id TEXT PRIMARY KEY NOT NULL,
    series_id TEXT NOT NULL,
    season_number INTEGER NOT NULL,
    episode_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    duration_seconds INTEGER,
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS watch_progress (
    media_id TEXT NOT NULL,
    media_kind TEXT NOT NULL,
    position_seconds REAL NOT NULL,
    duration_seconds REAL NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (media_id, media_kind)
  );

  CREATE TABLE IF NOT EXISTS epg_programmes (
    id TEXT PRIMARY KEY NOT NULL,
    playlist_id TEXT NOT NULL,
    channel_tvg_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_categories_playlist
    ON categories(playlist_id, kind, position);
  CREATE INDEX IF NOT EXISTS idx_channels_playlist
    ON channels(playlist_id, category_id, name COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_channels_tvg
    ON channels(playlist_id, tvg_id);
  CREATE INDEX IF NOT EXISTS idx_movies_playlist
    ON movies(playlist_id, category_id, name COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_series_playlist
    ON series(playlist_id, category_id, name COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_episodes_series
    ON episodes(series_id, season_number, episode_number);
  CREATE INDEX IF NOT EXISTS idx_epg_now_next
    ON epg_programmes(playlist_id, channel_tvg_id, starts_at, ends_at);
`;

export const migrationV2 = `
  ALTER TABLE playlists ADD COLUMN source_fingerprint TEXT;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_playlists_source_fingerprint
    ON playlists(source_fingerprint)
    WHERE source_fingerprint IS NOT NULL;
`;

export const migrationV3 = `
  ALTER TABLE playlists ADD COLUMN http_etag TEXT;
  ALTER TABLE playlists ADD COLUMN http_last_modified TEXT;
`;

export const migrationV4 = `
  CREATE TABLE IF NOT EXISTS epg_sources (
    playlist_id TEXT PRIMARY KEY NOT NULL,
    endpoint TEXT NOT NULL,
    http_etag TEXT,
    http_last_modified TEXT,
    last_synced_at TEXT,
    expires_at TEXT,
    last_error TEXT,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
  );
`;

export const migrationV5 = `
  ALTER TABLE movies ADD COLUMN external_id TEXT;
  ALTER TABLE movies ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE series ADD COLUMN external_id TEXT;
  ALTER TABLE series ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
`;

export const migrationV6 = `
  ALTER TABLE categories ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
  ALTER TABLE categories ADD COLUMN sort_name TEXT NOT NULL DEFAULT '';
  ALTER TABLE channels ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
  ALTER TABLE channels ADD COLUMN sort_name TEXT NOT NULL DEFAULT '';
  CREATE INDEX IF NOT EXISTS idx_categories_display_sort
    ON categories(playlist_id, kind, sort_name COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_channels_display_sort
    ON channels(playlist_id, category_id, sort_name COLLATE NOCASE);
`;

export const migrationV7 = `
  CREATE INDEX IF NOT EXISTS idx_channels_playlist_sort
    ON channels(playlist_id, sort_name COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_channels_playlist_recent
    ON channels(playlist_id, last_watched_at DESC);
  CREATE INDEX IF NOT EXISTS idx_movies_name
    ON movies(name COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_movies_release
    ON movies(release_year DESC);
  CREATE INDEX IF NOT EXISTS idx_movies_category
    ON movies(category_id);
  CREATE INDEX IF NOT EXISTS idx_series_name
    ON series(name COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_series_category
    ON series(category_id);
`;

export const migrationV8 = `
  ALTER TABLE movies ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
  ALTER TABLE movies ADD COLUMN sort_name TEXT NOT NULL DEFAULT '';
  ALTER TABLE series ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
  ALTER TABLE series ADD COLUMN sort_name TEXT NOT NULL DEFAULT '';
  ALTER TABLE episodes ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
  ALTER TABLE episodes ADD COLUMN sort_name TEXT NOT NULL DEFAULT '';
  CREATE INDEX IF NOT EXISTS idx_movies_display_sort
    ON movies(sort_name COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_series_display_sort
    ON series(sort_name COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_episodes_display_sort
    ON episodes(series_id, season_number, episode_number, sort_name COLLATE NOCASE);
`;

export const migrationV9 = `
  CREATE INDEX IF NOT EXISTS idx_movies_category_sort
    ON movies(category_id, sort_name COLLATE NOCASE, id);
  CREATE INDEX IF NOT EXISTS idx_series_category_sort
    ON series(category_id, sort_name COLLATE NOCASE, id);
  CREATE INDEX IF NOT EXISTS idx_movies_favorite_sort
    ON movies(is_favorite, sort_name COLLATE NOCASE, id);
  CREATE INDEX IF NOT EXISTS idx_series_favorite_sort
    ON series(is_favorite, sort_name COLLATE NOCASE, id);
`;

export const migrationV10 = `
  CREATE INDEX IF NOT EXISTS idx_channels_locale_sort
    ON channels(playlist_id, country, language, sort_name COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_categories_kind_sort
    ON categories(playlist_id, kind, sort_name COLLATE NOCASE, id);
`;
