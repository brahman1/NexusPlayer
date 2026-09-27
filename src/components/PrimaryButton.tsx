import { LinearGradient } from 'expo-linear-gradient';
import { Text, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, gradients, radii, spacing } from '../theme/tokens';
import { FocusableCard } from './FocusableCard';

type PrimaryButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, autoFocus, style, ...props }: PrimaryButtonProps) {
  return (
    <FocusableCard {...props} autoFocus={autoFocus} style={[styles.button, style]}>
      <LinearGradient colors={gradients.accent} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
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
    flexShrink: 1,
    maxWidth: '100%',
    minHeight: 52,
    minWidth: 120,
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  label: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
});
