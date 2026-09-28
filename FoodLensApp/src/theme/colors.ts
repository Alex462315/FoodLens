/**
 * FoodLens Design System — Color Tokens (Light & Dark Mode)
 * Highly accessible, contrast-compliant palettes with emerald green branding.
 */

export const LightColors = {
  // Primary brand
  primaryGreen: '#2E7D32',
  primaryGreenDark: '#1B5E20',
  primaryGreenLight: '#4CAF50',

  // Secondary accent
  lightGreen: '#66BB6A',
  lightGreenBg: '#E8F5E9',

  // Risk colors
  amber: '#FFB74D',
  amberDark: '#F57C00',
  amberBg: '#FFF3E0',

  red: '#EF5350',
  redDark: '#C62828',
  redBg: '#FFEBEE',

  // Backgrounds & Surfaces
  background: '#F5F7FA',
  surface: '#FFFFFF',
  cardBg: '#FFFFFF',

  // Text
  darkText: '#1E293B',
  secondaryText: '#64748B',
  lightText: '#94A3B8',
  white: '#FFFFFF',

  // Borders & Dividers
  border: '#E2E8F0',
  divider: '#F1F5F9',

  // Bottom navigation
  navBg: '#FFFFFF',
  navInactive: '#94A3B8',
  navActive: '#2E7D32',

  // Inputs
  inputBg: '#F8FAFC',
  inputText: '#1E293B',
  inputBorder: '#CBD5E1',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Risk badges
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
};

export const DarkColors = {
  // Primary brand
  primaryGreen: '#10B981',
  primaryGreenDark: '#059669',
  primaryGreenLight: '#34D399',

  // Secondary accent
  lightGreen: '#34D399',
  lightGreenBg: '#064E3B',

  // Risk colors
  amber: '#FBBF24',
  amberDark: '#F59E0B',
  amberBg: '#451A03',

  red: '#F87171',
  redDark: '#EF4444',
  redBg: '#450A0A',

  // Backgrounds & Surfaces (deep slate for maximum visual comfort)
  background: '#0F172A',
  surface: '#1E293B',
  cardBg: '#1E293B',

  // Text (crisp white & muted slate)
  darkText: '#F8FAFC',
  secondaryText: '#94A3B8',
  lightText: '#64748B',
  white: '#FFFFFF',

  // Borders & Dividers
  border: '#334155',
  divider: '#1E293B',

  // Bottom navigation
  navBg: '#1E293B',
  navInactive: '#64748B',
  navActive: '#10B981',

  // Inputs
  inputBg: '#0B1120',
  inputText: '#F8FAFC',
  inputBorder: '#334155',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.75)',

  // Risk badges
  riskLow: {
    bg: '#064E3B',
    text: '#34D399',
    accent: '#10B981',
  },
  riskModerate: {
    bg: '#451A03',
    text: '#FDBA74',
    accent: '#F97316',
  },
  riskHigh: {
    bg: '#4C0519',
    text: '#FDA4AF',
    accent: '#F43F5E',
  },
};

export type ThemeColors = typeof LightColors;

// Default exported Colors object (mutated by ThemeContext so legacy non-hook calls adapt)
export let Colors: ThemeColors = { ...LightColors };

export const setGlobalThemeColors = (isDark: boolean): ThemeColors => {
  const selected = isDark ? DarkColors : LightColors;
  Object.assign(Colors, selected);
  return Colors;
};

export type ColorKey = keyof typeof LightColors;
