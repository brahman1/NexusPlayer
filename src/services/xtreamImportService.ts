import { storeXtreamCatalog } from '../repositories/XtreamImportRepository';
import { Platform } from 'react-native';
import { deleteCredentials, loadCredentials, saveCredentials } from '../storage/credentialVault';
import { getDatabase } from '../storage/database';
import { createId, stableId } from '../utils/ids';
import { fetchXtreamCatalog, fetchXtreamSeriesEpisodes, normalizeXtreamServer, xtreamMediaUrl } from './xtreamClient';
import type { Channel, XtreamCredentials } from '../types/domain';

export async function importXtream(name: string, serverUrl: string, credentials: XtreamCredentials) {
  const endpoint = normalizeXtreamServer(serverUrl);
  const playlistId = createId('playlist');
  const catalog = await fetchXtreamCatalog(endpoint, credentials);
  const counts = await storeXtreamCatalog(playlistId, name, endpoint, stableId('xtream-source', `${endpoint}\0${credentials.username}`), catalog);
  try { await saveCredentials(playlistId, credentials); }
  catch (error) { await getDatabase().then((db) => db.runAsync('DELETE FROM playlists WHERE id = ?', playlistId)); throw error; }
  return { playlistId, ...counts };
}

export async function resolveXtreamChannel(channel: Channel) {
  if (!channel.streamUrl.startsWith('xtream://')) return channel;
  const database = await getDatabase();
  const source = await database.getFirstAsync<{ endpoint: string }>('SELECT endpoint FROM playlists WHERE id = ?', channel.playlistId);
  const credentials = await loadCredentials(channel.playlistId);
  if (!source?.endpoint || !credentials || !('username' in credentials)) throw new Error('Identifiants Xtream indisponibles sur cet appareil.');
  const marker = compatibleLiveMarker(channel.streamUrl, Platform.OS);
  return { ...channel, streamUrl: xtreamMediaUrl(source.endpoint, credentials, marker) };
}

export function compatibleLiveMarker(marker: string, platform: string) {
  return platform === 'ios' && /^xtream:\/\/live\/\d+\.ts$/i.test(marker)
    ? marker.replace(/\.ts$/i, '.m3u8')
    : marker;
}

export async function resolveXtreamMedia(playlistId: string, marker: string) {
  if (!marker.startsWith('xtream://')) return marker;
  const database = await getDatabase();
  const source = await database.getFirstAsync<{ endpoint: string }>('SELECT endpoint FROM playlists WHERE id = ?', playlistId);
  const credentials = await loadCredentials(playlistId);
  if (!source?.endpoint || !credentials || !('username' in credentials)) throw new Error('Identifiants Xtream indisponibles sur cet appareil.');
  return xtreamMediaUrl(source.endpoint, credentials, marker);
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
      await database.runAsync(`INSERT INTO episodes (id, series_id, season_number, episode_number, name, stream_url, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?)`, stableId('episode', `${seriesId}:${episode.id}`), seriesId, episode.season, episode.episode, episode.name, `xtream://series/${episode.id}.${episode.extension}`, episode.durationSeconds);
    }
  });
  return episodes.length;
}

export async function removeXtreamCredentials(playlistId: string) { await deleteCredentials(playlistId); }
