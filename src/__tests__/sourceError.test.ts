import { describeSourceError } from '../services/sourceError';

describe('erreurs de source compréhensibles', () => {
  it('explique le blocage App Transport Security sans afficher la trace native', () => {
    const result = describeSourceError(new Error('fetch failed: App Transport Security policy requires the use of a secure connection. ExpoModulesCore/Promise.swift:56'));
    expect(result).toContain('iOS bloque les serveurs HTTP');
    expect(result).not.toContain('Promise.swift');
  });

  it('explique une erreur réseau générique', () => {
    expect(describeSourceError(new Error('Network request failed'))).toContain('Connexion au serveur impossible');
  });
});
