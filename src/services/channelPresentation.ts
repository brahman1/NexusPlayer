const COUNTRY_NAMES: Record<string, string> = {
  AM: 'Arménie', AR: 'Argentine', BE: 'Belgique', BR: 'Brésil', CA: 'Canada', CH: 'Suisse', CN: 'Chine', DE: 'Allemagne', DZ: 'Algérie', EG: 'Égypte', ES: 'Espagne', FR: 'France', GB: 'Royaume-Uni', GR: 'Grèce', IN: 'Inde', IT: 'Italie', JP: 'Japon', KR: 'Corée du Sud', MA: 'Maroc', MX: 'Mexique', NL: 'Pays-Bas', PL: 'Pologne', PT: 'Portugal', RO: 'Roumanie', RU: 'Russie', SA: 'Arabie saoudite', TN: 'Tunisie', TR: 'Turquie', US: 'États-Unis',
};

const COUNTRY_NAMES_EN: Record<string, string> = {
  AM: 'Armenia', AR: 'Argentina', BE: 'Belgium', BR: 'Brazil', CA: 'Canada', CH: 'Switzerland', CN: 'China', DE: 'Germany', DZ: 'Algeria', EG: 'Egypt', ES: 'Spain', FR: 'France', GB: 'United Kingdom', GR: 'Greece', IN: 'India', IT: 'Italy', JP: 'Japan', KR: 'South Korea', MA: 'Morocco', MX: 'Mexico', NL: 'Netherlands', PL: 'Poland', PT: 'Portugal', RO: 'Romania', RU: 'Russia', SA: 'Saudi Arabia', TN: 'Tunisia', TR: 'Turkey', US: 'United States',
};

const CATEGORY_NAMES_EN: Record<string, string> = {
  'Toutes': 'All', 'Autres': 'Other', 'Généralistes': 'General', 'Locales': 'Local', 'Nouveautés': 'New releases', 'International': 'International',
  'Information': 'News', 'Sport': 'Sports', 'Cinéma': 'Cinema', 'Jeunesse': 'Kids', 'Documentaires': 'Documentaries', 'Musique': 'Music', 'Divertissement': 'Entertainment', 'Religion': 'Religion',
  'Action': 'Action', 'Comédie': 'Comedy', 'Drame': 'Drama', 'Thriller': 'Thriller', 'Horreur': 'Horror', 'Science-fiction et fantastique': 'Science fiction & fantasy', 'Animation': 'Animation', 'Famille': 'Family', 'Romance': 'Romance', 'Policier': 'Crime', 'Historique': 'History', 'Séries': 'Series', 'Sans catégorie': 'Uncategorized',
};

const FRENCH_COUNTRY_TO_ENGLISH = new Map(Object.keys(COUNTRY_NAMES).map((code) => [COUNTRY_NAMES[code]!, COUNTRY_NAMES_EN[code] ?? COUNTRY_NAMES[code]!]));

const LANGUAGE_NAMES: Record<string, [string, string]> = {
  ar: ['Arabe', 'Arabic'], de: ['Allemand', 'German'], el: ['Grec', 'Greek'], en: ['Anglais', 'English'], es: ['Espagnol', 'Spanish'], fr: ['Français', 'French'], hi: ['Hindi', 'Hindi'], hy: ['Arménien', 'Armenian'], it: ['Italien', 'Italian'], ja: ['Japonais', 'Japanese'], ko: ['Coréen', 'Korean'], nl: ['Néerlandais', 'Dutch'], pl: ['Polonais', 'Polish'], pt: ['Portugais', 'Portuguese'], ro: ['Roumain', 'Romanian'], ru: ['Russe', 'Russian'], tr: ['Turc', 'Turkish'], zh: ['Chinois', 'Chinese'],
};

export function localizedCountryName(code: string, language: 'fr' | 'en') {
  return (language === 'en' ? COUNTRY_NAMES_EN[code] : COUNTRY_NAMES[code]) ?? code;
}

