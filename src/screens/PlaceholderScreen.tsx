import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { colors, spacing } from '../theme/tokens';

type PlaceholderScreenProps = {
  title: string;
};

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <Screen navigation>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Cette section sera activée après l’import d’une source.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 17,
    marginTop: spacing.sm,
  },
});
