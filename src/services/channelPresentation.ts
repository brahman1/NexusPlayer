const COUNTRY_NAMES: Record<string, string> = {
  AR: 'Arabe', BE: 'Belgique', CA: 'Canada', CH: 'Suisse', DE: 'Allemagne',
  EN: 'International', ES: 'Espagne', FR: 'France', IT: 'Italie', MA: 'Maroc',
  NL: 'Pays-Bas', PL: 'Pologne', PT: 'Portugal', RO: 'Roumanie', TN: 'Tunisie',
  TR: 'Turquie', UK: 'Royaume-Uni', US: 'États-Unis', USA: 'États-Unis',
};

const TECHNICAL_PREFIXES = new Set([
  '4K', 'BACKUP', 'FHD', 'H265', 'HD', 'HEVC', 'IPTV', 'LIVE', 'MULTI', 'NEW',
  'RAW', 'SD', 'TV', 'UHD', 'VF', 'VIP', 'VOD', 'VOSTFR',
]);

const MEDIA_PREFIXES = new Set(['CINEMA', 'FILM', 'FILMS', 'MOVIE', 'MOVIES', 'SERIE', 'SERIES']);

const CATEGORY_ALIASES: Record<string, string> = {
  ALL: 'Toutes', AUTRES: 'Autres', DOCUMENTARY: 'Documentaires', DOCUMENTARIES: 'Documentaires',
  ENTERTAINMENT: 'Divertissement', GENERAL: 'Généralistes', KIDS: 'Jeunesse', LOCAL: 'Locales',
  FILM: 'Films', FILMS: 'Films', MOVIE: 'Films', MOVIES: 'Films', MUSIC: 'Musique',
  NEWS: 'Information', NEW: 'Nouveautés', NOUVEAUTES: 'Nouveautés', OTHER: 'Autres',
  SERIE: 'Séries', SERIES: 'Séries', SPORT: 'Sport', SPORTS: 'Sport', VOD: 'Films',
  WORLD: 'International',
};

function baseCleanup(raw: string) {
  return raw
    .normalize('NFKC')
    .replace(/&amp;/gi, '&')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
    .replace(/_/g, ' ')
    .replace(/\s*[|]{2,}\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim();
}

function peelPrefixes(raw: string) {
  let value = baseCleanup(raw).replace(/^[\s|•·★☆►▶◆◇■□▪▫\-–—»]+/, '');
  let country: string | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    value = value.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, '');
    const match = value.match(/^(?:\[([^\]]{1,12})\]|\(([^)]{1,12})\)|([\p{L}\d]{2,12}))\s*(?:[|:;•·\-–—/»]+\s*)/u);
    if (!match) break;
    const token = (match[1] ?? match[2] ?? match[3] ?? '').trim().toUpperCase();
    const mappedCountry = COUNTRY_NAMES[token];
    if (mappedCountry) country ??= mappedCountry;
    else if (!TECHNICAL_PREFIXES.has(token)) break;
    value = value.slice(match[0].length);
  }

  return {
    country,
    value: value.replace(/^[\s|•·\-–—»]+|[\s|•·\-–—«]+$/g, '').replace(/\s+/g, ' ').trim(),
  };
}

function titleCaseIfShouting(value: string) {
  const letters = value.replace(/[^\p{L}]/gu, '');
  if (letters.length < 4 || value !== value.toLocaleUpperCase('fr-FR')) return value;
  return value.toLocaleLowerCase('fr-FR').replace(/(^|[\s'’/-])\p{L}/gu, (letter) => letter.toLocaleUpperCase('fr-FR'));
}

export function channelDisplayName(raw: string) {
  const { value } = peelPrefixes(raw);
  return value || 'Chaîne sans nom';
}

function trimMediaDecorations(value: string) {
  let cleaned = value;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const match = cleaned.match(/^(?:\[([^\]]{1,16})\]|\(([^)]{1,16})\)|([\p{L}\d]{2,16}))(?:\s*[|:;•·\-–—/»]+\s*|\s+)/u);
    if (!match) break;
    const token = (match[1] ?? match[2] ?? match[3] ?? '').trim().toUpperCase();
    if (!TECHNICAL_PREFIXES.has(token) && !MEDIA_PREFIXES.has(token) && !COUNTRY_NAMES[token]) break;
    cleaned = cleaned.slice(match[0].length);
  }
  return cleaned
    .replace(/\.(?:avi|m2ts|m4v|mkv|mov|mp4|ts|wmv)$/i, '')
    .replace(/\s*(?:[|·\-–—]\s*)?(?:\[(?:4K|FHD|HD|HEVC|MULTI|UHD|VF|VOSTFR)\]|\((?:4K|FHD|HD|HEVC|MULTI|UHD|VF|VOSTFR)\))\s*$/i, '')
    .replace(/^[\s|•·\-–—»]+|[\s|•·\-–—«]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Keeps the provider value in `name`; this value is only for display/search/sort. */
export function mediaDisplayName(raw: string) {
  const { value } = peelPrefixes(raw);
  const cleaned = trimMediaDecorations(value);
  return titleCaseIfShouting(cleaned) || 'Titre sans nom';
}

export function episodeDisplayName(raw: string, season?: number, episode?: number) {
  const cleaned = mediaDisplayName(raw);
  const technicalOnly = /^(?:episode|ep|e)\s*0*\d+$/i.test(cleaned);
  if (technicalOnly && episode !== undefined) return `Épisode ${episode}`;
  if (cleaned === 'Titre sans nom' && episode !== undefined) return `Épisode ${episode}`;
  return cleaned || `S${season ?? 0} E${episode ?? 0}`;
}

export function mediaSortKey(raw: string) {
  return naturalSortKey(mediaDisplayName(raw));
}

export function categoryDisplayName(raw: string) {
  const cleaned = baseCleanup(raw);
  if (!cleaned || /^(?:N\/?A|NONE|NULL|UNDEFINED|NO CATEGORY|UNCATEGORIZED)$/i.test(cleaned)) return 'Sans catégorie';
  const { country, value } = peelPrefixes(cleaned);
  const alias = CATEGORY_ALIASES[value.toUpperCase()] ?? titleCaseIfShouting(value);
  const label = alias || country || 'Sans catégorie';
  return country && label !== country ? `${label} · ${country}` : label;
}

export function naturalSortKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/\d+/g, (digits) => digits.padStart(12, '0'));
}

export function categorySortKey(raw: string) {
  const displayName = categoryDisplayName(raw);
  const comparable = naturalSortKey(displayName);
  const rank = /general|toutes/.test(comparable) ? 10
    : /info|news/.test(comparable) ? 20
      : /sport/.test(comparable) ? 30
        : /cinema|movie/.test(comparable) ? 40
          : /jeunesse|kids/.test(comparable) ? 50
            : /document/.test(comparable) ? 60
              : /musique|music/.test(comparable) ? 70
                : /local/.test(comparable) ? 80
                  : /international|world/.test(comparable) ? 90
                    : /sans categorie|autres|other/.test(comparable) ? 99 : 95;
  return `${String(rank).padStart(2, '0')}:${comparable}`;
}
