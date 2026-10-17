import { TextStyle } from 'react-native';

export const typography = {
  // Numeric Stability: Locks numbers to identical column widths to prevent horizontal jitter
  tabularNums: {
    fontVariant: ['tabular-nums'],
  } as TextStyle,

  // Font Size Scales (sp)
  size: {
    display: 32,
    h1: 24,
    h2: 20,
    h3: 18,
    body: 15,
    bodySmall: 14,
    caption: 12,
    micro: 10,
  },

  // Line Height Scales
  lineHeight: {
    display: 40,
    h1: 30,
    h2: 26,
    h3: 24,
    body: 22,
    bodySmall: 20,
    caption: 16,
    micro: 14,
  },

  // Font Weight Mapping
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
};
