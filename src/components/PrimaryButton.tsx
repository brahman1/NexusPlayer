import { Text, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../theme/tokens';
import { FocusableCard } from './FocusableCard';

type PrimaryButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, autoFocus, style, ...props }: PrimaryButtonProps) {
  return (
    <FocusableCard {...props} autoFocus={autoFocus} style={[styles.button, style]}>
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
    minHeight: 52,
    minWidth: 140,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  label: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
