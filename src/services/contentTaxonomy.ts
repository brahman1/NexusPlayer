export type ContentThemeId = 'general' | 'news' | 'sports' | 'cinema' | 'kids' | 'documentary' | 'music' | 'entertainment' | 'religion' | 'local' | 'international' | 'other';
export type ContentTopicId = 'football' | 'basketball' | 'tennis' | 'motorsport' | 'combat' | 'rugby' | 'cycling' | 'golf' | 'animation' | 'family' | 'action' | 'comedy' | 'drama' | 'thriller' | 'horror' | 'scifi' | 'romance' | 'crime' | 'history';
export type ContentQuality = '4k' | 'fhd' | 'hd' | 'sd';
export type ContentCompetitionId = 'champions-league' | 'premier-league' | 'ligue-1' | 'la-liga' | 'serie-a' | 'bundesliga' | 'nba' | 'euroleague' | 'formula-1' | 'motogp' | 'ufc' | 'atp' | 'wta';

type Language = 'fr' | 'en';
type Rule<T extends string> = { id: T; pattern: RegExp };

const THEME_RULES: Rule<ContentThemeId>[] = [
  { id: 'sports', pattern: /\b(?:SPORTS?|SPOR|DEPORTES?|FOOTBALL|FUSSBALL|SOCCER|رياض[ةي])\b/iu },
  { id: 'news', pattern: /\b(?:NEWS|INFO|INFORMATION|ACTUALIT|HABER|NOTICIAS?|NACHRICHT|NOVOST)\b|أخبار/iu },
  { id: 'kids', pattern: /\b(?:KIDS?|CHILDREN|JEUNESSE|ENFANTS?|COCUK|CARTOONS?)\b|أطفال/iu },
  { id: 'documentary', pattern: /\b(?:DOCUMENTAR(?:Y|IES)|DOCUMENTAIRES?|BELGESEL|DOKU)\b|وثائقي/iu },
  { id: 'music', pattern: /\b(?:MUSIC|MUSIQUE|MUZIK|RADIO)\b|موسيقى/iu },
  { id: 'religion', pattern: /\b(?:RELIGION|RELIGIOUS|ISLAM|CHRISTIAN|CHURCH|QURAN)\b|(?:إسلام|قرآن|دين)/iu },
  { id: 'cinema', pattern: /\b(?:MOVIES?|FILMS?|CINEMA|VOD|KINO)\b|أفلام/iu },
  { id: 'entertainment', pattern: /\b(?:ENTERTAINMENT|DIVERTISSEMENT|EGLENCE)\b|ترفيه/iu },
  { id: 'local', pattern: /\b(?:LOCAL|REGIONAL|REGIONALES?)\b/iu },
  { id: 'international', pattern: /\b(?:WORLD|INTERNATIONAL|INTL)\b/iu },
  { id: 'general', pattern: /\b(?:GENERAL|GENERALISTE|GÉNÉRALISTE)\b/iu },
];

const TOPIC_RULES: Rule<ContentTopicId>[] = [
  { id: 'football', pattern: /\b(?:FOOTBALL|FUSSBALL|SOCCER|FUTBOL|CALCIO|UCL|UEFA|CHAMPIONS? LEAGUE|PREMIER LEAGUE|LIGUE 1|LA LIGA|SERIE A|BUNDESLIGA)\b|كرة\s*القدم/iu },
  { id: 'basketball', pattern: /\b(?:BASKET(?:BALL)?|NBA|EUROLEAGUE)\b|كرة\s*السلة/iu },
  { id: 'tennis', pattern: /\b(?:TENNIS|ATP|WTA|ROLAND GARROS|WIMBLEDON)\b|تنس/iu },
  { id: 'motorsport', pattern: /\b(?:FORMULA ?1|F1|MOTO ?GP|MOTORSPORT|RALLY|NASCAR)\b|سباقات/iu },
  { id: 'combat', pattern: /\b(?:BOXING|BOXE|UFC|MMA|WRESTLING|CATCH)\b|ملاكمة/iu },
  { id: 'rugby', pattern: /\bRUGBY\b/iu },
  { id: 'cycling', pattern: /\b(?:CYCLING|CYCLISME|TOUR DE FRANCE)\b/iu },
  { id: 'golf', pattern: /\bGOLF\b/iu },
  { id: 'animation', pattern: /\b(?:ANIMATION|ANIME|CARTOON)\b/iu },
  { id: 'family', pattern: /\b(?:FAMILY|FAMILLE|AILE)\b/iu },
  { id: 'action', pattern: /\b(?:ACTION|AKSIYON)\b/iu },
  { id: 'comedy', pattern: /\b(?:COMEDY|COMEDIE|COMÉDIE|KOMEDI|COMEDIA)\b/iu },
  { id: 'drama', pattern: /\b(?:DRAMA|DRAME|DRAM)\b/iu },
  { id: 'thriller', pattern: /\b(?:THRILLER|SUSPENSE|GERILIM)\b/iu },
  { id: 'horror', pattern: /\b(?:HORROR|HORREUR|KORKU|TERROR)\b/iu },
  { id: 'scifi', pattern: /\b(?:SCI[ -]?FI|SCIENCE[ -]?FICTION|FANTASY|FANTASTIQUE)\b/iu },
  { id: 'romance', pattern: /\b(?:ROMANCE|ROMANTIC|ROMANTIQUE)\b/iu },
  { id: 'crime', pattern: /\b(?:CRIME|POLICIER|POLISIYE|DETECTIVE)\b/iu },
  { id: 'history', pattern: /\b(?:HISTORY|HISTORIQUE|TARIH)\b/iu },
];

