export interface ColorPalette {
  // Brand
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentGlow: string;

  // Status
  danger: string;
  dangerDark: string;
  warning: string;
  success: string;
  info: string;

  // Surfaces & Backgrounds
  background: string;
  backgroundCard: string;
  backgroundInput: string;
  surfaceHover: string;
  border: string;
  borderFocus: string;

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
  // Clean, premium, non-neon light mode palette
  primary: '#4F46E5', // Indigo 600
  primaryDark: '#3730A3',
  primaryLight: '#6366F1',
  accent: '#0284C7', // Refined Sky 600
  accentGlow: 'rgba(2, 132, 199, 0.15)',

  danger: '#DC2626', // Red 600
  dangerDark: '#991B1B',
  warning: '#D97706', // Amber 600
  success: '#059669', // Emerald 600
  info: '#2563EB',

  background: '#F8FAFC', // Slate 50 - crisp paper surface
  backgroundCard: '#FFFFFF', // Pure White elevated card
  backgroundInput: '#F1F5F9', // Slate 100 soft input
  surfaceHover: '#E2E8F0', // Slate 200
  border: '#E2E8F0', // Subtle hairline border
  borderFocus: '#4F46E5',

  textPrimary: '#0F172A', // Slate 900 - high contrast readability
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8', // Slate 400
  textInverse: '#FFFFFF',

  overlay: 'rgba(15, 23, 42, 0.45)',
  sosGlow: 'rgba(220, 38, 38, 0.15)',
  safeGlow: 'rgba(5, 150, 105, 0.15)',
  cardShadowColor: '#0F172A',
};

export const darkColors: ColorPalette = {
  // Balanced obsidian dark mode palette - comfortable on eyes, no harsh neon
  primary: '#6366F1', // Indigo 500
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  accent: '#38BDF8', // Sky 400
  accentGlow: 'rgba(56, 189, 248, 0.2)',

  danger: '#EF4444', // Red 500
  dangerDark: '#B91C1C',
  warning: '#F59E0B', // Amber 500
  success: '#10B981', // Emerald 500
  info: '#3B82F6',

  background: '#0F172A', // Slate 900
  backgroundCard: '#1E293B', // Slate 800
  backgroundInput: '#0B132B', // Deep input field
  surfaceHover: '#334155', // Slate 700
  border: '#334155', // Slate 700 border
  borderFocus: '#6366F1',

  textPrimary: '#F8FAFC', // Slate 50
  textSecondary: '#94A3B8', // Slate 400
  textMuted: '#64748B', // Slate 500
  textInverse: '#0F172A',

  overlay: 'rgba(11, 15, 25, 0.8)',
  sosGlow: 'rgba(239, 68, 68, 0.35)',
  safeGlow: 'rgba(16, 185, 129, 0.25)',
  cardShadowColor: '#000000',
};

// Default export matching dark mode for backward compatibility
export const colors = darkColors;
export type ThemeColors = ColorPalette;
