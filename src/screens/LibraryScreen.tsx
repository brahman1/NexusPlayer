import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { FocusableCard } from '../components/FocusableCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { EmptyState, PageHeader, StatusBanner } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { SQLitePlaylistRepository } from '../repositories/SQLitePlaylistRepository';
import { refreshM3uPlaylist } from '../services/m3uImportService';
import { colors, radii, spacing } from '../theme/tokens';
import type { Playlist } from '../types/domain';
import { endpointForDisplay } from '../utils/endpoint';
import { refreshXtreamPlaylist, removeXtreamCredentials } from '../services/xtreamImportService';
import { sumXtreamSyncReport } from '../services/xtreamSync';
import { useI18n } from '../i18n';

const repository = new SQLitePlaylistRepository();

function ActionButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <FocusableCard accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, disabled && styles.disabled]}>
      <Text style={styles.actionLabel}>{label}</Text>
    </FocusableCard>
  );
}

export function LibraryScreen() {
  const { language, tx } = useI18n();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 600;
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<Playlist | null>(null);
  const [managing, setManaging] = useState<Playlist | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      setPlaylists(await repository.list());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : tx('Impossible de charger la bibliothèque.', 'Unable to load the library.'));
    } finally {
      setLoading(false);
    }
  }, [tx]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function requestDelete(playlist: Playlist) {
    Alert.alert(
      tx('Supprimer la playlist ?', 'Delete playlist?'),
      tx(`« ${playlist.name} » et ses ${playlist.channelCount} chaînes seront supprimées de cet appareil.`, `"${playlist.name}" and its ${playlist.channelCount} channels will be deleted from this device.`),
      [
        { text: tx('Annuler', 'Cancel'), style: 'cancel' },
        {
          text: tx('Supprimer', 'Delete'),
          style: 'destructive',
          onPress: () => {
            setBusyId(playlist.id);
            (playlist.sourceKind === 'xtream' ? removeXtreamCredentials(playlist.id) : Promise.resolve())
              .then(() => repository.remove(playlist.id))
              .then(() => {
                setNotice(tx(`« ${playlist.name} » a été supprimée.`, `"${playlist.name}" was deleted.`));
                return load();
              })
              .catch((caught) => setError(caught instanceof Error ? caught.message : tx('Suppression impossible.', 'Unable to delete.')))
              .finally(() => setBusyId(null));
          },
        },
      ],
    );
  }

  async function refresh(playlist: Playlist) {
    setBusyId(playlist.id);
    setError(null);
    setNotice(tx(`Actualisation de « ${playlist.name} »…`, `Refreshing "${playlist.name}"…`));
    try {
      if (playlist.sourceKind === 'xtream') {
        const report = sumXtreamSyncReport(await refreshXtreamPlaylist(playlist));
        setNotice(tx(`Xtream synchronisé : +${report.added}, ${report.modified} modifiés, ${report.removed} supprimés, ${report.unchanged} inchangés.`, `Xtream synced: +${report.added}, ${report.modified} modified, ${report.removed} removed, ${report.unchanged} unchanged.`));
        await load();
        return;
      }
      const report = await refreshM3uPlaylist(playlist);
      setNotice(report.notModified
        ? tx(`« ${playlist.name} » est déjà à jour (${report.total} chaînes).`, `"${playlist.name}" is already up to date (${report.total} channels).`)
        : tx(`${report.total} chaînes : +${report.added}, ${report.modified} modifiées, ${report.removed} supprimées, ${report.unchanged} inchangées.`, `${report.total} channels: +${report.added}, ${report.modified} modified, ${report.removed} removed, ${report.unchanged} unchanged.`));
      await load();
    } catch (caught) {
      setNotice(tx('La dernière version valide a été conservée.', 'The latest valid version was kept.'));
      setError(caught instanceof Error ? caught.message : tx('Actualisation impossible.', 'Unable to refresh.'));
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function openRename(playlist: Playlist) {
    setManaging(null);
    setRenameValue(playlist.name);
    setRenaming(playlist);
  }

  async function submitRename() {
    if (!renaming) return;
    const nextName = renameValue.trim();
    if (!nextName) {
      setError(tx('Le nom de la playlist est obligatoire.', 'The playlist name is required.'));
      return;
    }
    setBusyId(renaming.id);
    try {
      await repository.rename(renaming.id, nextName);
      setRenaming(null);
      setNotice(tx('Playlist renommée.', 'Playlist renamed.'));
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tx('Impossible de renommer la playlist.', 'Unable to rename the playlist.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen navigation>
      <View style={[styles.container, compact && styles.containerCompact]}>
        <PageHeader eyebrow="SOURCES" title={tx('Vos sources', 'Your sources')} subtitle={tx(`${playlists.length} source${playlists.length > 1 ? 's' : ''} configurée${playlists.length > 1 ? 's' : ''}`, `${playlists.length} configured source${playlists.length > 1 ? 's' : ''}`)} action={<PrimaryButton label={tx('Ajouter', 'Add')} onPress={() => router.push('/add-playlist')} />} />

        {notice && <StatusBanner kind="success" title={notice} />}
        {error && <StatusBanner kind="error" title={error} />}

        {loading ? <ActivityIndicator color={colors.accentStrong} size="large" /> : playlists.length === 0 ? (
          <EmptyState icon="server-outline" title={tx('Aucune source importée', 'No source imported')} detail={tx('Ajoutez un lien M3U, un fichier local ou un abonnement Xtream pour commencer.', 'Add an M3U link, local file or Xtream subscription to get started.')} action={<PrimaryButton label={tx('Ajouter une source', 'Add a source')} onPress={() => router.push('/add-playlist')} />} />
        ) : (
          <FlatList
            contentContainerStyle={styles.list}
            data={playlists}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const busy = busyId === item.id;
              return (
                <View style={styles.playlistGroup}>
                  <FocusableCard
                    autoFocus={index === 0}
                    disabled={busy}
                    onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: item.id } })}
                    style={styles.playlistCard}
                  >
                    <Text style={styles.playlistName}>{item.name}</Text>
                    <Text style={styles.meta}>
                      {tx(`${item.channelCount} chaînes`, `${item.channelCount} channels`)} · {item.sourceKind === 'm3u-file' ? tx('Fichier local', 'Local file') : item.sourceKind === 'xtream' ? 'Xtream Codes' : tx('Lien M3U', 'M3U link')}
                    </Text>
                    <Text numberOfLines={1} style={styles.endpoint}>{endpointForDisplay(item.endpoint)}</Text>
                    {item.lastError && <Text style={styles.cardError}>{item.lastError}</Text>}
                  </FocusableCard>
                  <View style={styles.actions}><ActionButton disabled={busy} label={busy ? tx('Traitement…', 'Processing…') : tx('Gérer', 'Manage')} onPress={() => setManaging(item)} /></View>
                </View>
              );
            }}
          />
        )}
      </View>

      <Modal animationType="fade" onRequestClose={() => setManaging(null)} transparent visible={Boolean(managing)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{managing?.name}</Text>
          <Text style={styles.endpoint}>{endpointForDisplay(managing?.endpoint ?? null)}</Text>
          <View style={styles.actions}>
            <PrimaryButton label={tx('Renommer', 'Rename')} onPress={() => managing && openRename(managing)} />
            <PrimaryButton disabled={managing?.sourceKind !== 'm3u-url' && managing?.sourceKind !== 'xtream'} label={tx('Actualiser', 'Refresh')} onPress={() => { const item = managing; setManaging(null); if (item) void refresh(item); }} />
            <PrimaryButton label={tx('Diagnostiquer', 'Diagnose')} onPress={() => { if (managing) setNotice(tx(`${managing.sourceKind.toUpperCase()} · ${managing.channelCount} chaînes · dernière synchronisation ${managing.lastSyncedAt ? new Date(managing.lastSyncedAt).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US') : 'inconnue'}. Adresse et identifiants masqués.`, `${managing.sourceKind.toUpperCase()} · ${managing.channelCount} channels · last sync ${managing.lastSyncedAt ? new Date(managing.lastSyncedAt).toLocaleString('en-US') : 'unknown'}. Address and credentials hidden.`)); setManaging(null); }} />
            <PrimaryButton label={tx('Supprimer', 'Delete')} onPress={() => { const item = managing; setManaging(null); if (item) requestDelete(item); }} />
            <PrimaryButton label={tx('Fermer', 'Close')} onPress={() => setManaging(null)} />
          </View>
        </View></View>
      </Modal>

      <Modal animationType="fade" onRequestClose={() => setRenaming(null)} transparent visible={Boolean(renaming)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{tx('Renommer la playlist', 'Rename playlist')}</Text>
            <TextInput
              autoFocus
              maxLength={80}
              onChangeText={setRenameValue}
              onSubmitEditing={() => void submitRename()}
              selectTextOnFocus
              style={styles.input}
              value={renameValue}
            />
            <View style={styles.actions}>
              <PrimaryButton label={tx('Enregistrer', 'Save')} onPress={() => void submitRename()} />
              <PrimaryButton label={tx('Annuler', 'Cancel')} onPress={() => setRenaming(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl },
  containerCompact: { padding: 20 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 36, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 16, marginTop: spacing.xs },
  notice: { color: colors.success, fontSize: 15, marginTop: spacing.md },
  list: { gap: spacing.lg, paddingVertical: spacing.xl },
  playlistGroup: { gap: spacing.sm },
  playlistCard: { minHeight: 130 },
  playlistName: { color: colors.text, fontSize: 22, fontWeight: '800' },
  meta: { color: colors.accentStrong, fontSize: 15, marginTop: spacing.sm },
  endpoint: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
  cardError: { color: colors.warning, fontSize: 13, marginTop: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  actionLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  empty: { flex: 1, justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 25, fontWeight: '800' },
  emptyText: { color: colors.textMuted, fontSize: 17, marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: 15, marginTop: spacing.md },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', flex: 1, justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.md, maxWidth: 680, padding: spacing.xl, width: '100%' },
  modalTitle: { color: colors.text, fontSize: 25, fontWeight: '800' },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, fontSize: 17, minHeight: 56, paddingHorizontal: spacing.md },
});
