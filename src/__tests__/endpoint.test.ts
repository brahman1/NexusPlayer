import { endpointForDisplay } from '../utils/endpoint';

describe('endpointForDisplay', () => {
  it('masque les identifiants et paramètres sensibles', () => {
    expect(
      endpointForDisplay('https://user:password@example.com/get.php?username=user&password=secret'),
    ).toBe('https://example.com/get.php');
  });

  it('ne révèle pas un chemin de fichier local', () => {
    expect(endpointForDisplay('file:///private/cache/list.m3u')).toBe('Fichier local');
  });
});