export function localizedLanguageName(code: string, language: 'fr' | 'en') {
  return LANGUAGE_NAMES[code]?.[language === 'fr' ? 0 : 1] ?? code.toUpperCase();
}

export function countryCodeFromCategoryLabel(label: string) {
  const part = label.split(' · ').at(-1) ?? label;
  const localized = Object.keys(COUNTRY_NAMES).find((code) => COUNTRY_NAMES[code] === part || COUNTRY_NAMES_EN[code] === part);
  return localized ?? countryCodeInText(label);
}

export function applyCategoryLabelOverride(label: string, overrides: Record<string, string>) {
  const separator = label.indexOf(' · ');
  const theme = separator < 0 ? label : label.slice(0, separator);
  const suffix = separator < 0 ? '' : label.slice(separator);
  return `${overrides[theme] ?? theme}${suffix}`;
}

export function localizeCategoryDisplayName(label: string, language: 'fr' | 'en') {
  if (language === 'fr') return label;
  return label.split(' · ').map((part) => CATEGORY_NAMES_EN[part] ?? FRENCH_COUNTRY_TO_ENGLISH.get(part) ?? part).join(' · ');
}

export function localizePresentationName(label: string, language: 'fr' | 'en') {
  if (language === 'fr') return label;
  if (label === 'Chaîne sans nom') return 'Unnamed channel';
  if (label === 'Titre sans nom') return 'Untitled';
  return label.replace(/^Épisode\s+(\d+)$/i, 'Episode $1');
}

const COUNTRY_ALIASES: Record<string, string> = {
  ALGERIA: 'DZ', ALGERIE: 'DZ', ARM: 'AM', ARMENIA: 'AM', ARMENIE: 'AM', BRAZIL: 'BR', BRESIL: 'BR', CANADA: 'CA', CHINA: 'CN', CHINE: 'CN', EGYPT: 'EG', EGYPTE: 'EG', FRANCE: 'FR', GERMANY: 'DE', ALLEMAGNE: 'DE', GREECE: 'GR', GRECE: 'GR', INDIA: 'IN', INDE: 'IN', ITALY: 'IT', ITALIE: 'IT', JAPAN: 'JP', JAPON: 'JP', KOREA: 'KR', MAROC: 'MA', MEXICO: 'MX', MEXIQUE: 'MX', NETHERLANDS: 'NL', PAYS_BAS: 'NL', POLAND: 'PL', POLOGNE: 'PL', PORTUGAL: 'PT', ROMANIA: 'RO', ROUMANIE: 'RO', RUSSIA: 'RU', RUSSIE: 'RU', SPAIN: 'ES', ESPAGNE: 'ES', SWITZERLAND: 'CH', SUISSE: 'CH', TUNISIA: 'TN', TUNISIE: 'TN', TURKEY: 'TR', TURKIYE: 'TR', TURQUIE: 'TR', UK: 'GB', UNITED_KINGDOM: 'GB', ROYAUME_UNI: 'GB', USA: 'US', UNITED_STATES: 'US', ETATS_UNIS: 'US',
  AMERICAN: 'US', ARMENIAN: 'AM', BRITISH: 'GB', FRENCH: 'FR', TURKISH: 'TR',
};

const COUNTRY_LANGUAGE: Record<string, string> = {
  AM: 'hy', AR: 'es', BR: 'pt', CN: 'zh', DE: 'de', DZ: 'ar', EG: 'ar', ES: 'es', FR: 'fr', GB: 'en', GR: 'el', IN: 'hi', IT: 'it', JP: 'ja', KR: 'ko', MA: 'ar', MX: 'es', NL: 'nl', PL: 'pl', PT: 'pt', RO: 'ro', RU: 'ru', SA: 'ar', TN: 'ar', TR: 'tr', US: 'en',
};

