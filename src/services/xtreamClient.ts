import type { XtreamCredentials } from '../types/domain';

export type XtreamLiveCategory = { category_id: string; category_name: string };
export type XtreamVodCategory = XtreamLiveCategory;
export type XtreamSeriesCategory = XtreamLiveCategory;
export type XtreamLiveStream = { stream_id: number; name: string; category_id?: string; stream_icon?: string; epg_channel_id?: string; container_extension?: string };
export type XtreamVodStream = { stream_id: number; name: string; category_id?: string; stream_icon?: string; plot?: string; releaseDate?: string; container_extension?: string };
export type XtreamSeriesItem = { series_id: number; name: string; category_id?: string; cover?: string; plot?: string };
export type XtreamCatalog = {
  liveCategories: XtreamLiveCategory[];
  liveStreams: XtreamLiveStream[];
  vodCategories: XtreamVodCategory[];
  vodStreams: XtreamVodStream[];
  seriesCategories: XtreamSeriesCategory[];
  series: XtreamSeriesItem[];
};

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function deduplicateXtreamCatalog(catalog: XtreamCatalog): XtreamCatalog {
  return {
    liveCategories: uniqueBy(catalog.liveCategories, (item) => String(item.category_id ?? '')),
    liveStreams: uniqueBy(catalog.liveStreams, (item) => String(item.stream_id ?? '')),
    vodCategories: uniqueBy(catalog.vodCategories, (item) => String(item.category_id ?? '')),
    vodStreams: uniqueBy(catalog.vodStreams, (item) => String(item.stream_id ?? '')),
    seriesCategories: uniqueBy(catalog.seriesCategories, (item) => String(item.category_id ?? '')),
    series: uniqueBy(catalog.series, (item) => String(item.series_id ?? '')),
  };
}

export function normalizeXtreamServer(value: string) {
  const url = new URL(value.trim());
  url.username = ''; url.password = ''; url.search = ''; url.hash = '';
  return url.toString().replace(/\/$/, '');
}

async function apiRequest<T>(serverUrl: string, credentials: XtreamCredentials, action?: string, extra: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${normalizeXtreamServer(serverUrl)}/player_api.php`);
  url.searchParams.set('username', credentials.username);
  url.searchParams.set('password', credentials.password);
  if (action) url.searchParams.set('action', action);
  for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
  const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Le serveur Xtream a répondu avec le statut ${response.status}.`);
  return response.json() as Promise<T>;
}

export async function fetchXtreamCatalog(serverUrl: string, credentials: XtreamCredentials): Promise<XtreamCatalog> {
  const account = await apiRequest<{ user_info?: { auth?: number | string; status?: string }; server_info?: { url?: string } }>(serverUrl, credentials);
  if (Number(account.user_info?.auth) !== 1 || account.user_info?.status === 'Disabled' || account.user_info?.status === 'Banned') {
    throw new Error('Connexion Xtream refusée. Vérifiez l’adresse et les identifiants.');
  }
  const actions = ['get_live_categories', 'get_live_streams', 'get_vod_categories', 'get_vod_streams', 'get_series_categories', 'get_series'] as const;
  const [liveCategories, liveStreams, vodCategories, vodStreams, seriesCategories, series] = await Promise.all(actions.map((action) => apiRequest<unknown[]>(serverUrl, credentials, action)));
  return { liveCategories: liveCategories as XtreamLiveCategory[], liveStreams: liveStreams as XtreamLiveStream[], vodCategories: vodCategories as XtreamVodCategory[], vodStreams: vodStreams as XtreamVodStream[], seriesCategories: seriesCategories as XtreamSeriesCategory[], series: series as XtreamSeriesItem[] };
}

export function xtreamMediaUrl(serverUrl: string, credentials: XtreamCredentials, marker: string) {
  const match = marker.match(/^xtream:\/\/(live|movie|series)\/(\d+)\.([\w-]+)$/);
  if (!match) return marker;
  return `${normalizeXtreamServer(serverUrl)}/${match[1]}/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}/${match[2]}.${match[3]}`;
}

export type XtreamEpisode = { id: string; season: number; episode: number; name: string; extension: string; durationSeconds: number | null };
export async function fetchXtreamSeriesEpisodes(serverUrl: string, credentials: XtreamCredentials, seriesId: string): Promise<XtreamEpisode[]> {
  const payload = await apiRequest<{ episodes?: Record<string, { id?: string | number; episode_num?: number; title?: string; container_extension?: string; info?: { duration_secs?: number } }[]> }>(serverUrl, credentials, 'get_series_info', { series_id: seriesId });
  const result: XtreamEpisode[] = [];
  for (const [seasonKey, episodes] of Object.entries(payload.episodes ?? {})) {
    for (const item of episodes ?? []) {
      if (item.id === undefined || item.id === null) continue;
      result.push({ id: String(item.id), season: Number(seasonKey) || 0, episode: Number(item.episode_num) || 0, name: item.title?.trim() || `Épisode ${item.episode_num ?? ''}`.trim(), extension: item.container_extension || 'mp4', durationSeconds: Number(item.info?.duration_secs) || null });
    }
  }
  return result;
}
