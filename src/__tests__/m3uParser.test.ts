import { parseM3u } from '../services/m3uParser';

describe('parseM3u', () => {
  it('détecte la source EPG déclarée dans l’en-tête', () => {
    const result = parseM3u('#EXTM3U x-tvg-url="https://example.com/guide.xml.gz"\n#EXTINF:-1 tvg-id="one",One\nhttps://example.com/one.m3u8');
    expect(result.epgUrls).toEqual(['https://example.com/guide.xml.gz']);
  });
  it('lit les métadonnées Extended M3U', () => {
    const result = parseM3u(`
#EXTM3U
#EXTINF:-1 tvg-id="france2.fr" tvg-name="France 2" tvg-logo="https://img.test/fr2.png" group-title="France",France 2 HD
https://stream.test/france2/index.m3u8
`);

    expect(result.channels).toEqual([
      {
        name: 'France 2 HD',
        streamUrl: 'https://stream.test/france2/index.m3u8',
        groupTitle: 'France',
        tvgId: 'france2.fr',
        tvgName: 'France 2',
        logoUrl: 'https://img.test/fr2.png',
        language: null,
        country: null,
      },
    ]);
  });

  it('déduplique les URLs et ignore les protocoles non pris en charge', () => {
    const result = parseM3u(`
#EXTM3U
#EXTINF:-1 group-title="Test",Une
https://stream.test/one.m3u8
#EXTINF:-1 group-title="Test",Doublon
https://stream.test/one.m3u8
#EXTINF:-1,Local interdit
file:///secret/video.ts
`);

    expect(result.channels).toHaveLength(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.ignoredCount).toBe(1);
  });

  it('accepte une URL sans EXTINF avec un nom de secours', () => {
    const result = parseM3u('https://stream.test/live/channel-42.m3u8');

    expect(result.channels[0]?.name).toBe('channel-42.m3u8');
    expect(result.channels[0]?.groupTitle).toBe('Sans catégorie');
  });

  it('traite une playlist de 50 000 chaînes', () => {
    const lines = ['#EXTM3U'];
    for (let index = 0; index < 50_000; index += 1) {
      lines.push(`#EXTINF:-1 group-title="Charge",Chaîne ${index}`);
      lines.push(`https://stream.test/${index}.m3u8`);
    }

    const result = parseM3u(lines.join('\n'));
    expect(result.channels).toHaveLength(50_000);
  });
});