const LANGUAGE_ALIASES: Record<string, string> = {
  AR: 'ar', ARABIC: 'ar', ARABE: 'ar', DE: 'de', DEUTSCH: 'de', GERMAN: 'de', EL: 'el', GREEK: 'el', EN: 'en', ENG: 'en', ENGLISH: 'en', ES: 'es', ESPANOL: 'es', SPANISH: 'es', FR: 'fr', FRA: 'fr', FRENCH: 'fr', FRANCAIS: 'fr', HI: 'hi', HY: 'hy', ARMENIAN: 'hy', ARMENIEN: 'hy', IT: 'it', ITALIAN: 'it', JA: 'ja', JAPANESE: 'ja', KO: 'ko', KOREAN: 'ko', NL: 'nl', PL: 'pl', PT: 'pt', PORTUGUESE: 'pt', RO: 'ro', RU: 'ru', RUSSIAN: 'ru', TR: 'tr', TURKCE: 'tr', TURKISH: 'tr', ZH: 'zh', CHINESE: 'zh',
};

const TECHNICAL_PREFIXES = new Set(['4K', 'BACKUP', 'FHD', 'H265', 'HD', 'HEVC', 'IPTV', 'LIVE', 'MULTI', 'NEW', 'RAW', 'SD', 'TV', 'UHD', 'VF', 'VIP', 'VOD', 'VOSTFR']);
const MEDIA_PREFIXES = new Set(['CINEMA', 'FILM', 'FILMS', 'MOVIE', 'MOVIES', 'SERIE', 'SERIES']);
const CATEGORY_ALIASES: Record<string, string> = { ALL: 'Toutes', AUTRES: 'Autres', GENERAL: 'Généralistes', LOCAL: 'Locales', NEW: 'Nouveautés', NOUVEAUTES: 'Nouveautés', OTHER: 'Autres', WORLD: 'International' };

export type CategoryKind = 'live' | 'movie' | 'series';
export type ChannelPresentationMetadata = { country: string | null; language: string | null; quality: '4k' | 'fhd' | 'hd' | 'sd' | null; confidence: number };

const LIVE_CATEGORY_RULES: [RegExp, string, number][] = [
  [/(?:^|\W)(?:NEWS|INFO|INFORMATION|ACTUALIT|HABER|NOTICIAS|NACHRICHT|NOVOST|НОВОСТ|أخبار)(?:\W|$)/i, 'Information', 20],
  [/(?:^|\W)(?:SPORT|SPORTS|SPOR|DEPORTES|FUSSBALL|FOOTBALL)(?:\W|$)/i, 'Sport', 30],
  [/(?:^|\W)(?:MOVIE|MOVIES|FILM|FILMS|CINEMA|VOD|KINO)(?:\W|$)/i, 'Cinéma', 40],
  [/(?:^|\W)(?:KIDS|CHILDREN|JEUNESSE|ENFANT|COCUK|CARTOON)(?:\W|$)/i, 'Jeunesse', 50],
  [/(?:^|\W)(?:DOCUMENTARY|DOCUMENTARIES|DOCUMENTAIRE|BELGESEL|DOKU)(?:\W|$)/i, 'Documentaires', 60],
  [/(?:^|\W)(?:MUSIC|MUSIQUE|MUZIK|RADIO)(?:\W|$)/i, 'Musique', 70],
  [/(?:^|\W)(?:ENTERTAINMENT|DIVERTISSEMENT|EGLENCE|GENERAL|GENERALISTE)(?:\W|$)/i, 'Divertissement', 75],
  [/(?:^|\W)(?:RELIGION|RELIGIOUS|ISLAM|CHRISTIAN|CHURCH)(?:\W|$)/i, 'Religion', 80],
  [/(?:^|\W)(?:LOCAL|REGIONAL|REGIONALES?)(?:\W|$)/i, 'Locales', 85],
  [/(?:^|\W)(?:WORLD|INTERNATIONAL|INTL)(?:\W|$)/i, 'International', 90],
];

