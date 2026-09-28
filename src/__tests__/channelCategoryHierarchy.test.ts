import { buildChannelCategoryHierarchy } from '../services/channelCategoryHierarchy';
import type { ChannelCategory } from '../repositories/SQLiteChannelRepository';

const category = (id: string, displayName: string, channelCount: number): ChannelCategory => ({
  id,
  playlistId: 'source',
  name: displayName,
  displayName,
  kind: 'live',
  position: 0,
  categoryIds: [id],
  channelCount,
});

it('regroupe les catégories Live par thème puis par pays', () => {
  const groups = buildChannelCategoryHierarchy([
    category('fr-sport', 'Sport · France', 12),
    category('us-sport', 'Sport · États-Unis', 8),
    category('fr-news', 'Information · France', 5),
  ]);

  expect(groups[0]).toMatchObject({ theme: 'Sport', count: 20, categoryIds: ['fr-sport', 'us-sport'] });
  expect(groups[0]?.countries).toEqual([
    { country: 'France', count: 12, categoryIds: ['fr-sport'] },
    { country: 'États-Unis', count: 8, categoryIds: ['us-sport'] },
  ]);
});
