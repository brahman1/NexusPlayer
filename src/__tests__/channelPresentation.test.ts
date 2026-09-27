import { categoryDisplayName, categorySortKey, channelDisplayName, naturalSortKey } from '../services/channelPresentation';

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

  it('trie naturellement les numéros et place les catégories utiles en premier', () => {
    expect(naturalSortKey('France 2') < naturalSortKey('France 10')).toBe(true);
    expect(categorySortKey('NEWS') < categorySortKey('OTHER')).toBe(true);
  });
});
