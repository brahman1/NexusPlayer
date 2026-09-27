export type SourceKind = 'm3u-url' | 'm3u-file' | 'xtream' | 'stalker';

export type SyncStatus = 'idle' | 'syncing' | 'ready' | 'error';

export interface Playlist {
  id: string;
  name: string;
  sourceKind: SourceKind;
  endpoint: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
  channelCount: number;
  syncStatus: SyncStatus;
  lastError: string | null;
  httpEtag: string | null;
  httpLastModified: string | null;
}

export interface Category {
  id: string;
  playlistId: string;
  name: string;
  displayName: string;
  kind: 'live' | 'movie' | 'series';
  position: number;
}

export interface Channel {
  id: string;
  playlistId: string;
  categoryId: string | null;
  name: string;
  displayName: string;
  streamUrl: string;
  tvgId: string | null;
  tvgName: string | null;
  logoUrl: string | null;
  language: string | null;
  country: string | null;
  isFavorite: boolean;
  lastWatchedAt: string | null;
}

export interface Movie {
  id: string;
  playlistId: string;
  categoryId: string | null;
  name: string;
  streamUrl: string;
  posterUrl: string | null;
  plot: string | null;
  releaseYear: number | null;
  isFavorite: boolean;
}

export interface Series {
  id: string;
  playlistId: string;
  categoryId: string | null;
  name: string;
  posterUrl: string | null;
  plot: string | null;
  isFavorite: boolean;
}

export interface Episode {
  id: string;
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  streamUrl: string;
  durationSeconds: number | null;
}

export interface WatchProgress {
  mediaId: string;
  mediaKind: 'movie' | 'episode';
  positionSeconds: number;
  durationSeconds: number;
  updatedAt: string;
}

export interface EpgProgramme {
  id: string;
  playlistId: string;
  channelTvgId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
}

export interface XtreamCredentials {
  username: string;
  password: string;
}

export interface StalkerCredentials {
  macAddress: string;
  token?: string;
}

export type SourceCredentials = XtreamCredentials | StalkerCredentials;