const MEDIA_CATEGORY_RULES: [RegExp, string, number][] = [
  [/(?:^|\W)(?:ACTION|AKSIYON)(?:\W|$)/i, 'Action', 20], [/(?:^|\W)(?:COMEDY|COMEDIE|KOMEDI|COMEDIA)(?:\W|$)/i, 'Comédie', 30], [/(?:^|\W)(?:DRAMA|DRAME|DRAM)(?:\W|$)/i, 'Drame', 40], [/(?:^|\W)(?:THRILLER|SUSPENSE|GERILIM)(?:\W|$)/i, 'Thriller', 50], [/(?:^|\W)(?:HORROR|HORREUR|KORKU|TERROR)(?:\W|$)/i, 'Horreur', 60],
  [/(?:^|\W)(?:SCI[ -]?FI|SCIENCE[ -]?FICTION|BILIM[ -]?KURGU|FANTASY|FANTASTIQUE)(?:\W|$)/i, 'Science-fiction et fantastique', 70], [/(?:^|\W)(?:ANIMATION|ANIME|CARTOON)(?:\W|$)/i, 'Animation', 80], [/(?:^|\W)(?:FAMILY|FAMILLE|AILE)(?:\W|$)/i, 'Famille', 90], [/(?:^|\W)(?:ROMANCE|ROMANTIC|ROMANTIQUE)(?:\W|$)/i, 'Romance', 100], [/(?:^|\W)(?:CRIME|POLICIER|POLISIYE|DETECTIVE)(?:\W|$)/i, 'Policier', 110], [/(?:^|\W)(?:DOCUMENTARY|DOCUMENTAIRE|BELGESEL)(?:\W|$)/i, 'Documentaires', 120], [/(?:^|\W)(?:HISTORY|HISTORIQUE|TARIH)(?:\W|$)/i, 'Historique', 130],
];

function baseCleanup(raw: string) {
  return raw.normalize('NFKC').replace(/&amp;/gi, '&').replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '').replace(/_/g, ' ').replace(/\s*[|]{2,}\s*/g, ' · ').replace(/\s+/g, ' ').trim();
}

function normalizedToken(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^\p{L}\d]+/gu, '_').replace(/^_+|_+$/g, '');
}

function countryCodeFromToken(value: string) {
  const token = normalizedToken(value);
  return COUNTRY_NAMES[token] ? token : COUNTRY_ALIASES[token] ?? null;
}

function countryCodeInText(value: string) {
  const comparable = `_${normalizedToken(value)}_`;
  const aliases = Object.entries(COUNTRY_ALIASES).sort(([left], [right]) => right.length - left.length);
  for (const [token, code] of aliases) if (comparable.includes(`_${token}_`)) return code;
  for (const code of Object.keys(COUNTRY_NAMES)) if (comparable.includes(`_${code}_`)) return code;
  return null;
}

function flagCountryCode(value: string) {
  const match = value.match(/^[\u{1F1E6}-\u{1F1FF}]{2}/u)?.[0];
  if (!match) return null;
  const letters = [...match].map((letter) => String.fromCharCode((letter.codePointAt(0) ?? 0) - 0x1F1E6 + 65)).join('');
  return COUNTRY_NAMES[letters] ? letters : null;
}

function peelPrefixes(raw: string) {
  let value = baseCleanup(raw).replace(/^[\s|•·★☆►▶◆◇■□▪▫\-–—»]+/, '');
  let countryCode = flagCountryCode(value);
  let country = countryCode ? COUNTRY_NAMES[countryCode] : null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    value = value.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, '');
    const match = value.match(/^(?:\[([^\]]{1,24})\]|\(([^)]{1,24})\)|([\p{L}\d ]{2,24}))\s*(?:[|:;•·\-–—/»]+\s*)/u);
    if (!match) break;
    const token = (match[1] ?? match[2] ?? match[3] ?? '').trim();
    const detectedCode = countryCodeFromToken(token);
    const upper = normalizedToken(token);
    if (detectedCode) { countryCode ??= detectedCode; country ??= COUNTRY_NAMES[detectedCode]; }
    else if (!TECHNICAL_PREFIXES.has(upper) && !MEDIA_PREFIXES.has(upper)) break;
    value = value.slice(match[0].length);
  }
  return { country, countryCode, value: value.replace(/^[\s|•·\-–—»]+|[\s|•·\-–—«]+$/g, '').replace(/\s+/g, ' ').trim() };
}

