import { buildChannelCategoryHierarchy } from '../services/channelCategoryHierarchy';
import type { ChannelCategory } from '../repositories/SQLiteChannelRepository';

const category = (id: string, displayName: string, channelCount: number, rawName = displayName): ChannelCategory => ({
  id,
  playlistId: 'source',
  name: displayName,
  displayName,
  kind: 'live',
  position: 0,
  categoryIds: [id],
  channelCount,
  rawNames: [rawName],
});

it('expose les disciplines et compétitions sans dépendre du pays', () => {
  const [sports] = buildChannelCategoryHierarchy([
    category('ar-ucl', 'Sport · Égypte', 4, 'AR | UEFA Champions League'),
    category('fr-l1', 'Sport · France', 6, 'FR | Ligue 1 Football'),
  ], 'en');
  expect(sports).toMatchObject({ id: 'sports', theme: 'Sports', count: 10 });
  expect(sports?.topics[0]).toMatchObject({ id: 'football', count: 10 });
  expect(sports?.competitions.map((item) => item.id)).toEqual(expect.arrayContaining(['champions-league', 'ligue-1']));
});

it('regroupe les catégories Live par thème puis par pays', () => {
  const groups = buildChannelCategoryHierarchy([
    category('fr-sport', 'Sport · France', 12),
    category('us-sport', 'Sport · États-Unis', 8),
    category('fr-news', 'Information · France', 5),
  ]);

  expect(groups[0]).toMatchObject({ id: 'sports', theme: 'Sport', count: 20, categoryIds: ['fr-sport', 'us-sport'] });
  expect(groups[0]?.countries).toEqual([
    { country: 'France', count: 12, categoryIds: ['fr-sport'] },
    { country: 'États-Unis', count: 8, categoryIds: ['us-sport'] },
  ]);
});
