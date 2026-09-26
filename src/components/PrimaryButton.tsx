import { Text, StyleSheet, type PressableProps } from 'react-native';

import { colors, radii, spacing } from '../theme/tokens';
import { FocusableCard } from './FocusableCard';

type PrimaryButtonProps = PressableProps & {
  label: string;
  autoFocus?: boolean;
};

export function PrimaryButton({ label, autoFocus, ...props }: PrimaryButtonProps) {
  return (
    <FocusableCard {...props} autoFocus={autoFocus} style={styles.button}>
      <Text style={styles.label}>{label}</Text>
    </FocusableCard>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderColor: colors.accentStrong,
    borderRadius: radii.pill,
    minWidth: 180,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
});
