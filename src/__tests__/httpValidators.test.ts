import { createConditionalHeaders, readHttpValidators } from '../services/httpValidators';

describe('validateurs HTTP', () => {
  it('construit une requête conditionnelle uniquement avec les valeurs disponibles', () => {
    expect(createConditionalHeaders({ etag: '"catalog-v2"', lastModified: null })).toEqual({
      'If-None-Match': '"catalog-v2"',
    });
    expect(createConditionalHeaders({ etag: ' ', lastModified: 'Wed, 21 Oct 2015 07:28:00 GMT' })).toEqual({
      'If-Modified-Since': 'Wed, 21 Oct 2015 07:28:00 GMT',
    });
  });

  it('actualise les validateurs reçus et conserve ceux absents', () => {
    const headers = new Headers({ etag: '"catalog-v3"' });
    expect(readHttpValidators(headers, {
      etag: '"catalog-v2"',
      lastModified: 'Wed, 21 Oct 2015 07:28:00 GMT',
    })).toEqual({
      etag: '"catalog-v3"',
      lastModified: 'Wed, 21 Oct 2015 07:28:00 GMT',
    });
  });
});
