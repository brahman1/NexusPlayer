export const colors = {
  background: '#070A0F',
  surface: '#101621',
  surfaceRaised: '#182131',
  border: '#29364A',
  text: '#F7F9FC',
  textMuted: '#9AA8BA',
  accent: '#6C7CFF',
  accentStrong: '#8D99FF',
  success: '#3DDC97',
  warning: '#FFB454',
  danger: '#FF647C',
  focus: '#FFFFFF',
} as const;

export const gradients = {
  screen: ['#070A0F', '#0A1020', '#171137', '#070A0F'] as const,
  hero: ['rgba(108,124,255,0.32)', 'rgba(91,63,181,0.24)', 'rgba(16,22,33,0.96)'] as const,
  accent: ['#8D99FF', '#6C7CFF', '#745FE7'] as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  tv: { display: 48, pageTitle: 36, sectionTitle: 24, cardTitle: 19, body: 16, meta: 14 },
  mobile: { display: 32, pageTitle: 30, sectionTitle: 23, cardTitle: 17, body: 16, meta: 13 },
} as const;

export const layout = {
  phoneGutter: 20,
  tabletGutter: 28,
  tvSafeArea: 64,
  tvSidebarCollapsed: 88,
  tvSidebarExpanded: 260,
  touchTarget: 48,
  tvTargetHeight: 56,
} as const;

export const motion = { focus: 140, panel: 200, screen: 240 } as const;
