export type PlaybackEngine = 'native' | 'vlc';
export type PlaybackKind = 'live' | 'movie' | 'episode';

const VLC_FIRST_EXTENSIONS = new Set(['mkv', 'avi', 'wmv', 'flv', 'ts', 'm2ts']);
const NATIVE_FIRST_EXTENSIONS = new Set(['m3u8', 'mp4', 'm4v', 'mov']);

export function mediaExtension(uri: string) {
  try {
    const pathname = new URL(uri).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    const match = (uri.split(/[?#]/, 1)[0] ?? uri).match(/\.([a-z0-9]+)$/i);
    return match?.[1]?.toLowerCase() ?? null;
  }
}

export function engineOrder(uri: string, kind: PlaybackKind, remembered?: PlaybackEngine | null, platform = ''): PlaybackEngine[] {
  const extension = mediaExtension(uri);
  if ((platform === 'ios' || platform === 'tvos') && extension && ['mkv', 'avi', 'wmv', 'flv'].includes(extension)) return ['vlc'];
  if ((platform === 'ios' || platform === 'tvos') && /^http:\/\//i.test(uri)) {
    return kind === 'live' ? ['vlc'] : ['vlc', 'native'];
  }
  if (remembered) return [remembered, remembered === 'native' ? 'vlc' : 'native'];
  if (extension && VLC_FIRST_EXTENSIONS.has(extension)) return ['vlc', 'native'];
  if (extension && NATIVE_FIRST_EXTENSIONS.has(extension)) return ['native', 'vlc'];
  return kind === 'live' ? ['native', 'vlc'] : ['vlc', 'native'];
}

export function alternateEngine(engine: PlaybackEngine): PlaybackEngine {
  return engine === 'native' ? 'vlc' : 'native';
}

export function playbackPreferenceKey(uri: string, kind: PlaybackKind, platform: string) {
  try {
    return `${platform}:${kind}:${mediaExtension(uri) ?? 'unknown'}:${new URL(uri).host.toLowerCase()}`;
  } catch {
    return `${platform}:${kind}:${mediaExtension(uri) ?? 'unknown'}:unknown`;
  }
}

export function redactPlaybackUri(uri: string) {
  try {
    const url = new URL(uri);
    const segments = url.pathname.split('/').filter(Boolean);
    const file = segments.at(-1) ?? '';
    return `${url.protocol}//${url.host}/…/${file}`;
  } catch {
    return 'adresse multimédia masquée';
  }
}

export function liveMarkerCandidates(marker: string, platform: string) {
  const match = marker.match(/^xtream:\/\/live\/(\d+)(?:\.(ts|m3u8))?$/i);
  if (!match) return [marker];
  const base = `xtream://live/${match[1]}`;
  const transportStream = `${base}.ts`;
  const extensionless = base;
  const hls = `${base}.m3u8`;
  return platform === 'ios' || platform === 'tvos'
    ? [transportStream, extensionless, hls]
    : [transportStream, hls, extensionless];
}
