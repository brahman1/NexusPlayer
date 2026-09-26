import { m3uUrlInputSchema, xtreamInputSchema } from '../types/validation';

describe('validation des sources', () => {
  it('accepte une URL M3U HTTP ou HTTPS', () => {
    expect(
      m3uUrlInputSchema.safeParse({ name: 'Télévision', url: 'https://example.com/list.m3u' })
        .success,
    ).toBe(true);
  });

  it('rejette un protocole non pris en charge', () => {
    expect(
      m3uUrlInputSchema.safeParse({ name: 'Télévision', url: 'ftp://example.com/list.m3u' })
        .success,
    ).toBe(false);
  });

  it('exige les identifiants Xtream', () => {
    expect(
      xtreamInputSchema.safeParse({
        name: 'Abonnement',
        serverUrl: 'https://example.com',
        username: '',
        password: '',
      }).success,
    ).toBe(false);
  });
});
