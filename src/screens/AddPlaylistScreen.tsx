import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useTVEventHandler,
  useWindowDimensions,
  View,
} from 'react-native';

import { FocusableCard } from '../components/FocusableCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { importM3uFromFile, importM3uFromUrl } from '../services/m3uImportService';
import { describeSourceError } from '../services/sourceError';
import { colors, radii, spacing } from '../theme/tokens';
import { m3uUrlInputSchema, xtreamInputSchema } from '../types/validation';
import { importXtream } from '../services/xtreamImportService';
import { useI18n } from '../i18n';

type Mode = 'chooser' | 'm3u-url' | 'xtream';

const sourceOptions = [
  { id: 'xtream', icon: 'server-outline' as const, title: ['Xtream Codes', 'Xtream Codes'], description: ['Adresse du serveur, identifiant et mot de passe.', 'Server address, username and password.'], disabled: false },
  { id: 'm3u-url', icon: 'link-outline' as const, title: ['Lien M3U', 'M3U link'], description: ['Importez une playlist distante via HTTPS ou HTTP autorisé.', 'Import a remote playlist over HTTPS or authorized HTTP.'], disabled: false },
  { id: 'm3u-file', icon: 'document-outline' as const, title: ['Fichier local', 'Local file'], description: ['Sélectionnez un fichier .m3u ou .m3u8 présent sur l’appareil.', 'Select an .m3u or .m3u8 file on the device.'], disabled: false },
  { id: 'stalker', icon: 'time-outline' as const, title: ['Portail Stalker', 'Stalker portal'], description: ['Prévu pour une version ultérieure après stabilisation du MVP.', 'Planned for a later release after the MVP is stable.'], disabled: true },
] as const;

