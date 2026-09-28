import { storeXtreamCatalog } from '../repositories/XtreamImportRepository';
import { syncXtreamCatalog } from '../repositories/XtreamSyncRepository';
import { Platform } from 'react-native';
import { deleteCredentials, loadCredentials, saveCredentials } from '../storage/credentialVault';
import { getDatabase } from '../storage/database';
import { createId, stableId } from '../utils/ids';
import { fetchXtreamCatalog, fetchXtreamSeriesEpisodes, normalizeXtreamServer, xtreamMediaUrl } from './xtreamClient';
import { liveMarkerCandidates } from './playbackStrategy';
import type { Channel, Playlist, XtreamCredentials } from '../types/domain';
import { episodeDisplayName, naturalSortKey } from './channelPresentation';

type XtreamAccess = { endpoint: string; credentials: XtreamCredentials };
const xtreamAccessCache = new Map<string, Promise<XtreamAccess>>();
const resolvedMediaCache = new Map<string, { expiresAt: number; value: Promise<string> }>();
const RESOLVED_MEDIA_TTL_MS = 5 * 60 * 1000;

function cacheXtreamAccess(playlistId: string, endpoint: string, credentials: XtreamCredentials) {
  xtreamAccessCache.set(playlistId, Promise.resolve({ endpoint, credentials }));
}

async function loadXtreamAccess(playlistId: string): Promise<XtreamAccess> {
  const cached = xtreamAccessCache.get(playlistId);
  if (cached) return cached;
  const pending = Promise.all([
    getDatabase().then((database) => database.getFirstAsync<{ endpoint: string }>('SELECT endpoint FROM playlists WHERE id = ?', playlistId)),
    loadCredentials(playlistId),
  ]).then(([source, credentials]) => {
    if (!source?.endpoint || !credentials || !('username' in credentials)) throw new Error('Identifiants Xtream indisponibles sur cet appareil.');
    return { endpoint: source.endpoint, credentials };
  }).catch((error) => {
    xtreamAccessCache.delete(playlistId);
    throw error;
  });
  xtreamAccessCache.set(playlistId, pending);
  return pending;
}

export async function importXtream(name: string, serverUrl: string, credentials: XtreamCredentials) {
  const endpoint = normalizeXtreamServer(serverUrl);
  const playlistId = createId('playlist');
  const catalog = await fetchXtreamCatalog(endpoint, credentials);
  const counts = await storeXtreamCatalog(playlistId, name, endpoint, stableId('xtream-source', `${endpoint}\0${credentials.username}`), catalog);
  try { await saveCredentials(playlistId, credentials); cacheXtreamAccess(playlistId, endpoint, credentials); }
  catch (error) { await getDatabase().then((db) => db.runAsync('DELETE FROM playlists WHERE id = ?', playlistId)); throw error; }
  return { playlistId, ...counts };
}

export async function refreshXtreamPlaylist(playlist: Playlist) {
  if (playlist.sourceKind !== 'xtream' || !playlist.endpoint) throw new Error('Cette source Xtream ne peut pas être actualisée.');
  const credentials = await loadCredentials(playlist.id);
  if (!credentials || !('username' in credentials)) throw new Error('Identifiants Xtream indisponibles sur cet appareil.');
  const database = await getDatabase();
  await database.runAsync(`UPDATE playlists SET sync_status = 'syncing', last_error = NULL WHERE id = ?`, playlist.id);
  try {
    const catalog = await fetchXtreamCatalog(playlist.endpoint, credentials);
    const cachedSeries = await database.getAllAsync<{ id: string; external_id: string | null }>(
      `SELECT DISTINCT s.id, s.external_id FROM series s JOIN episodes ep ON ep.series_id = s.id WHERE s.playlist_id = ?`,
      playlist.id,
    );
    const incomingSeriesIds = new Set(catalog.series.map((item) => stableId('series', `${playlist.id}:${item.series_id}`)));
    const episodeCatalogs = new Map<string, Awaited<ReturnType<typeof fetchXtreamSeriesEpisodes>>>();
    for (const item of cachedSeries) {
      if (!item.external_id || !incomingSeriesIds.has(item.id)) continue;
      episodeCatalogs.set(item.id, await fetchXtreamSeriesEpisodes(playlist.endpoint, credentials, item.external_id));
    }
    return await syncXtreamCatalog(playlist.id, catalog, episodeCatalogs);
  } catch (error) {
    await database.runAsync(`UPDATE playlists SET sync_status = 'error', last_error = ? WHERE id = ?`, 'Synchronisation Xtream impossible. Le dernier catalogue valide a été conservé.', playlist.id);
    throw error;
  }
}

