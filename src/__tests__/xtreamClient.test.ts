import { deduplicateXtreamCatalog, fetchXtreamCatalog, fetchXtreamSeriesEpisodes, normalizeXtreamServer, xtreamMediaUrl } from '../services/xtreamClient';

describe('Xtream client', () => {
  const credentials = { username: 'user@example.com', password: 'p@ss word' };

  it('normalise le serveur sans conserver de secret', () => {
    expect(normalizeXtreamServer('https://login:secret@example.com:8080/path/?token=bad')).toBe('https://example.com:8080/path');
  });

  it('construit les flux uniquement au moment de la lecture', () => {
    expect(xtreamMediaUrl('https://example.com', credentials, 'xtream://live/42.ts'))
      .toBe('https://example.com/live/user%40example.com/p%40ss%20word/42.ts');
  });

  it('valide le compte puis charge les six catalogues', async () => {
    const responses: unknown[] = [{ user_info: { auth: 1, status: 'Active' } }, [{ category_id: '1', category_name: 'News' }], [{ stream_id: 42, name: 'News' }], [], [], [], []];
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify(responses.shift()), { status: 200 }));
    const result = await fetchXtreamCatalog('https://example.com', credentials);
    expect(result.liveStreams).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(fetchMock.mock.calls[1]?.[0].toString()).toContain('action=get_live_categories');
    fetchMock.mockRestore();
  });

  it('refuse un compte non autorisé sans charger le catalogue', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ user_info: { auth: 0 } }), { status: 200 }));
    await expect(fetchXtreamCatalog('https://example.com', credentials)).rejects.toThrow('Connexion Xtream refusée');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
  });

  it('déduplique les identifiants répétés fournis par certains serveurs', () => {
    const catalog = deduplicateXtreamCatalog({
      liveCategories: [{ category_id: '1', category_name: 'Live' }, { category_id: '1', category_name: 'Doublon' }],
      liveStreams: [{ stream_id: 7, name: 'A' }, { stream_id: 7, name: 'A bis' }],
      vodCategories: [],
      vodStreams: [{ stream_id: 42, name: 'Film A' }, { stream_id: 42, name: 'Film A copie' }],
      seriesCategories: [],
      series: [{ series_id: 9, name: 'Série' }, { series_id: 9, name: 'Série copie' }],
    });
    expect(catalog.liveCategories).toHaveLength(1);
    expect(catalog.liveStreams).toHaveLength(1);
    expect(catalog.vodStreams).toHaveLength(1);
    expect(catalog.series).toHaveLength(1);
  });

  it('convertit les épisodes Xtream et envoie series_id séparément', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ episodes: { '1': [{ id: 88, episode_num: 2, title: 'Suite', container_extension: 'mkv', info: { duration_secs: 1500 } }] } }), { status: 200 }));
    const episodes = await fetchXtreamSeriesEpisodes('https://example.com', credentials, '99');
    expect(episodes[0]).toMatchObject({ id: '88', season: 1, episode: 2, extension: 'mkv' });
    const requestUrl = fetchMock.mock.calls[0]?.[0].toString() ?? '';
    expect(requestUrl).toContain('action=get_series_info');
    expect(requestUrl).toContain('series_id=99');
    fetchMock.mockRestore();
  });
});
