export interface ColorPalette {
  // Brand & Accents
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentGlow: string;
  brandEmerald: string;
  brandCyan: string;
  brandViolet: string;
  brandVioletSubtle: string;

  // Status
  danger: string;
  dangerDark: string;
  dangerCrimson: string;
  warning: string;
  success: string;
  info: string;

  // Surfaces & Backgrounds
  background: string;
  backgroundOled: string;
  canvas: string;
  surfaceElevated: string;
  backgroundCard: string;
  backgroundInput: string;
  surfaceHover: string;
  border: string;
  borderFocus: string;

  // Liquid Glass Tokens
  glassBackground: string;
  glassBackgroundDeep: string;
  glassBorder: string;
  glassBorderHighlight: string;
  glassActivePill: string;
  glassCardShadow: string;
  badgeBackground: string;
  badgeText: string;
  tabInactive: string;
  tabActive: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Overlays & Accents
  overlay: string;
  sosGlow: string;
  safeGlow: string;
  cardShadowColor: string;
}

export const lightColors: ColorPalette = {
  // Liquid Glass Light Theme
  primary: '#5C5AC8',
  primaryDark: '#4B49A8',
  primaryLight: '#7B78E8',
  accent: '#4B49A8',
  accentGlow: 'rgba(92, 90, 200, 0.16)',
  brandEmerald: '#059669',
  brandCyan: '#0284C7',
  brandViolet: '#5C5AC8',
  brandVioletSubtle: '#ECE9FA',

  danger: '#DC2626',
  dangerDark: '#991B1B',
  dangerCrimson: '#C0344A',
  warning: '#D97706',
  success: '#059669',
  info: '#2563EB',

  background: '#F8F9FE',
  backgroundOled: '#FFFFFF',
  canvas: '#F8F9FE',
  surfaceElevated: '#FFFFFF',
  backgroundCard: 'rgba(255, 255, 255, 0.72)',
  backgroundInput: '#ECE9FA',
  surfaceHover: '#E8E5F7',
  border: 'rgba(110, 100, 225, 0.16)',
  borderFocus: '#5C5AC8',

  glassBackground: 'rgba(255, 255, 255, 0.64)',
  glassBackgroundDeep: 'rgba(248, 249, 254, 0.88)',
  glassBorder: 'rgba(110, 100, 225, 0.16)',
  glassBorderHighlight: 'rgba(255, 255, 255, 0.95)',
  glassActivePill: 'rgba(75, 73, 168, 0.12)',
  glassCardShadow: 'rgba(40, 36, 110, 0.12)',
  badgeBackground: '#C0344A',
  badgeText: '#FFFFFF',
  tabInactive: '#66647A',
  tabActive: '#4B49A8',

  textPrimary: '#1E1B4B',
  textSecondary: '#66647A',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  overlay: 'rgba(15, 23, 42, 0.45)',
  sosGlow: 'rgba(192, 52, 74, 0.18)',
  safeGlow: 'rgba(5, 150, 105, 0.15)',
  cardShadowColor: 'rgba(40, 36, 110, 0.12)',
};

export const darkColors: ColorPalette = {
  // Liquid Glass Dark Theme
  primary: '#5C5AC8',
  primaryDark: '#4B49A8',
  primaryLight: '#B4B2FF',
  accent: '#B4B2FF',
  accentGlow: 'rgba(139, 137, 255, 0.22)',
  brandEmerald: '#10B981',
  brandCyan: '#06D6A0',
  brandViolet: '#5C5AC8',
  brandVioletSubtle: 'rgba(139, 137, 255, 0.18)',

  danger: '#EF4444',
  dangerDark: '#B91C1C',
  dangerCrimson: '#C0344A',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',

  background: '#0A0D20',
  backgroundOled: '#070913',
  canvas: '#0A0D20',
  surfaceElevated: 'rgba(20, 24, 44, 0.85)',
  backgroundCard: 'rgba(20, 24, 44, 0.65)',
  backgroundInput: 'rgba(20, 24, 44, 0.72)',
  surfaceHover: 'rgba(139, 137, 255, 0.12)',
  border: 'rgba(255, 255, 255, 0.12)',
  borderFocus: '#B4B2FF',

  glassBackground: 'rgba(20, 24, 44, 0.64)',
  glassBackgroundDeep: 'rgba(10, 13, 32, 0.88)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  glassBorderHighlight: 'rgba(255, 255, 255, 0.28)',
  glassActivePill: 'rgba(139, 137, 255, 0.24)',
  glassCardShadow: 'rgba(0, 0, 0, 0.45)',
  badgeBackground: '#C0344A',
  badgeText: '#FFFFFF',
  tabInactive: '#8387AB',
  tabActive: '#FFFFFF',

  textPrimary: '#F8FAFC',
  textSecondary: '#A3A7C8',
  textMuted: '#8387AB',
  textInverse: '#0A0D20',

  overlay: 'rgba(7, 9, 19, 0.82)',
  sosGlow: 'rgba(192, 52, 74, 0.35)',
  safeGlow: 'rgba(16, 185, 129, 0.25)',
  cardShadowColor: '#000000',
};

// Default export matching dark mode for backward compatibility
export const colors = darkColors;
export type ThemeColors = ColorPalette;
