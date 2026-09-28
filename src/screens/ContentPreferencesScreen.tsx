import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ActionButton, EmptyState, FilterChip, PageHeader, Panel } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { useI18n } from '../i18n';
import { ContentPreferencesRepository, type ContentFacet } from '../repositories/ContentPreferencesRepository';
import { invalidateCatalogData } from '../services/catalogInvalidation';
import { localizedCountryName, localizedLanguageName } from '../services/channelPresentation';
import { allContentThemes, contentThemeLabel, type ContentThemeId } from '../services/contentTaxonomy';
import { preferences } from '../storage/preferences';
import { colors, spacing } from '../theme/tokens';

const repository = new ContentPreferencesRepository();

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function ContentPreferencesScreen() {
  const { language, tx } = useI18n();
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 600;
  const [countries, setCountries] = useState<ContentFacet[]>([]);
  const [languages, setLanguages] = useState<ContentFacet[]>([]);
  const [selectedCountries, setSelectedCountries] = useState(preferences.getPreferredCountries());
  const [selectedLanguages, setSelectedLanguages] = useState(preferences.getPreferredLanguages());
  const [selectedThemes, setSelectedThemes] = useState(preferences.getPreferredThemes() as ContentThemeId[]);
  const [showRaw, setShowRaw] = useState(preferences.getShowRawCategories());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadFacets = () => {
    setLoading(true);
    setError(false);
    Promise.all([repository.countries(), repository.languages()])
      .then(([nextCountries, nextLanguages]) => { setCountries(nextCountries); setLanguages(nextLanguages); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([repository.countries(), repository.languages()])
      .then(([nextCountries, nextLanguages]) => { setCountries(nextCountries); setLanguages(nextLanguages); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const sortedCountries = useMemo(() => [...countries].sort((left, right) => {
    const preferred = Number(selectedCountries.includes(right.code)) - Number(selectedCountries.includes(left.code));
    return preferred || localizedCountryName(left.code, language).localeCompare(localizedCountryName(right.code, language));
  }), [countries, language, selectedCountries]);
  const sortedLanguages = useMemo(() => [...languages].sort((left, right) => {
    const preferred = Number(selectedLanguages.includes(right.code)) - Number(selectedLanguages.includes(left.code));
    return preferred || localizedLanguageName(left.code, language).localeCompare(localizedLanguageName(right.code, language));
  }), [language, languages, selectedLanguages]);

  const updateCountries = (code: string) => {
    const next = toggleValue(selectedCountries, code);
    setSelectedCountries(next); preferences.setPreferredCountries(next); invalidateCatalogData();
  };
  const updateLanguages = (code: string) => {
    const next = toggleValue(selectedLanguages, code);
    setSelectedLanguages(next); preferences.setPreferredLanguages(next); invalidateCatalogData();
  };
  const updateThemes = (theme: ContentThemeId) => {
    const next = toggleValue(selectedThemes, theme) as ContentThemeId[];
    setSelectedThemes(next); preferences.setPreferredThemes(next); invalidateCatalogData();
  };
  const toggleRaw = () => {
    const next = !showRaw;
    setShowRaw(next); preferences.setShowRawCategories(next); invalidateCatalogData();
  };
  const reset = () => {
    setSelectedCountries([]); setSelectedLanguages([]); setSelectedThemes([]); setShowRaw(false);
    preferences.setPreferredCountries([]); preferences.setPreferredLanguages([]); preferences.setPreferredThemes([]); preferences.setShowRawCategories(false);
    invalidateCatalogData();
  };

  return <Screen navigation><ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
    <PageHeader eyebrow={tx('PERSONNALISATION', 'PERSONALIZATION')} title={tx('Mon univers', 'My world')} subtitle={tx('Choisissez vos centres d’intérêt, langues et régions. Aucun contenu n’est supprimé et tout reste accessible.', 'Choose your interests, languages and regions. No content is removed and everything remains accessible.')} />
    {loading ? <ActivityIndicator color={colors.accentStrong} size="large" /> : error ? <View style={styles.errorState}><EmptyState title={tx('Chargement impossible', 'Unable to load')} detail={tx('Les préférences enregistrées sont conservées. Réessayez après avoir vérifié vos sources.', 'Your saved preferences are preserved. Try again after checking your sources.')} /><ActionButton label={tx('Réessayer', 'Try again')} onPress={loadFacets} /></View> : countries.length + languages.length === 0 ? <EmptyState title={tx('Aucune métadonnée disponible', 'No metadata available')} detail={tx('Importez ou actualisez une source pour détecter les pays et les langues.', 'Import or refresh a source to detect countries and languages.')} /> : <>
      <Panel><View style={styles.heading}><View style={styles.headingCopy}><Text style={styles.title}>{tx('Mes univers', 'My interests')}</Text><Text style={styles.detail}>{tx('Choisissez ce que vous aimez. Ces univers remontent en premier sans masquer le reste du catalogue.', 'Choose what you enjoy. These interests appear first without hiding the rest of the catalog.')}</Text></View><Text style={styles.count}>{selectedThemes.length || tx('Tous', 'All')}</Text></View><View style={styles.chips}>{allContentThemes().map((theme) => <FilterChip active={selectedThemes.includes(theme)} key={theme} label={contentThemeLabel(theme, language)} onPress={() => updateThemes(theme)} />)}</View></Panel>
      <Panel><View style={styles.heading}><View style={styles.headingCopy}><Text style={styles.title}>{tx('Pays préférés', 'Preferred countries')}</Text><Text style={styles.detail}>{tx('Ils sont prioritaires dans les catalogues et disponibles dans le filtre rapide du Live.', 'They are prioritized in catalogs and available in the Live quick filter.')}</Text></View><Text style={styles.count}>{selectedCountries.length || tx('Tous', 'All')}</Text></View><View style={styles.chips}>{sortedCountries.map((item) => <FilterChip active={selectedCountries.includes(item.code)} key={item.code} label={`${localizedCountryName(item.code, language)} · ${item.count}`} onPress={() => updateCountries(item.code)} />)}</View></Panel>
      <Panel><View style={styles.heading}><View style={styles.headingCopy}><Text style={styles.title}>{tx('Langues préférées', 'Preferred languages')}</Text><Text style={styles.detail}>{tx('Utilisées pour filtrer rapidement les chaînes quand la source fournit cette information.', 'Used to quickly filter channels when the source provides this information.')}</Text></View><Text style={styles.count}>{selectedLanguages.length || tx('Toutes', 'All')}</Text></View><View style={styles.chips}>{sortedLanguages.map((item) => <FilterChip active={selectedLanguages.includes(item.code)} key={item.code} label={`${localizedLanguageName(item.code, language)} · ${item.count}`} onPress={() => updateLanguages(item.code)} />)}</View></Panel>
      <Panel><Text style={styles.title}>{tx('Catégories fournisseur', 'Provider categories')}</Text><Text style={styles.detail}>{tx('La vue simplifiée regroupe et nettoie les catégories. Activez la vue brute uniquement pour diagnostiquer ou retrouver le classement exact du fournisseur.', 'The simplified view groups and cleans categories. Enable the raw view only to diagnose or recover the provider’s exact classification.')}</Text><View style={styles.actions}><ActionButton icon={showRaw ? 'eye' : 'eye-outline'} label={showRaw ? tx('Vue brute activée', 'Raw view enabled') : tx('Vue simplifiée', 'Simplified view')} onPress={toggleRaw} /><ActionButton label={tx('Réinitialiser', 'Reset')} onPress={reset} variant="secondary" /></View></Panel>
    </>}
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, padding: spacing.xl, paddingBottom: 112 },
  containerCompact: { padding: spacing.lg, paddingBottom: 112 },
  heading: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  headingCopy: { flex: 1, minWidth: 210 },
  title: { color: colors.text, fontSize: 20, fontWeight: '900' },
  detail: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.xs },
  count: { color: colors.accentStrong, fontSize: 15, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  errorState: { alignItems: 'flex-start', gap: spacing.md },
});
