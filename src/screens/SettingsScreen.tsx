import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FocusableCard } from '../components/FocusableCard';
import { PageHeader } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { preferences } from '../storage/preferences';
import { colors, spacing } from '../theme/tokens';

export function SettingsScreen() {
  const [contrast, setContrast] = useState(preferences.getHighContrast());
  const [motion, setMotion] = useState(preferences.getReduceMotion());
  const [textScale, setTextScale] = useState(preferences.getTextScale());
  const [subtitleSize, setSubtitleSize] = useState(preferences.getSubtitleSize());
  const toggleContrast = () => { const value = !contrast; setContrast(value); preferences.setHighContrast(value); };
  const toggleMotion = () => { const value = !motion; setMotion(value); preferences.setReduceMotion(value); };
  const cycleText = () => { const value = textScale >= 1.25 ? 1 : textScale + 0.25; setTextScale(value); preferences.setTextScale(value); };
  const cycleSubtitles = () => { const value = subtitleSize >= 1.5 ? 1 : subtitleSize + 0.25; setSubtitleSize(value); preferences.setSubtitleSize(value); };
  const rows = [
    ['Contraste renforcé', contrast ? 'Activé' : 'Désactivé', toggleContrast],
    ['Réduire les animations', motion ? 'Activé' : 'Désactivé', toggleMotion],
    ['Taille du texte', `${Math.round(textScale * 100)} %`, cycleText],
    ['Taille des sous-titres', `${Math.round(subtitleSize * 100)} %`, cycleSubtitles],
  ] as const;
  return <Screen navigation><View style={styles.container}><PageHeader eyebrow="PROFIL" title="Réglages" subtitle="Accessibilité, lecture et confidentialité." /><View style={styles.list}>{rows.map(([title, value, action], index) => <FocusableCard accessibilityLabel={`${title}, ${value}`} autoFocus={index === 0} key={title} onPress={action} style={styles.row}><View><Text style={styles.title}>{title}</Text><Text style={styles.detail}>Appuyez sur OK pour modifier</Text></View><Text style={styles.value}>{value}</Text></FocusableCard>)}<FocusableCard style={styles.row}><View><Text style={styles.title}>Confidentialité</Text><Text style={styles.detail}>Identifiants protégés localement, diagnostics anonymisés</Text></View><Text style={styles.value}>Sécurisé</Text></FocusableCard></View></View></Screen>;
}
const styles = StyleSheet.create({ container: { flex: 1, gap: spacing.xl, padding: spacing.xl }, list: { gap: spacing.sm }, row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 82 }, title: { color: colors.text, fontSize: 18, fontWeight: '800' }, detail: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs }, value: { color: colors.accentStrong, fontSize: 15, fontWeight: '900' } });
