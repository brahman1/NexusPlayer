export type ParsedM3uChannel = {
  name: string;
  streamUrl: string;
  groupTitle: string;
  tvgId: string | null;
  tvgName: string | null;
  logoUrl: string | null;
  language: string | null;
  country: string | null;
};

export type M3uParseResult = {
  channels: ParsedM3uChannel[];
  duplicateCount: number;
  ignoredCount: number;
  epgUrls: string[];
};

type PendingMetadata = Omit<ParsedM3uChannel, 'streamUrl'>;

const DEFAULT_GROUP = 'Sans catégorie';
const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:']);

function readAttributes(line: string) {
  const attributes = new Map<string, string>();
  const pattern = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s,]+))/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line))) {
    attributes.set(match[1]!.toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }

  return attributes;
}

function titleAfterComma(line: string) {
  let quote: string | null = null;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (character === '"' || character === "'") {
      quote = quote === character ? null : quote ?? character;
    } else if (character === ',' && !quote) {
      return line.slice(index + 1).trim();
    }
  }

  return '';
}

function metadataFromExtinf(line: string): PendingMetadata {
  const attributes = readAttributes(line);
  const tvgName = attributes.get('tvg-name')?.trim() || null;
  const name = titleAfterComma(line) || tvgName || 'Chaîne sans nom';

  return {
    name,
    groupTitle: attributes.get('group-title')?.trim() || DEFAULT_GROUP,
    tvgId: attributes.get('tvg-id')?.trim() || null,
    tvgName,
    logoUrl: attributes.get('tvg-logo')?.trim() || null,
    language: attributes.get('tvg-language')?.trim() || attributes.get('language')?.trim() || null,
    country: attributes.get('tvg-country')?.trim() || attributes.get('country')?.trim() || null,
  };
}

function isSupportedStreamUrl(value: string) {
  try {
    return SUPPORTED_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

function forEachLine(content: string, callback: (line: string) => void) {
  let start = 0;

  for (let index = 0; index <= content.length; index += 1) {
    if (index === content.length || content.charCodeAt(index) === 10) {
      const end = index > start && content.charCodeAt(index - 1) === 13 ? index - 1 : index;
      callback(content.slice(start, end).trim());
      start = index + 1;
    }
  }
}

export function parseM3u(content: string): M3uParseResult {
  const channels: ParsedM3uChannel[] = [];
  const streamUrls = new Set<string>();
  let pending: PendingMetadata | null = null;
  let duplicateCount = 0;
  let ignoredCount = 0;
  const epgUrls: string[] = [];

  forEachLine(content.replace(/^\uFEFF/, ''), (line) => {
    if (!line) return;

    if (line.startsWith('#EXTM3U')) {
      const attributes = readAttributes(line);
      const raw = attributes.get('x-tvg-url') || attributes.get('url-tvg');
      if (raw) {
        for (const candidate of raw.split(',').map((value) => value.trim())) {
          if (isSupportedStreamUrl(candidate) && !epgUrls.includes(candidate)) epgUrls.push(candidate);
        }
      }
      return;
    }

    if (line.startsWith('#EXTINF:')) {
      if (pending) ignoredCount += 1;
      pending = metadataFromExtinf(line);
      return;
    }

    if (line.startsWith('#')) return;

    if (!isSupportedStreamUrl(line)) {
      ignoredCount += 1;
      pending = null;
      return;
    }

    if (streamUrls.has(line)) {
      duplicateCount += 1;
      pending = null;
      return;
    }

    const fallbackName = (() => {
      try {
        return decodeURIComponent(new URL(line).pathname.split('/').filter(Boolean).pop() || 'Chaîne sans nom');
      } catch {
        return 'Chaîne sans nom';
      }
    })();

    streamUrls.add(line);
    channels.push({
      ...(pending ?? {
        name: fallbackName,
        groupTitle: DEFAULT_GROUP,
        tvgId: null,
        tvgName: null,
        logoUrl: null,
        language: null,
        country: null,
      }),
      streamUrl: line,
    });
    pending = null;
  });

  if (pending) ignoredCount += 1;

  return { channels, duplicateCount, ignoredCount, epgUrls };
}
