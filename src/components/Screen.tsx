import type { PropsWithChildren } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, gradients } from '../theme/tokens';
import { NexusSidebar } from './NexusNavigation';

type ScreenProps = PropsWithChildren<{ fullscreen?: boolean; navigation?: boolean }>;

export function NexusScreen({ children, fullscreen = false, navigation = false }: ScreenProps) {
  return (
    <SafeAreaView edges={fullscreen ? [] : ['top', 'left', 'right']} style={styles.safeArea}>
      <LinearGradient
        colors={fullscreen ? ['#000000', '#000000'] : gradients.screen}
        end={{ x: 1, y: 1 }}
        locations={fullscreen ? [0, 1] : [0, 0.38, 0.72, 1]}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
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
    minWidth: 0,
  },
  row: { flex: 1, flexDirection: Platform.isTV ? 'row' : 'column' },
});
