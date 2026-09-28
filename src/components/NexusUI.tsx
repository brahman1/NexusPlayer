import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren, ReactNode } from 'react';
import { FlatList, Platform, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, gradients, layout, radii, spacing, typography } from '../theme/tokens';
import { FocusableCard } from './FocusableCard';

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  const { width } = useWindowDimensions();
  const compact = !Platform.isTV && width < 700;
  return <View style={[styles.header, compact && styles.headerCompact]}><View style={styles.headerText}>{eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}<Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}</View>{action && <View style={[styles.headerAction, compact && styles.headerActionCompact]}>{action}</View>}</View>;
}

export function ActionButton({ label, icon, variant = 'primary', ...props }: { label: string; icon?: keyof typeof Ionicons.glyphMap; variant?: 'primary' | 'secondary' | 'danger' } & React.ComponentProps<typeof FocusableCard>) {
  return <FocusableCard accessibilityLabel={label} accessibilityRole="button" {...props} style={[styles.button, variant === 'primary' && styles.primary, variant === 'danger' && styles.danger, props.style]}>{variant === 'primary' && <LinearGradient colors={gradients.accent} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />}{icon && <Ionicons color={colors.text} name={icon} size={20} />}<Text maxFontSizeMultiplier={1.35} numberOfLines={2} style={styles.buttonText}>{label}</Text></FocusableCard>;
}

export function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <FocusableCard accessibilityState={{ selected: active }} onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text numberOfLines={1} style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></FocusableCard>;
}

export function StatusBanner({ kind, title, detail }: { kind: 'success' | 'warning' | 'error'; title: string; detail?: string }) {
  const color = kind === 'success' ? colors.success : kind === 'warning' ? colors.warning : colors.danger;
  return <View accessibilityRole="alert" style={[styles.banner, { borderColor: color }]}><Ionicons color={color} name={kind === 'success' ? 'checkmark-circle' : kind === 'warning' ? 'warning' : 'alert-circle'} size={22} /><View style={styles.bannerText}><Text style={styles.bannerTitle}>{title}</Text>{detail && <Text style={styles.bannerDetail}>{detail}</Text>}</View></View>;
}

export function EmptyState({ icon = 'albums-outline', title, detail, action }: { icon?: keyof typeof Ionicons.glyphMap; title: string; detail: string; action?: ReactNode }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons color={colors.accentStrong} name={icon} size={34} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDetail}>{detail}</Text>{action}</View>;
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return <View accessibilityLabel="Chargement" style={styles.skeletonList}>{Array.from({ length: rows }, (_, index) => <View key={index} style={[styles.skeleton, { opacity: 1 - index * 0.12 }]} />)}</View>;
}

export function SectionTitle({ children, action }: PropsWithChildren<{ action?: ReactNode }>) {
  return <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{children}</Text>{action && <View style={styles.sectionAction}>{action}</View>}</View>;
}

export function ContentRail<T>({ data, keyExtractor, renderItem, title }: { data: T[]; keyExtractor: (item: T) => string; renderItem: ({ item, index }: { item: T; index: number }) => ReactNode; title: string }) {
  return <View style={styles.rail}><SectionTitle>{title}</SectionTitle><FlatList contentContainerStyle={styles.railContent} data={data} horizontal keyExtractor={keyExtractor} renderItem={(info) => <>{renderItem(info)}</>} showsHorizontalScrollIndicator={false} /></View>;
}

export function Panel({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) { return <View style={[styles.panel, style]}>{children}</View>; }

const textScale = Platform.isTV ? typography.tv : typography.mobile;
const styles = StyleSheet.create({
  header: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.lg, justifyContent: 'space-between' }, headerCompact: { alignItems: 'stretch', flexDirection: 'column', gap: spacing.md },
  headerAction: { flexShrink: 1 }, headerActionCompact: { width: '100%' },
  headerText: { flex: 1, minWidth: 0 }, eyebrow: { color: colors.emeraldStrong, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.text, fontSize: textScale.pageTitle, fontWeight: '900', letterSpacing: -1, marginTop: spacing.xs }, titleCompact: { fontSize: 27, lineHeight: 33 },
  subtitle: { color: colors.textMuted, fontSize: textScale.body, lineHeight: 24, marginTop: spacing.sm },
  button: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, gap: spacing.sm, maxWidth: '100%', minHeight: Platform.isTV ? layout.tvTargetHeight : layout.touchTarget, overflow: 'hidden', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  primary: { backgroundColor: colors.accent, borderColor: colors.accentStrong }, danger: { backgroundColor: '#351720', borderColor: colors.danger },
  buttonText: { color: colors.text, flexShrink: 1, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  chip: { minHeight: 44, minWidth: 92, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, chipActive: { backgroundColor: colors.accentSurface, borderColor: colors.emerald },
  chipText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' }, chipTextActive: { color: colors.text },
  banner: { alignItems: 'center', backgroundColor: colors.surfaceRaised, borderLeftWidth: 4, borderRadius: radii.md, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  bannerText: { flex: 1, minWidth: 0 }, bannerTitle: { color: colors.text, fontSize: 15, fontWeight: '800' }, bannerDetail: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 280, padding: spacing.xl }, emptyIcon: { alignItems: 'center', backgroundColor: colors.emeraldSurface, borderColor: colors.emeraldDeep, borderRadius: radii.lg, borderWidth: 1, height: 72, justifyContent: 'center', marginBottom: spacing.md, width: 72 },
  emptyTitle: { color: colors.text, fontSize: textScale.sectionTitle, fontWeight: '800', textAlign: 'center' }, emptyDetail: { color: colors.textMuted, fontSize: textScale.body, lineHeight: 24, marginBottom: spacing.lg, marginTop: spacing.sm, maxWidth: 560, textAlign: 'center' },
  skeletonList: { gap: spacing.sm }, skeleton: { backgroundColor: colors.surfaceRaised, borderRadius: radii.md, height: Platform.isTV ? 76 : 64 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' }, sectionTitle: { color: colors.text, flexShrink: 1, fontSize: textScale.sectionTitle, fontWeight: '800' }, sectionAction: { flexShrink: 1 },
  rail: { gap: spacing.md }, railContent: { gap: spacing.md, paddingRight: spacing.xl }, panel: { backgroundColor: 'rgba(16,22,33,0.94)', borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg },
});
