import { createPlaylistSyncReport, type ExistingChannelSnapshot } from '../services/playlistSync';
import type { ParsedM3uChannel } from '../services/m3uParser';

function channel(name: string, streamUrl: string): ParsedM3uChannel {
  return { name, streamUrl, groupTitle: 'TV', tvgId: null, tvgName: null, logoUrl: null, language: null, country: null };
}

describe('rapport de synchronisation', () => {
  it('compte les ajouts, modifications, suppressions et éléments inchangés', () => {
    const existing: ExistingChannelSnapshot[] = [
      { ...channel('Une', 'https://test/1'), isFavorite: false, lastWatchedAt: null },
      { ...channel('Deux', 'https://test/2'), isFavorite: true, lastWatchedAt: null },
      { ...channel('Ancienne', 'https://test/3'), isFavorite: false, lastWatchedAt: null },
    ];
    const incoming = [channel('Une', 'https://test/1'), channel('Deux HD', 'https://test/2'), channel('Nouvelle', 'https://test/4')];

    expect(createPlaylistSyncReport(existing, incoming)).toEqual({ added: 1, modified: 1, removed: 1, unchanged: 1 });
  });
});