const COMPETITION_RULES: Rule<ContentCompetitionId>[] = [
  { id: 'champions-league', pattern: /\b(?:UCL|UEFA CHAMPIONS? LEAGUE|LIGUE DES CHAMPIONS)\b/iu },
  { id: 'premier-league', pattern: /\bPREMIER LEAGUE\b/iu }, { id: 'ligue-1', pattern: /\bLIGUE ?1\b/iu },
  { id: 'la-liga', pattern: /\bLA ?LIGA\b/iu }, { id: 'serie-a', pattern: /\bSERIE ?A\b/iu },
  { id: 'bundesliga', pattern: /\bBUNDESLIGA\b/iu }, { id: 'nba', pattern: /\bNBA\b/iu },
  { id: 'euroleague', pattern: /\bEUROLEAGUE\b/iu }, { id: 'formula-1', pattern: /\b(?:FORMULA ?1|F1)\b/iu },
  { id: 'motogp', pattern: /\bMOTO ?GP\b/iu }, { id: 'ufc', pattern: /\bUFC\b/iu },
  { id: 'atp', pattern: /\bATP\b/iu }, { id: 'wta', pattern: /\bWTA\b/iu },
];

const COMPETITION_LABELS: Record<ContentCompetitionId, string> = {
  'champions-league': 'UEFA Champions League', 'premier-league': 'Premier League', 'ligue-1': 'Ligue 1', 'la-liga': 'LaLiga', 'serie-a': 'Serie A', bundesliga: 'Bundesliga', nba: 'NBA', euroleague: 'EuroLeague', 'formula-1': 'Formula 1', motogp: 'MotoGP', ufc: 'UFC', atp: 'ATP', wta: 'WTA',
};

const THEME_LABELS: Record<ContentThemeId, [string, string]> = {
  general: ['Généralistes', 'General'], news: ['Information', 'News'], sports: ['Sport', 'Sports'], cinema: ['Cinéma', 'Cinema'], kids: ['Jeunesse', 'Kids'], documentary: ['Documentaires', 'Documentaries'], music: ['Musique', 'Music'], entertainment: ['Divertissement', 'Entertainment'], religion: ['Religion', 'Religion'], local: ['Locales', 'Local'], international: ['International', 'International'], other: ['Autres', 'Other'],
};

const TOPIC_LABELS: Record<ContentTopicId, [string, string]> = {
  football: ['Football', 'Football'], basketball: ['Basketball', 'Basketball'], tennis: ['Tennis', 'Tennis'], motorsport: ['Sports automobiles', 'Motorsports'], combat: ['Sports de combat', 'Combat sports'], rugby: ['Rugby', 'Rugby'], cycling: ['Cyclisme', 'Cycling'], golf: ['Golf', 'Golf'], animation: ['Animation', 'Animation'], family: ['Famille', 'Family'], action: ['Action', 'Action'], comedy: ['Comédie', 'Comedy'], drama: ['Drame', 'Drama'], thriller: ['Thriller', 'Thriller'], horror: ['Horreur', 'Horror'], scifi: ['Science-fiction et fantastique', 'Science fiction & fantasy'], romance: ['Romance', 'Romance'], crime: ['Policier', 'Crime'], history: ['Historique', 'History'],
};

const LANGUAGE_INTENTS: [string, RegExp][] = [
  ['ar', /\b(?:AR|ARABIC|ARABE)\b|عربي/iu], ['fr', /\b(?:FR|FRENCH|FRANCAIS|FRANÇAIS)\b/iu], ['en', /\b(?:EN|ENGLISH|ANGLAIS)\b/iu], ['tr', /\b(?:TR|TURKISH|TURC|TURKCE)\b/iu], ['es', /\b(?:ES|SPANISH|ESPAGNOL|ESPANOL)\b/iu], ['de', /\b(?:DE|GERMAN|ALLEMAND|DEUTSCH)\b/iu], ['it', /\b(?:IT|ITALIAN|ITALIEN)\b/iu], ['pt', /\b(?:PT|PORTUGUESE|PORTUGAIS)\b/iu], ['ru', /\b(?:RU|RUSSIAN|RUSSE)\b/iu],
];

