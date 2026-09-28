import { categorySearchTerms, classifyContentText, contentThemeLabel, parseContentSearchIntent } from '../services/contentTaxonomy';

describe('content taxonomy', () => {
  it('classifies sports independently from language and country', () => {
    expect(classifyContentText('|AR| beIN Sports Football FHD')).toEqual({ theme: 'sports', topic: 'football', competition: null, quality: 'fhd' });
  });

  it('understands a multilingual user intent', () => {
    expect(parseContentSearchIntent('football arabe 4K')).toEqual({ text: '', theme: 'sports', topic: 'football', language: 'ar', country: null, quality: '4k' });
    expect(parseContentSearchIntent('actualité Algérie')).toMatchObject({ theme: 'news', country: 'DZ' });
  });

  it('localizes labels while keeping canonical ids', () => {
    expect(contentThemeLabel('sports', 'fr')).toBe('Sport');
    expect(contentThemeLabel('sports', 'en')).toBe('Sports');
    expect(categorySearchTerms('sports', 'football')).toEqual(expect.arrayContaining(['SPORT', 'SPORTS', 'FOOTBALL']));
  });
});
