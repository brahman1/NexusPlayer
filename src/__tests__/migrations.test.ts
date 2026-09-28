import { DATABASE_VERSION, migrationV1, migrationV2, migrationV3, migrationV6, migrationV7, migrationV8, migrationV9, migrationV10 } from '../storage/migrations';

describe('schéma de données', () => {
  it('conserve les secrets hors de SQLite', () => {
    expect(migrationV1).not.toContain('password');
    expect(migrationV1).not.toContain('username');
    expect(migrationV1).not.toContain('token');
  });

  it('indexe les recherches Live et EPG', () => {
    expect(migrationV1).toContain('idx_channels_playlist');
    expect(migrationV1).toContain('idx_epg_now_next');
    expect(DATABASE_VERSION).toBe(10);
  });

  it('indexe les catalogues globaux et le tri rapide des chaînes', () => {
    expect(migrationV7).toContain('idx_channels_playlist_sort');
    expect(migrationV7).toContain('idx_movies_name');
    expect(migrationV7).toContain('idx_series_name');
  });

  it('indexe les noms de présentation sans remplacer les noms fournisseur', () => {
    expect(migrationV6).toContain('display_name');
    expect(migrationV6).toContain('sort_name');
    expect(migrationV6).toContain('idx_channels_display_sort');
  });

  it('ajoute des noms de présentation séparés pour les films, séries et épisodes', () => {
    expect(migrationV8).toContain('ALTER TABLE movies ADD COLUMN display_name');
    expect(migrationV8).toContain('ALTER TABLE series ADD COLUMN display_name');
    expect(migrationV8).toContain('ALTER TABLE episodes ADD COLUMN display_name');
    expect(migrationV8).toContain('idx_movies_display_sort');
  });

  it('ne change pas le journal SQLite dans la transaction de migration', () => {
    expect(migrationV1).not.toContain('journal_mode');
  });

  it('indexe les rayons et favoris pour les grands catalogues', () => {
    expect(migrationV9).toContain('idx_movies_category_sort');
    expect(migrationV9).toContain('idx_series_category_sort');
    expect(migrationV9).toContain('idx_movies_favorite_sort');
    expect(migrationV9).toContain('idx_series_favorite_sort');
  });

  it('indexe le classement mondial par pays et langue', () => {
    expect(migrationV10).toContain('idx_channels_locale_sort');
    expect(migrationV10).toContain('idx_categories_kind_sort');
  });

  it('indexe de manière unique les sources normalisées', () => {
    expect(migrationV2).toContain('source_fingerprint');
    expect(migrationV2).toContain('UNIQUE INDEX');
  });

  it('mémorise les validateurs HTTP sans stocker de secret', () => {
    expect(migrationV3).toContain('http_etag');
    expect(migrationV3).toContain('http_last_modified');
    expect(migrationV3).not.toContain('authorization');
  });
});
