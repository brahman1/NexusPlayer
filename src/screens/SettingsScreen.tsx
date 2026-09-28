import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FocusableCard } from '../components/FocusableCard';
import { PageHeader } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { useI18n } from '../i18n';
import { preferences, type AutoSyncIntervalHours } from '../storage/preferences';
import { colors, spacing } from '../theme/tokens';

export function SettingsScreen() {
  const router = useRouter();
  const { language, setLanguage, tx } = useI18n();
  const [contrast, setContrast] = useState(preferences.getHighContrast());
  const [motion, setMotion] = useState(preferences.getReduceMotion());
  const [textScale, setTextScale] = useState(preferences.getTextScale());
  const [subtitleSize, setSubtitleSize] = useState(preferences.getSubtitleSize());
  const [syncInterval, setSyncInterval] = useState(preferences.getAutoSyncIntervalHours());
  const [contentPreferenceCount, setContentPreferenceCount] = useState(() => preferences.getPreferredCountries().length + preferences.getPreferredLanguages().length + preferences.getPreferredThemes().length);
  useFocusEffect(useCallback(() => { setContentPreferenceCount(preferences.getPreferredCountries().length + preferences.getPreferredLanguages().length + preferences.getPreferredThemes().length); }, []));
  const toggleContrast = () => { const value = !contrast; setContrast(value); preferences.setHighContrast(value); };
  const toggleMotion = () => { const value = !motion; setMotion(value); preferences.setReduceMotion(value); };
  const cycleText = () => { const value = textScale >= 1.25 ? 1 : textScale + 0.25; setTextScale(value); preferences.setTextScale(value); };
  const cycleSubtitles = () => { const value = subtitleSize >= 1.5 ? 1 : subtitleSize + 0.25; setSubtitleSize(value); preferences.setSubtitleSize(value); };
  const cycleSyncInterval = () => {
    const values: AutoSyncIntervalHours[] = [0, 1, 6, 12, 24];
    const value = values[(values.indexOf(syncInterval) + 1) % values.length]!;
    setSyncInterval(value);
    preferences.setAutoSyncIntervalHours(value);
  };
  const toggleLanguage = () => {
    const value = language === 'fr' ? 'en' : 'fr';
    preferences.setLanguage(value);
    setLanguage(value);
  };
  const syncLabel = syncInterval === 0 ? tx('Manuelle', 'Manual') : tx(`Toutes les ${syncInterval} h`, `Every ${syncInterval} hours`);
  const rows = [
    [tx('Langue', 'Language'), language === 'fr' ? 'Français' : 'English', toggleLanguage],
    [tx('Personnalisation du contenu', 'Content personalization'), contentPreferenceCount ? tx(`${contentPreferenceCount} choix`, `${contentPreferenceCount} selected`) : tx('Tout afficher', 'Show all'), () => router.push('/(tabs)/content-preferences' as Href)],
    [tx('Contraste renforcé', 'High contrast'), contrast ? tx('Activé', 'On') : tx('Désactivé', 'Off'), toggleContrast],
    [tx('Réduire les animations', 'Reduce motion'), motion ? tx('Activé', 'On') : tx('Désactivé', 'Off'), toggleMotion],
    [tx('Taille du texte', 'Text size'), `${Math.round(textScale * 100)} %`, cycleText],
    [tx('Taille des sous-titres', 'Subtitle size'), `${Math.round(subtitleSize * 100)} %`, cycleSubtitles],
    [tx('Actualisation des sources', 'Source refresh'), syncLabel, cycleSyncInterval],
  ] as const;
  return <Screen navigation><ScrollView contentContainerStyle={styles.container}><PageHeader eyebrow={tx('PROFIL', 'PROFILE')} title={tx('Réglages', 'Settings')} subtitle={tx('Accessibilité, lecture et confidentialité.', 'Accessibility, playback and privacy.')} /><View style={styles.list}>{rows.map(([title, value, action], index) => <FocusableCard accessibilityLabel={`${title}, ${value}`} autoFocus={index === 0} key={title} onPress={action} style={styles.row}><View style={styles.rowText}><Text style={styles.title}>{title}</Text><Text style={styles.detail}>{tx('Appuyez pour modifier', 'Press to change')}</Text></View><Text style={styles.value}>{value}</Text></FocusableCard>)}<FocusableCard style={styles.row}><View style={styles.rowText}><Text style={styles.title}>{tx('Confidentialité', 'Privacy')}</Text><Text style={styles.detail}>{tx('Identifiants protégés localement, diagnostics anonymisés', 'Credentials protected locally, anonymized diagnostics')}</Text></View><Text style={styles.value}>{tx('Sécurisé', 'Secure')}</Text></FocusableCard></View></ScrollView></Screen>;
}
const styles = StyleSheet.create({ container: { gap: spacing.lg, padding: 20, paddingBottom: 96 }, list: { gap: spacing.sm }, row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between', minHeight: 76, padding: spacing.md }, rowText: { flex: 1, minWidth: 190 }, title: { color: colors.text, fontSize: 17, fontWeight: '800' }, detail: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs }, value: { color: colors.accentStrong, flexShrink: 1, fontSize: 14, fontWeight: '900', textAlign: 'right' } });