export function AddPlaylistScreen() {
  const { tx } = useI18n();
  const validationMessage = (message?: string) => {
    if (!message) return tx('Vérifiez les informations saisies.', 'Check the information entered.');
    const messages: Record<string, string> = {
      'Adresse invalide': 'Invalid address',
      'Utilisez une adresse HTTP ou HTTPS': 'Use an HTTP or HTTPS address',
      'Le nom est obligatoire': 'Name is required',
      'Le nom est trop long': 'Name is too long',
      'L’identifiant est obligatoire': 'Username is required',
      'Le mot de passe est obligatoire': 'Password is required',
    };
    return tx(message, messages[message] ?? message);
  };
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 600;
  const cardWidth = width >= 1100 ? '47%' : width >= 680 ? '46%' : '100%';
  const [mode, setMode] = useState<Mode>('chooser');
  const [name, setName] = useState('Ma playlist');
  const [url, setUrl] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canCancel, setCanCancel] = useState(false);
  const downloadController = useRef<AbortController | null>(null);
  const submissionRef = useRef(false);
  const urlInputRef = useRef<TextInput>(null);

  async function runImport(
    initialStatus: string,
    action: () => Promise<{ channels: unknown[]; duplicateCount: number; ignoredCount: number }>,
  ) {
    if (submissionRef.current) return;
    submissionRef.current = true;
    setBusy(true);
    setError(null);
    setStatus(initialStatus);

    try {
      const report = await action();
      setStatus(tx(`${report.channels.length} chaînes importées, ${report.duplicateCount} doublons et ${report.ignoredCount} lignes ignorées.`, `${report.channels.length} channels imported, ${report.duplicateCount} duplicates and ${report.ignoredCount} lines ignored.`));
      setTimeout(() => router.replace('/(tabs)/library'), 700);
    } catch (caughtError) {
      setStatus(null);
      setError(describeSourceError(caughtError));
    } finally {
      setBusy(false);
      submissionRef.current = false;
    }
  }

  async function submitUrl() {
    const parsed = m3uUrlInputSchema.safeParse({ name, url });
    if (!parsed.success) {
      setError(validationMessage(parsed.error.issues[0]?.message));
      return;
    }

    const controller = new AbortController();
    downloadController.current = controller;
    setCanCancel(true);
    try {
      await runImport(tx('Téléchargement, analyse et enregistrement…', 'Downloading, analyzing and saving…'), () =>
        importM3uFromUrl(parsed.data.name, parsed.data.url, controller.signal),
      );
    } finally {
      downloadController.current = null;
      setCanCancel(false);
    }
  }

  async function pickLocalFile() {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) return;
    if (!/\.m3u8?$/i.test(asset.name)) {
      setError(tx('Sélectionnez un fichier portant l’extension .m3u ou .m3u8.', 'Select a file with the .m3u or .m3u8 extension.'));
      return;
    }

    const playlistName = asset.name.replace(/\.m3u8?$/i, '').trim() || tx('Playlist locale', 'Local playlist');
    await runImport(tx('Lecture, analyse et enregistrement…', 'Reading, analyzing and saving…'), () =>
      importM3uFromFile(playlistName, asset.uri, asset.size),
    );
  }

  async function submitXtream() {
    const parsed = xtreamInputSchema.safeParse({ name, serverUrl, username, password });
    if (!parsed.success) { setError(validationMessage(parsed.error.issues[0]?.message)); return; }
    if (submissionRef.current) return;
    submissionRef.current = true;
    setBusy(true); setError(null); setStatus(tx('Connexion et import du catalogue Xtream…', 'Connecting and importing the Xtream catalog…'));
    try {
      const report = await importXtream(parsed.data.name, parsed.data.serverUrl, { username: parsed.data.username, password: parsed.data.password });
      setStatus(tx(`${report.channels} chaînes, ${report.movies} films et ${report.series} séries importés.`, `${report.channels} channels, ${report.movies} movies and ${report.series} series imported.`));
      setTimeout(() => router.replace('/(tabs)/library'), 700);
    } catch (caught) { setStatus(null); setError(describeSourceError(caught)); }
    finally { setBusy(false); submissionRef.current = false; }
  }

  useTVEventHandler((event) => {
    if (!Platform.isTV || event.eventKeyAction === 1 || event.eventType !== 'select' || busy) return;
    if (mode === 'm3u-url' && url.trim()) void submitUrl();
    if (mode === 'xtream' && serverUrl.trim() && username.trim() && password) void submitXtream();
  });

  function chooseSource(id: (typeof sourceOptions)[number]['id']) {
    if (id === 'xtream') setMode('xtream');
    if (id === 'm3u-url') setMode('m3u-url');
    if (id === 'm3u-file') void pickLocalFile();
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.container, compact && styles.containerCompact]} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>{tx('NOUVELLE SOURCE', 'NEW SOURCE')}</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>{mode === 'chooser' ? tx('Comment souhaitez-vous importer vos contenus ?', 'How would you like to import your content?') : mode === 'xtream' ? tx('Connecter Xtream Codes', 'Connect Xtream Codes') : tx('Importer un lien M3U', 'Import an M3U link')}</Text>
        <Text style={styles.subtitle}>{tx('Utilisez uniquement des playlists et abonnements que vous êtes autorisé à consulter.', 'Only use playlists and subscriptions you are authorized to access.')}</Text>

        {mode === 'chooser' ? (
          <View style={styles.grid}>
            {sourceOptions.map((option, index) => (
              <FocusableCard
                accessibilityRole="button"
                autoFocus={index === 0}
                disabled={option.disabled || busy}
                key={option.id}
                onPress={() => chooseSource(option.id)}
                style={[styles.card, { width: cardWidth }, option.disabled && styles.disabled]}
              >
                <Ionicons color={option.disabled ? colors.textMuted : colors.accentStrong} name={option.icon} size={32} />
                <Text style={styles.cardTitle}>{tx(option.title[0], option.title[1])}</Text>
                <Text style={styles.cardDescription}>{tx(option.description[0], option.description[1])}</Text>
                {option.disabled && <Text style={styles.soon}>{tx('BIENTÔT', 'COMING SOON')}</Text>}
              </FocusableCard>
            ))}
          </View>
        ) : mode === 'm3u-url' ? (
          <View style={styles.form}>
            <Text style={styles.label}>{tx('Nom de la playlist', 'Playlist name')}</Text>
            <TextInput autoFocus editable={!busy} maxLength={80} onChangeText={setName} onSubmitEditing={() => urlInputRef.current?.focus()} placeholder={tx('Ma playlist', 'My playlist')} placeholderTextColor={colors.textMuted} returnKeyType="next" style={styles.input} value={name} />
            <Text style={styles.label}>{tx('Adresse M3U', 'M3U address')}</Text>
            <TextInput autoCapitalize="none" autoCorrect={false} editable={!busy} keyboardType="url" onChangeText={setUrl} onEndEditing={() => { if (url.trim()) void submitUrl(); }} onSubmitEditing={() => void submitUrl()} placeholder="https://exemple.com/playlist.m3u" placeholderTextColor={colors.textMuted} ref={urlInputRef} returnKeyType="go" style={styles.input} value={url} />
            <View style={[styles.actions, compact && styles.actionsCompact]}>
              <PrimaryButton disabled={busy} label={tx('Importer', 'Import')} onPress={() => void submitUrl()} style={compact && styles.buttonCompact} />
              <PrimaryButton disabled={busy} label={tx('Retour', 'Back')} onPress={() => setMode('chooser')} style={compact && styles.buttonCompact} />
            </View>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>{tx('Nom de la source', 'Source name')}</Text>
            <TextInput autoFocus editable={!busy} maxLength={80} onChangeText={setName} placeholder={tx('Mon abonnement', 'My subscription')} placeholderTextColor={colors.textMuted} style={styles.input} value={name} />
            <Text style={styles.label}>{tx('Adresse du serveur', 'Server address')}</Text>
            <TextInput autoCapitalize="none" autoCorrect={false} editable={!busy} keyboardType="url" onChangeText={setServerUrl} placeholder="https://serveur.example:8080" placeholderTextColor={colors.textMuted} style={styles.input} value={serverUrl} />
            <Text style={styles.label}>{tx('Identifiant', 'Username')}</Text>
            <TextInput autoCapitalize="none" autoCorrect={false} editable={!busy} onChangeText={setUsername} placeholder={tx('Identifiant', 'Username')} placeholderTextColor={colors.textMuted} style={styles.input} value={username} />
            <Text style={styles.label}>{tx('Mot de passe', 'Password')}</Text>
            <TextInput autoCapitalize="none" autoCorrect={false} editable={!busy} onChangeText={setPassword} onEndEditing={() => { if (password) void submitXtream(); }} onSubmitEditing={() => void submitXtream()} placeholder={tx('Mot de passe', 'Password')} placeholderTextColor={colors.textMuted} secureTextEntry style={styles.input} value={password} />
            <View style={[styles.actions, compact && styles.actionsCompact]}>
              <PrimaryButton disabled={busy} label={tx('Connecter', 'Connect')} onPress={() => void submitXtream()} style={compact && styles.buttonCompact} />
              <PrimaryButton disabled={busy} label={tx('Retour', 'Back')} onPress={() => setMode('chooser')} style={compact && styles.buttonCompact} />
            </View>
          </View>
        )}

        {(busy || status) && (
          <View style={styles.feedback}>
            {busy && <ActivityIndicator color={colors.accentStrong} />}
            <Text style={styles.status}>{status}</Text>
            {busy && canCancel && (
              <PrimaryButton label={tx('Annuler', 'Cancel')} onPress={() => downloadController.current?.abort()} />
            )}
          </View>
        )}
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl },
  containerCompact: { padding: 20, paddingBottom: 80 },
  eyebrow: { color: colors.accentStrong, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.text, fontSize: 36, fontWeight: '900', letterSpacing: -1, marginTop: spacing.sm, maxWidth: 780 },
  titleCompact: { fontSize: 28, lineHeight: 34 },
  subtitle: { color: colors.textMuted, fontSize: 17, lineHeight: 25, marginTop: spacing.md, maxWidth: 700 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl },
  card: { minHeight: 190 },
  disabled: { opacity: 0.45 },
  cardTitle: { color: colors.text, fontSize: 21, fontWeight: '800', marginTop: spacing.lg },
  cardDescription: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  soon: { color: colors.warning, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginTop: spacing.md },
  form: { gap: spacing.sm, marginTop: spacing.xl, maxWidth: 760 },
  label: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, fontSize: 17, minHeight: 56, paddingHorizontal: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg },
  actionsCompact: { flexDirection: 'column' },
  buttonCompact: { alignSelf: 'stretch', width: '100%' },
  feedback: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  status: { color: colors.success, flex: 1, fontSize: 16 },
  error: { color: colors.danger, fontSize: 16, lineHeight: 23, marginTop: spacing.lg, maxWidth: 760 },
});
