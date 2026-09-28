import { getAppLanguage, initializeAppLanguage, setAppLanguage, translate } from '../i18n';
import { applyCategoryLabelOverride, countryCodeFromCategoryLabel, localizeCategoryDisplayName, localizedCountryName, localizedLanguageName } from '../services/channelPresentation';

describe('internationalisation', () => {
  afterEach(() => initializeAppLanguage('fr'));

  it('bascule instantanément entre le français et l’anglais', () => {
    initializeAppLanguage('fr');
    expect(translate('Lecture', 'Playback')).toBe('Lecture');
    setAppLanguage('en');
    expect(getAppLanguage()).toBe('en');
    expect(translate('Lecture', 'Playback')).toBe('Playback');
  });

  it('localise les catégories et pays normalisés sans changer leur identité', () => {
    expect(localizeCategoryDisplayName('Cinéma · Turquie', 'fr')).toBe('Cinéma · Turquie');
    expect(localizeCategoryDisplayName('Cinéma · Turquie', 'en')).toBe('Cinema · Turkey');
    expect(localizeCategoryDisplayName('Sans catégorie', 'en')).toBe('Uncategorized');
  });

  it('nomme les facettes et applique les corrections utilisateur', () => {
    expect(localizedCountryName('TR', 'en')).toBe('Turkey');
    expect(localizedLanguageName('fr', 'en')).toBe('French');
    expect(countryCodeFromCategoryLabel('Sport · Turquie')).toBe('TR');
    expect(applyCategoryLabelOverride('Sport · France', { Sport: 'Sports premium' })).toBe('Sports premium · France');
  });

});
