import { fingerprintRemoteEndpoint, normalizeRemoteEndpoint } from '../services/sourceIdentity';

describe('identité des sources', () => {
  it('normalise le serveur, le port, le fragment et l’ordre des paramètres', () => {
    const first = 'HTTPS://Example.COM:443/list.m3u?b=2&a=1#section';
    const second = 'https://example.com/list.m3u?a=1&b=2';

    expect(normalizeRemoteEndpoint(first)).toBe(second);
    expect(fingerprintRemoteEndpoint(first)).toBe(fingerprintRemoteEndpoint(second));
  });
});
