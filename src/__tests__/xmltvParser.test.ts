import { parseXmltv, parseXmltvDate } from '../services/xmltvParser';

describe('XMLTV', () => {
  it('convertit les fuseaux horaires en UTC', () => {
    expect(parseXmltvDate('20260926183000 +0200')).toBe('2026-09-26T16:30:00.000Z');
  });

  it('ignore les programmes invalides et décode les entités', () => {
    const result = parseXmltv(`<?xml version="1.0"?><tv>
      <programme start="20260926183000 +0200" stop="20260926190000 +0200" channel="france2.fr">
        <title lang="fr">Journal &amp; météo</title><desc>Les infos.</desc>
      </programme><programme start="bad" channel="broken"><title>Non</title></programme>
    </tv>`);
    expect(result).toEqual([{ channelTvgId: 'france2.fr', title: 'Journal & météo', description: 'Les infos.', startsAt: '2026-09-26T16:30:00.000Z', endsAt: '2026-09-26T17:00:00.000Z' }]);
  });
});
