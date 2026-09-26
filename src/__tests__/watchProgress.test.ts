import { shouldKeepProgress } from '../services/watchProgressPolicy';

describe('progression de lecture', () => {
  it('conserve une lecture réellement commencée et non terminée', () => {
    expect(shouldKeepProgress(600, 3600)).toBe(true);
  });

  it('ignore les premières secondes', () => {
    expect(shouldKeepProgress(7, 3600)).toBe(false);
  });

  it('retire un contenu presque terminé', () => {
    expect(shouldKeepProgress(3550, 3600)).toBe(false);
  });
});
