/**
 * FoodLens Design System — Color Tokens
 * Source: Figma design reference
 */

export const Colors = {
  // Primary brand colors
  primaryGreen: '#2E7D32',
  primaryGreenDark: '#1B5E20',
  primaryGreenLight: '#4CAF50',

  // Secondary accent
  lightGreen: '#66BB6A',
  lightGreenBg: '#E8F5E9',

  // Risk level colors
  amber: '#FFB74D',
  amberDark: '#F57C00',
  amberBg: '#FFF3E0',

  red: '#EF5350',
  redDark: '#C62828',
  redBg: '#FFEBEE',

  // Backgrounds
  background: '#F5F7FA',
  surface: '#FFFFFF',
  cardBg: '#FFFFFF',

  // Text
  darkText: '#263238',
  secondaryText: '#607D8B',
  lightText: '#90A4AE',
  white: '#FFFFFF',

  // Borders & Dividers
  border: '#E0E0E0',
  divider: '#EEEEEE',

  // Bottom nav
  navInactive: '#90A4AE',
  navActive: '#2E7D32',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Risk badge specific
  riskLow: {
    bg: '#E8F5E9',
    text: '#2E7D32',
    accent: '#66BB6A',
  },
  riskModerate: {
    bg: '#FFF3E0',
    text: '#E65100',
    accent: '#FFB74D',
  },
  riskHigh: {
    bg: '#FFEBEE',
    text: '#C62828',
    accent: '#EF5350',
  },
} as const;

export type ColorKey = keyof typeof Colors;