export async function resolveXtreamChannel(channel: Channel): Promise<Channel> {
  return (await resolveXtreamChannelCandidates(channel))[0]!;
}

export async function resolveXtreamChannelCandidates(channel: Channel): Promise<Channel[]> {
  if (!channel.streamUrl.startsWith('xtream://')) return [channel];
  const { endpoint, credentials } = await loadXtreamAccess(channel.playlistId);
  return liveMarkerCandidates(channel.streamUrl, Platform.OS).map((marker) => ({ ...channel, streamUrl: xtreamMediaUrl(endpoint, credentials, marker) }));
}

export function compatibleLiveMarker(marker: string, platform: string) {
  return liveMarkerCandidates(marker, platform)[0];
}

export async function resolveXtreamMedia(playlistId: string, marker: string) {
  if (!marker.startsWith('xtream://')) return marker;
  const key = `${playlistId}\0${marker}`;
  const cached = resolvedMediaCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = loadXtreamAccess(playlistId)
    .then(({ endpoint, credentials }) => xtreamMediaUrl(endpoint, credentials, marker))
    .catch((error) => {
      resolvedMediaCache.delete(key);
      throw error;
    });
  resolvedMediaCache.set(key, { expiresAt: Date.now() + RESOLVED_MEDIA_TTL_MS, value });
  if (resolvedMediaCache.size > 32) resolvedMediaCache.delete(resolvedMediaCache.keys().next().value!);
  return value;
}

export function prefetchXtreamMedia(playlistId: string, marker: string) {
  return resolveXtreamMedia(playlistId, marker).then(() => undefined);
}

export async function syncXtreamSeriesEpisodes(seriesId: string) {
  const database = await getDatabase();
  const source = await database.getFirstAsync<{ playlist_id: string; external_id: string | null; endpoint: string }>(`SELECT s.playlist_id, s.external_id, p.endpoint FROM series s JOIN playlists p ON p.id = s.playlist_id WHERE s.id = ?`, seriesId);
  if (!source) return 0;
  const credentials = await loadCredentials(source.playlist_id);
  if (!credentials || !('username' in credentials)) throw new Error('Identifiants Xtream indisponibles sur cet appareil.');
  let externalId = source.external_id;
  if (!externalId) {
    const catalog = await fetchXtreamCatalog(source.endpoint, credentials);
    const matchingSeries = catalog.series.find((item) => stableId('series', `${source.playlist_id}:${item.series_id}`) === seriesId);
    if (!matchingSeries) return 0;
    externalId = String(matchingSeries.series_id);
    await database.runAsync('UPDATE series SET external_id = ? WHERE id = ?', externalId, seriesId);
  }
  const episodes = await fetchXtreamSeriesEpisodes(source.endpoint, credentials, externalId);
  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM episodes WHERE series_id = ?', seriesId);
    for (const episode of episodes) {
      const displayName = episodeDisplayName(episode.name, episode.season, episode.episode);
      await database.runAsync(`INSERT INTO episodes (id, series_id, season_number, episode_number, name, display_name, sort_name, stream_url, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, stableId('episode', `${seriesId}:${episode.id}`), seriesId, episode.season, episode.episode, episode.name, displayName, naturalSortKey(displayName), `xtream://series/${episode.id}.${episode.extension}`, episode.durationSeconds);
    }
  });
  return episodes.length;
}

export async function removeXtreamCredentials(playlistId: string) {
  xtreamAccessCache.delete(playlistId);
  for (const key of resolvedMediaCache.keys()) if (key.startsWith(`${playlistId}\0`)) resolvedMediaCache.delete(key);
  await deleteCredentials(playlistId);
}
