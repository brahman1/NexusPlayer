import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, type NativeEventSubscription, StyleSheet, Text, View } from 'react-native';

import { runAutomaticSourceSync } from '../services/automaticSourceSync';
import { initializeAppLanguage, useI18n } from '../i18n';
import { initializeDatabase } from '../storage/database';
import { preferences } from '../storage/preferences';
import { colors, spacing } from '../theme/tokens';
import { PrimaryButton } from './PrimaryButton';

type BootstrapStatus = 'loading' | 'ready' | 'error';

export function AppBootstrap({ children }: PropsWithChildren) {
  initializeAppLanguage(preferences.getLanguage());
  const { tx } = useI18n();
  const [status, setStatus] = useState<BootstrapStatus>('loading');

  useEffect(() => {
    let active = true;

    initializeDatabase()
      .then(() => {
        if (!active) return;
        setStatus('ready');
      })
      .catch((error: unknown) => {
        console.error('Database initialization failed', error);
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    void runAutomaticSourceSync();
    const appStateSubscription: NativeEventSubscription = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState === 'active') void runAutomaticSourceSync();
      },
    );
    return () => appStateSubscription.remove();
  }, [status]);

  const retry = async () => {
    setStatus('loading');

    try {
      await initializeDatabase();
      setStatus('ready');
    } catch (error) {
      console.error('Database initialization failed', error);
      setStatus('error');
    }
  };

  if (status === 'ready') {
    return children;
  }

  return (
    <View style={styles.container}>
      {status === 'loading' ? (
        <>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.message}>{tx('Préparation de NexusPlayer…', 'Preparing NexusPlayer…')}</Text>
        </>
      ) : (
        <>
          <Text style={styles.title}>{tx('Impossible d’ouvrir les données locales', 'Unable to open local data')}</Text>
          <Text style={styles.message}>
            {tx('Vos données n’ont pas été supprimées. Réessayez l’initialisation.', 'Your data has not been deleted. Try initializing again.')}
          </Text>
          <PrimaryButton autoFocus label={tx('Réessayer', 'Try again')} onPress={() => void retry()} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