function titleCaseIfShouting(value: string) {
  const letters = value.replace(/[^\p{L}]/gu, '');
  if (letters.length < 4 || value !== value.toLocaleUpperCase()) return value;
  return value.toLocaleLowerCase().replace(/(^|[\s'’/-])\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

export function channelDisplayName(raw: string) { return peelPrefixes(raw).value || 'Chaîne sans nom'; }

function trimMediaDecorations(value: string) {
  let cleaned = value;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const match = cleaned.match(/^(?:\[([^\]]{1,16})\]|\(([^)]{1,16})\)|([\p{L}\d]{2,16}))(?:\s*[|:;•·\-–—/»]+\s*|\s+)/u);
    if (!match) break;
    const token = (match[1] ?? match[2] ?? match[3] ?? '').trim().toUpperCase();
    if (!TECHNICAL_PREFIXES.has(token) && !MEDIA_PREFIXES.has(token) && !countryCodeFromToken(token)) break;
    cleaned = cleaned.slice(match[0].length);
  }
  return cleaned.replace(/\.(?:avi|m2ts|m4v|mkv|mov|mp4|ts|wmv)$/i, '').replace(/\s*(?:[|·\-–—]\s*)?(?:\[(?:4K|FHD|HD|HEVC|MULTI|UHD|VF|VOSTFR)\]|\((?:4K|FHD|HD|HEVC|MULTI|UHD|VF|VOSTFR)\))\s*$/i, '').replace(/^[\s|•·\-–—»]+|[\s|•·\-–—«]+$/g, '').replace(/\s+/g, ' ').trim();
}

export function mediaDisplayName(raw: string) { return titleCaseIfShouting(trimMediaDecorations(peelPrefixes(raw).value)) || 'Titre sans nom'; }
export function episodeDisplayName(raw: string, season?: number, episode?: number) {
  const cleaned = mediaDisplayName(raw);
  if (/^(?:episode|ep|e)\s*0*\d+$/i.test(cleaned) && episode !== undefined) return `Épisode ${episode}`;
  if (cleaned === 'Titre sans nom' && episode !== undefined) return `Épisode ${episode}`;
  return cleaned || `S${season ?? 0} E${episode ?? 0}`;
}

export function naturalSortKey(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/\d+/g, (digits) => digits.padStart(12, '0')); }
export function mediaSortKey(raw: string) { return naturalSortKey(mediaDisplayName(raw)); }

function categoryPresentation(raw: string, kind: CategoryKind) {
  const cleaned = baseCleanup(raw);
  if (!cleaned || /^(?:N\/?A|NONE|NULL|UNDEFINED|NO CATEGORY|UNCATEGORIZED)$/i.test(cleaned)) return { countryCode: null, label: 'Sans catégorie', rank: 990 };
  const prefix = peelPrefixes(cleaned);
  const countryCode = prefix.countryCode ?? countryCodeInText(cleaned);
  const country = countryCode ? COUNTRY_NAMES[countryCode] : prefix.country;
  const { value } = prefix;
  const matched = (kind === 'live' ? LIVE_CATEGORY_RULES : MEDIA_CATEGORY_RULES).find(([pattern]) => pattern.test(value));
  const generic = kind === 'movie' && /(?:^|\W)(?:MOVIE|MOVIES|FILM|FILMS|VOD)(?:\W|$)/i.test(value) ? 'Cinéma' : kind === 'series' && /(?:^|\W)(?:SERIE|SERIES|TV SHOWS?)(?:\W|$)/i.test(value) ? 'Séries' : null;
  const alias = CATEGORY_ALIASES[normalizedToken(value)];
  const label = matched?.[1] ?? generic ?? alias ?? titleCaseIfShouting(value) ?? country ?? 'Sans catégorie';
  return { countryCode, label: country && label !== country ? `${label} · ${country}` : label, rank: matched?.[2] ?? (generic ? 10 : /sans categorie|autres|other/i.test(label) ? 990 : 900) };
}

