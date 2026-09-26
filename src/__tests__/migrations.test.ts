import { DATABASE_VERSION, migrationV1, migrationV2, migrationV3 } from '../storage/migrations';

describe('schéma de données', () => {
  it('conserve les secrets hors de SQLite', () => {
    expect(migrationV1).not.toContain('password');
    expect(migrationV1).not.toContain('username');
    expect(migrationV1).not.toContain('token');
  });

  it('indexe les recherches Live et EPG', () => {
    expect(migrationV1).toContain('idx_channels_playlist');
    expect(migrationV1).toContain('idx_epg_now_next');
    expect(DATABASE_VERSION).toBe(5);
  });

  it('ne change pas le journal SQLite dans la transaction de migration', () => {
    expect(migrationV1).not.toContain('journal_mode');
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
