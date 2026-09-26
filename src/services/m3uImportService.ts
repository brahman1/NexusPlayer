import { File } from 'expo-file-system';

import {
  markPlaylistSyncFailed,
  markPlaylistUnchanged,
  replaceM3uContent,
  setPlaylistSyncing,
  storeM3uImport,
} from '../repositories/M3uImportRepository';
import type { Playlist } from '../types/domain';
import { createId } from '../utils/ids';
import {
  createConditionalHeaders,
  readHttpValidators,
  type HttpValidators,
} from './httpValidators';
import { parseM3u, type M3uParseResult } from './m3uParser';
import { fingerprintLocalContent, fingerprintRemoteEndpoint } from './sourceIdentity';
import { importXmltv } from './epgService';

const MAX_PLAYLIST_BYTES = 25 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 20_000;

export type M3uImportReport = M3uParseResult & { playlistId: string };

function assertUsableResult(result: M3uParseResult) {
  if (result.channels.length === 0) {
    throw new Error('Aucune chaîne HTTP ou HTTPS valide n’a été trouvée dans cette playlist.');
  }
}

function parseContent(content: string) {
  if (content.length > MAX_PLAYLIST_BYTES) {
    throw new Error('La playlist dépasse la taille maximale de 25 Mo.');
  }
  const result = parseM3u(content);
  assertUsableResult(result);
  return result;
}

async function downloadM3u(
  url: string,
  externalSignal?: AbortSignal,
  previousValidators?: HttpValidators,
) {
  const controller = new AbortController();
  const cancelFromOutside = () => controller.abort();
  externalSignal?.addEventListener('abort', cancelFromOutside, { once: true });
  if (externalSignal?.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'audio/x-mpegurl, application/vnd.apple.mpegurl, text/plain',
        ...createConditionalHeaders(previousValidators),
      },
    });
    const httpValidators = readHttpValidators(response.headers, previousValidators);
    if (response.status === 304) {
      return { kind: 'not-modified' as const, httpValidators };
    }
    if (!response.ok) throw new Error(`Le serveur a répondu avec le statut ${response.status}.`);

    const announcedSize = Number(response.headers.get('content-length') ?? 0);
    if (announcedSize > MAX_PLAYLIST_BYTES) {
      throw new Error('La playlist distante dépasse la taille maximale de 25 Mo.');
    }
    return {
      kind: 'content' as const,
      content: await response.text(),
      httpValidators,
    };
  } catch (error) {
    if (externalSignal?.aborted) throw new Error('Import annulé.');
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Le téléchargement a dépassé 20 secondes.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', cancelFromOutside);
  }
}

export async function importM3uFromUrl(name: string, url: string, signal?: AbortSignal) {
  const download = await downloadM3u(url, signal);
  if (download.kind === 'not-modified') {
    throw new Error('Le serveur a refusé de renvoyer la playlist lors du premier import.');
  }
  const result = parseContent(download.content);
  const playlistId = createId('playlist');
  await storeM3uImport({
    playlistId,
    name,
    sourceKind: 'm3u-url',
    endpoint: url,
    sourceFingerprint: fingerprintRemoteEndpoint(url),
    channels: result.channels,
    httpValidators: download.httpValidators,
  });
  if (result.epgUrls[0]) {
    try { await importXmltv(playlistId, result.epgUrls[0], signal); } catch { /* La playlist reste utilisable sans guide. */ }
  }
  return { playlistId, ...result } satisfies M3uImportReport;
}

export async function importM3uFromFile(name: string, uri: string, size?: number) {
  if (size && size > MAX_PLAYLIST_BYTES) throw new Error('Le fichier dépasse la taille maximale de 25 Mo.');
  const content = await new File(uri).text();
  const result = parseContent(content);
  const playlistId = createId('playlist');
  await storeM3uImport({
    playlistId,
    name,
    sourceKind: 'm3u-file',
    endpoint: uri,
    sourceFingerprint: fingerprintLocalContent(content),
    channels: result.channels,
  });
  if (result.epgUrls[0]) {
    try { await importXmltv(playlistId, result.epgUrls[0]); } catch { /* Import EPG relançable séparément. */ }
  }
  return { playlistId, ...result } satisfies M3uImportReport;
}

export async function refreshM3uPlaylist(playlist: Playlist, signal?: AbortSignal) {
  if (playlist.sourceKind !== 'm3u-url' || !playlist.endpoint) {
    throw new Error('Pour actualiser un fichier local, importez-le de nouveau depuis l’appareil.');
  }

  await setPlaylistSyncing(playlist.id);
  try {
    const download = await downloadM3u(playlist.endpoint, signal, {
      etag: playlist.httpEtag,
      lastModified: playlist.httpLastModified,
    });
    if (download.kind === 'not-modified') {
      await markPlaylistUnchanged(playlist.id, download.httpValidators);
      return {
        added: 0,
        modified: 0,
        removed: 0,
        unchanged: playlist.channelCount,
        total: playlist.channelCount,
        notModified: true,
      };
    }
    const result = parseContent(download.content);
    const report = await replaceM3uContent(
      playlist.id,
      result.channels,
      download.httpValidators,
    );
    return { ...report, total: result.channels.length, notModified: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Échec de l’actualisation.';
    await markPlaylistSyncFailed(playlist.id, message);
    throw error;
  }
}
