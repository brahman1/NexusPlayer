import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing } from '../theme/tokens';

type FocusableCardProps = PropsWithChildren<
  PressableProps & {
    autoFocus?: boolean;
    style?: StyleProp<ViewStyle>;
  }
>;

export function FocusableCard({
  autoFocus = false,
  children,
  onBlur,
  onFocus,
  style,
  ...props
}: FocusableCardProps) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      {...props}
      hasTVPreferredFocus={Platform.isTV && autoFocus}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      style={({ pressed }) => [
        styles.base,
        focused && styles.focused,
        pressed && styles.pressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  focused: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.focus,
    borderWidth: 3,
    transform: [{ scale: 1.03 }],
  },
  pressed: {
    opacity: 0.78,
  },
});
