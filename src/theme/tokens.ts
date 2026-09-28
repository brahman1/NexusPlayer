export const colors = {
  background: '#070A0F',
  surface: '#101621',
  surfaceRaised: '#182131',
  border: '#29364A',
  text: '#F7F9FC',
  textMuted: '#9AA8BA',
  accent: '#6C7CFF',
  accentStrong: '#8D99FF',
  accentSurface: '#242B5A',
  emerald: '#3DDC97',
  emeraldStrong: '#63F3B5',
  emeraldDeep: '#198A68',
  emeraldSurface: '#123B32',
  success: '#3DDC97',
  warning: '#FFB454',
  danger: '#FF647C',
  focus: '#FFFFFF',
} as const;

export const gradients = {
  screen: ['#070A0F', '#0A1020', '#171137', '#0B211D', '#070A0F'] as const,
  aurora: ['rgba(61,220,151,0)', 'rgba(61,220,151,0.09)', 'rgba(108,124,255,0.04)', 'rgba(61,220,151,0)'] as const,
  hero: ['rgba(108,124,255,0.40)', 'rgba(116,95,231,0.28)', 'rgba(61,220,151,0.18)', 'rgba(16,22,33,0.96)'] as const,
  heroGlow: ['rgba(61,220,151,0)', 'rgba(61,220,151,0.22)', 'rgba(61,220,151,0)'] as const,
  catalogHero: ['#101621', 'rgba(23,17,55,0.92)', 'rgba(18,59,50,0.58)', 'rgba(16,22,33,0.16)'] as const,
  accent: ['#8D99FF', '#6C7CFF', '#198A68'] as const,
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
