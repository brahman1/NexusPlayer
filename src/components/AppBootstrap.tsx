import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { initializeDatabase } from '../storage/database';
import { colors, spacing } from '../theme/tokens';
import { PrimaryButton } from './PrimaryButton';

type BootstrapStatus = 'loading' | 'ready' | 'error';

export function AppBootstrap({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<BootstrapStatus>('loading');

  useEffect(() => {
    let active = true;

    initializeDatabase()
      .then(() => {
        if (active) setStatus('ready');
      })
      .catch((error: unknown) => {
        console.error('Database initialization failed', error);
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

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
          <Text style={styles.message}>Préparation de NexusPlayer…</Text>
        </>
      ) : (
        <>
          <Text style={styles.title}>Impossible d’ouvrir les données locales</Text>
          <Text style={styles.message}>
            Vos données n’ont pas été supprimées. Réessayez l’initialisation.
          </Text>
          <PrimaryButton autoFocus label="Réessayer" onPress={() => void retry()} />
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