export function categoryDisplayName(raw: string, kind: CategoryKind = 'live') { return categoryPresentation(raw, kind).label; }
function viewerRegion() { return Intl.DateTimeFormat().resolvedOptions().locale.match(/[-_]([A-Z]{2})(?:[-_]|$)/i)?.[1]?.toUpperCase() ?? null; }
export function categorySortKey(raw: string, kind: CategoryKind = 'live', preferredRegion = viewerRegion()) {
  const item = categoryPresentation(raw, kind);
  const regionRank = item.countryCode === preferredRegion ? 0 : item.countryCode ? 2 : 1;
  return `${String(item.rank).padStart(3, '0')}:${regionRank}:${naturalSortKey(item.label)}`;
}

function normalizeLanguage(value?: string | null) {
  if (!value) return null;
  const token = normalizedToken(value).split('_')[0]!;
  return LANGUAGE_ALIASES[token] ?? (token.length === 2 ? token.toLowerCase() : null);
}
function normalizeCountry(value?: string | null) { return value ? countryCodeFromToken(value) : null; }
function inferredScriptLanguage(value: string) {
  if (/[\u0530-\u058F]/u.test(value)) return 'hy'; if (/[\u0600-\u06FF]/u.test(value)) return 'ar'; if (/[\u0370-\u03FF]/u.test(value)) return 'el'; if (/[\u3040-\u30FF]/u.test(value)) return 'ja'; if (/[\uAC00-\uD7AF]/u.test(value)) return 'ko'; if (/[\u4E00-\u9FFF]/u.test(value)) return 'zh'; if (/[\u0400-\u04FF]/u.test(value)) return 'ru'; return null;
}

export function inferChannelMetadata(name: string, category: string, explicitLanguage?: string | null, explicitCountry?: string | null): ChannelPresentationMetadata {
  const explicitCountryCode = normalizeCountry(explicitCountry);
  const categoryCountry = peelPrefixes(category).countryCode ?? countryCodeInText(category);
  const nameCountry = peelPrefixes(name).countryCode ?? countryCodeInText(name);
  const country = explicitCountryCode ?? categoryCountry ?? nameCountry;
  const explicitLanguageCode = normalizeLanguage(explicitLanguage);
  const countryLanguage = country ? COUNTRY_LANGUAGE[country] : undefined;
  const language = explicitLanguageCode ?? countryLanguage ?? inferredScriptLanguage(`${name} ${category}`);
  const comparable = normalizedToken(`${name} ${category}`);
  const quality = /(?:^|_)4K(?:_|$)|(?:^|_)UHD(?:_|$)/.test(comparable) ? '4k' : /(?:^|_)FHD(?:_|$)|1080P?/.test(comparable) ? 'fhd' : /(?:^|_)HD(?:_|$)|720P?/.test(comparable) ? 'hd' : /(?:^|_)SD(?:_|$)/.test(comparable) ? 'sd' : null;
  const explicitSignals = Number(Boolean(explicitCountryCode)) + Number(Boolean(explicitLanguageCode));
  const confidence = explicitSignals === 2 ? 1 : explicitSignals === 1 ? 0.9 : categoryCountry || nameCountry ? 0.75 : language ? 0.55 : 0;
  return { country, language, quality, confidence };
}
