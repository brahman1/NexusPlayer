import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton, LoadingSkeleton, PageHeader, Panel, StatusBanner } from '../components/NexusUI';
import { Screen } from '../components/Screen';
import { useI18n } from '../i18n';
import { configuredSubscriptionClient } from '../services/subscriptionClient';
import { entitlementPlan, subscriptionPlans } from '../services/subscriptionPlans';
import { clearAccountSession, getOrCreateDeviceIdentity, loadAccountSession } from '../storage/accountVault';
import { colors, radii, spacing } from '../theme/tokens';
import type { RegisteredDevice, SubscriptionEntitlement, SubscriptionPlanId } from '../types/account';

const offerOrder: SubscriptionPlanId[] = ['free', 'premium', 'family', 'local-lifetime'];

export function AccountScreen() {
  const { tx } = useI18n();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [deviceSuffix, setDeviceSuffix] = useState('');
  const [entitlement, setEntitlement] = useState<SubscriptionEntitlement | null>(null);
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const plan = useMemo(() => entitlementPlan(entitlement), [entitlement]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [session, identity] = await Promise.all([loadAccountSession(), getOrCreateDeviceIdentity()]);
    const client = configuredSubscriptionClient();
    setSignedIn(Boolean(session));
    setConfigured(Boolean(client));
    setDeviceSuffix(identity.installationId.slice(-6).toUpperCase());
    if (!session || !client) {
      setEntitlement(null);
      setDevices([]);
      setLoading(false);
      return;
    }
    try {
      const registered = await client.registerCurrentDevice(tx('Cet appareil', 'This device'));
      const [nextEntitlement, nextDevices] = await Promise.all([client.entitlement(), client.devices()]);
      setEntitlement(nextEntitlement);
      setDevices(nextDevices.some((item) => item.id === registered.id) ? nextDevices : [registered, ...nextDevices]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tx('Compte indisponible.', 'Account unavailable.'));
    } finally {
      setLoading(false);
    }
  }, [tx]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const disconnect = () => Alert.alert(
    tx('Se déconnecter ?', 'Sign out?'),
    tx('Les données locales resteront sur cet appareil. La synchronisation sera interrompue.', 'Local data will remain on this device. Sync will stop.'),
    [
      { style: 'cancel', text: tx('Annuler', 'Cancel') },
      { style: 'destructive', text: tx('Se déconnecter', 'Sign out'), onPress: () => { void clearAccountSession().then(load); } },
    ],
  );

  const removeDevice = (device: RegisteredDevice) => Alert.alert(
    tx('Retirer cet appareil ?', 'Remove this device?'),
    device.label,
    [
      { style: 'cancel', text: tx('Annuler', 'Cancel') },
      { style: 'destructive', text: tx('Retirer', 'Remove'), onPress: async () => {
        const client = configuredSubscriptionClient();
        if (!client) return;
        try { await client.removeDevice(device.id); await load(); }
        catch (caught) { setError(caught instanceof Error ? caught.message : tx('Suppression impossible.', 'Unable to remove device.')); }
      } },
    ],
  );

  const planName = (id: SubscriptionPlanId) => id === 'free' ? tx('Gratuit', 'Free') : id === 'premium' ? 'Premium' : id === 'family' ? 'Family' : tx('Local à vie', 'Local lifetime');
  const planPrice = (id: SubscriptionPlanId) => id === 'free' ? '0 €' : id === 'premium' ? tx('19,99 €/an', '€19.99/year') : id === 'family' ? tx('34,99 €/an', '€34.99/year') : tx('29,99 € une fois', '€29.99 once');

  return <Screen navigation><ScrollView contentContainerStyle={styles.container}>
    <PageHeader eyebrow={tx('COMPTE NEXUS', 'NEXUS ACCOUNT')} title={tx('Compte et abonnement', 'Account & subscription')} subtitle={tx('Vos droits et vos appareils, sans adresse MAC.', 'Your access and devices, without a MAC address.')} />
    {loading ? <LoadingSkeleton rows={4} /> : <>
      {!configured && <StatusBanner kind="warning" title={tx('Service de compte non configuré', 'Account service not configured')} detail={tx('Le mode gratuit local reste actif. Les connexions et achats seront activés après configuration sécurisée du serveur.', 'Local free mode remains active. Sign-in and purchases will be enabled after secure server configuration.')} />}
      {error && <StatusBanner kind="error" title={tx('Synchronisation impossible', 'Unable to sync')} detail={error} />}
      <Panel style={styles.currentPlan}>
        <View style={styles.planIcon}><Ionicons color={colors.emeraldStrong} name="diamond-outline" size={28} /></View>
        <View style={styles.planCopy}><Text style={styles.kicker}>{tx('FORFAIT ACTUEL', 'CURRENT PLAN')}</Text><Text style={styles.currentPlanName}>{planName(plan.id)}</Text><Text style={styles.detail}>{tx(`${plan.maxDevices} appareil(s) · ${plan.maxConcurrentStreams} lecture(s) simultanée(s)`, `${plan.maxDevices} device(s) · ${plan.maxConcurrentStreams} concurrent playback session(s)`)}</Text></View>
        <Text style={styles.badge}>{plan.ads ? tx('AVEC PUB', 'WITH ADS') : tx('SANS PUB', 'AD-FREE')}</Text>
      </Panel>

      <View style={styles.section}><Text style={styles.sectionTitle}>{tx('Choisir une formule', 'Choose a plan')}</Text><View style={styles.offers}>{offerOrder.map((id) => {
        const offer = subscriptionPlans[id];
        const selected = plan.id === id;
        return <Panel key={id} style={[styles.offer, selected && styles.offerSelected]}><View style={styles.offerHeading}><Text style={styles.offerTitle}>{planName(id)}</Text>{selected && <Text style={styles.selected}>{tx('ACTUEL', 'CURRENT')}</Text>}</View><Text style={styles.price}>{planPrice(id)}</Text><Text style={styles.detail}>{tx(`${offer.maxDevices} appareil(s) · ${offer.maxConcurrentStreams} lecture(s)`, `${offer.maxDevices} device(s) · ${offer.maxConcurrentStreams} playback session(s)`)}</Text><Text style={styles.detail}>{offer.cloudSync ? tx('Synchronisation cloud incluse', 'Cloud sync included') : tx('Données conservées localement', 'Data stored locally')}</Text></Panel>;
      })}</View></View>

      <View style={styles.section}><View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{tx('Mes appareils', 'My devices')}</Text><Text style={styles.counter}>{signedIn ? `${devices.length}/${plan.maxDevices}` : `1/${plan.maxDevices}`}</Text></View>
        {!signedIn ? <Panel><Text style={styles.deviceName}>{Platform.isTV ? tx('Téléviseur actuel', 'Current TV') : tx('Appareil actuel', 'Current device')}</Text><Text style={styles.detail}>{tx(`Installation •••${deviceSuffix}`, `Installation •••${deviceSuffix}`)}</Text></Panel> : devices.map((device) => <Panel key={device.id} style={styles.device}><View style={styles.deviceCopy}><Text style={styles.deviceName}>{device.label}</Text><Text style={styles.detail}>{device.platform} · {new Date(device.lastSeenAt).toLocaleDateString()}</Text></View><ActionButton icon="trash-outline" label={tx('Retirer', 'Remove')} variant="danger" onPress={() => removeDevice(device)} /></Panel>)}
      </View>
      {signedIn && <ActionButton icon="log-out-outline" label={tx('Se déconnecter', 'Sign out')} variant="secondary" onPress={disconnect} />}
    </>}
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl, padding: spacing.xl, paddingBottom: 112 },
  currentPlan: { alignItems: 'center', borderColor: colors.emeraldDeep, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  planIcon: { alignItems: 'center', backgroundColor: colors.emeraldSurface, borderRadius: radii.md, height: 56, justifyContent: 'center', width: 56 },
  planCopy: { flex: 1, minWidth: 190 }, kicker: { color: colors.emeraldStrong, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  currentPlanName: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: spacing.xs }, badge: { color: colors.text, backgroundColor: colors.accentSurface, borderRadius: radii.pill, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  section: { gap: spacing.md }, sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '900' }, counter: { color: colors.emeraldStrong, fontSize: 16, fontWeight: '900' },
  offers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, offer: { flex: 1, minWidth: 220 }, offerSelected: { backgroundColor: colors.emeraldSurface, borderColor: colors.emerald }, offerHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }, offerTitle: { color: colors.text, fontSize: 19, fontWeight: '900' }, selected: { color: colors.emeraldStrong, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, price: { color: colors.accentStrong, fontSize: 17, fontWeight: '900', marginVertical: spacing.sm },
  detail: { color: colors.textMuted, fontSize: 14, lineHeight: 20 }, device: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, deviceCopy: { flex: 1, minWidth: 180 }, deviceName: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: spacing.xs },
});
