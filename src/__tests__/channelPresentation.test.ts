import { categoryDisplayName, categorySortKey, channelDisplayName, episodeDisplayName, inferChannelMetadata, mediaDisplayName, naturalSortKey } from '../services/channelPresentation';

describe('présentation des chaînes et catégories', () => {
  it('retire les préfixes techniques des chaînes sans modifier le nom utile', () => {
    expect(channelDisplayName('🇫🇷 [FR] | VIP : CANAL+   SPORT UHD')).toBe('CANAL+ SPORT UHD');
    expect(channelDisplayName('FHD | France 2')).toBe('France 2');
  });

  it('rend les catégories fournisseur plus lisibles', () => {
    expect(categoryDisplayName('FR | SPORTS')).toBe('Sport · France');
    expect(categoryDisplayName('  NO CATEGORY ')).toBe('Sans catégorie');
    expect(categoryDisplayName('DOCUMENTARY')).toBe('Documentaires');
  });

  it('regroupe les catégories multilingues dans une taxonomie stable', () => {
    expect(categoryDisplayName('TR | AKSIYON', 'movie')).toBe('Action · Turquie');
    expect(categoryDisplayName('ARM | COMEDY', 'series')).toBe('Comédie · Arménie');
    expect(categoryDisplayName('TR | HABER', 'live')).toBe('Information · Turquie');
    expect(categoryDisplayName('TURKISH MOVIES', 'movie')).toBe('Cinéma · Turquie');
  });

  it('détecte les métadonnées sans écraser les valeurs explicites', () => {
    expect(inferChannelMetadata('TR | TRT 1 FHD', 'TR | GENERAL')).toMatchObject({ country: 'TR', language: 'tr', quality: 'fhd' });
    expect(inferChannelMetadata('Հայկական TV', 'International')).toMatchObject({ language: 'hy' });
    expect(inferChannelMetadata('BBC One', 'UK | NEWS', 'English', 'United Kingdom')).toMatchObject({ country: 'GB', language: 'en', confidence: 1 });
  });

  it('priorise la région de l’utilisateur sans masquer les autres pays', () => {
    expect(categorySortKey('FR | NEWS', 'live', 'FR') < categorySortKey('US | NEWS', 'live', 'FR')).toBe(true);
    expect(categorySortKey('US | NEWS', 'live', 'US') < categorySortKey('FR | NEWS', 'live', 'US')).toBe(true);
  });

  it('trie naturellement les numéros et place les catégories utiles en premier', () => {
    expect(naturalSortKey('France 2') < naturalSortKey('France 10')).toBe(true);
    expect(categorySortKey('NEWS') < categorySortKey('OTHER')).toBe(true);
  });

  it('nettoie les films, séries et épisodes sans perdre la valeur fournisseur', () => {
    expect(mediaDisplayName('FR | VOD | [4K] - LE FABULEUX DESTIN D’AMÉLIE POULAIN (FHD)')).toBe('Le Fabuleux Destin D’Amélie Poulain');
    expect(mediaDisplayName('[VIP] SERIES : THE LAST OF US')).toBe('The Last Of Us');
    expect(episodeDisplayName('EPISODE 03', 1, 3)).toBe('Épisode 3');
  });
});
