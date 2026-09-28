import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { colors, spacing } from '../theme/tokens';
import { useI18n } from '../i18n';

type PlaceholderScreenProps = {
  title: string;
};

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  const { tx } = useI18n();
  return (
    <Screen navigation>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{tx('Cette section sera activée après l’import d’une source.', 'This section will be enabled after importing a source.')}</Text>
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