const COUNTRY_INTENTS: [string, RegExp][] = [
  ['DZ', /\b(?:ALGERIA|ALGERIE|ALGÉRIE)\b|الجزائر/iu], ['MA', /\b(?:MOROCCO|MAROC)\b|المغرب/iu], ['TN', /\b(?:TUNISIA|TUNISIE)\b|تونس/iu], ['EG', /\b(?:EGYPT|EGYPTE|ÉGYPTE)\b|مصر/iu], ['SA', /\b(?:SAUDI|ARABIE SAOUDITE)\b|السعودية/iu], ['FR', /\bFRANCE\b/iu], ['GB', /\b(?:UK|UNITED KINGDOM|ROYAUME UNI)\b/iu], ['US', /\b(?:USA|UNITED STATES|ETATS UNIS|ÉTATS UNIS)\b/iu], ['TR', /\b(?:TURKEY|TURQUIE|TURKIYE)\b/iu], ['ES', /\b(?:SPAIN|ESPAGNE)\b/iu], ['IT', /\b(?:ITALY|ITALIE)\b/iu],
];

export function contentThemeLabel(id: ContentThemeId, language: Language) { return THEME_LABELS[id][language === 'fr' ? 0 : 1]; }
export function contentTopicLabel(id: ContentTopicId, language: Language) { return TOPIC_LABELS[id][language === 'fr' ? 0 : 1]; }
export function contentCompetitionLabel(id: ContentCompetitionId) { return COMPETITION_LABELS[id]; }
export function allContentThemes() { return (Object.keys(THEME_LABELS) as ContentThemeId[]).filter((id) => id !== 'other'); }

export function detectQuality(value: string): ContentQuality | null {
  const normalized = value.toUpperCase();
  if (/(?:^|\W)(?:4K|UHD|2160P?)(?:\W|$)/.test(normalized)) return '4k';
  if (/(?:^|\W)(?:FHD|FULL ?HD|1080P?)(?:\W|$)/.test(normalized)) return 'fhd';
  if (/(?:^|\W)(?:HD|720P?)(?:\W|$)/.test(normalized)) return 'hd';
  if (/(?:^|\W)(?:SD|480P?)(?:\W|$)/.test(normalized)) return 'sd';
  return null;
}

export function classifyContentText(value: string) {
  const topic = TOPIC_RULES.find((rule) => rule.pattern.test(value))?.id ?? null;
  const competition = COMPETITION_RULES.find((rule) => rule.pattern.test(value))?.id ?? null;
  const sportsTopics: ContentTopicId[] = ['football', 'basketball', 'tennis', 'motorsport', 'combat', 'rugby', 'cycling', 'golf'];
  const mediaTopics: ContentTopicId[] = ['animation', 'family', 'action', 'comedy', 'drama', 'thriller', 'horror', 'scifi', 'romance', 'crime', 'history'];
  const theme = THEME_RULES.find((rule) => rule.pattern.test(value))?.id ?? (topic && sportsTopics.includes(topic) ? 'sports' : topic && mediaTopics.includes(topic) ? 'cinema' : 'other');
  return { theme, topic, competition, quality: detectQuality(value) };
}

export type ContentSearchIntent = { text: string; theme: ContentThemeId | null; topic: ContentTopicId | null; language: string | null; country: string | null; quality: ContentQuality | null };

export function parseContentSearchIntent(query: string): ContentSearchIntent {
  let text = query.normalize('NFKC').trim();
  const classified = classifyContentText(text);
  const languageRule = LANGUAGE_INTENTS.find(([, pattern]) => pattern.test(text));
  const countryRule = COUNTRY_INTENTS.find(([, pattern]) => pattern.test(text));
  const matchedPatterns = [
    THEME_RULES.find((rule) => rule.id === classified.theme)?.pattern,
    TOPIC_RULES.find((rule) => rule.id === classified.topic)?.pattern,
    languageRule?.[1], countryRule?.[1],
    /(?:^|\W)(?:4K|UHD|2160P?|FHD|FULL ?HD|1080P?|HD|720P?|SD|480P?)(?:\W|$)/iu,
  ].filter((pattern): pattern is RegExp => Boolean(pattern));
  for (const pattern of matchedPatterns) text = text.replace(pattern, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  return { text, theme: classified.theme === 'other' ? null : classified.theme, topic: classified.topic, language: languageRule?.[0] ?? null, country: countryRule?.[0] ?? null, quality: classified.quality };
}

export function categorySearchTerms(theme: ContentThemeId | null, topic: ContentTopicId | null) {
  const terms: string[] = [];
  if (theme) terms.push(contentThemeLabel(theme, 'fr'), contentThemeLabel(theme, 'en'));
  if (topic) terms.push(contentTopicLabel(topic, 'fr'), contentTopicLabel(topic, 'en'));
  return [...new Set(terms.map((term) => term.toUpperCase()))];
}
