import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/tokens';
import { NexusSidebar } from './NexusNavigation';

type ScreenProps = PropsWithChildren<{ navigation?: boolean }>;

export function NexusScreen({ children, navigation = false }: ScreenProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.row}>
        {navigation && <NexusSidebar />}
        <View style={styles.content}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

export const Screen = NexusScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  row: { flex: 1, flexDirection: Platform.isTV ? 'row' : 'column' },
});
