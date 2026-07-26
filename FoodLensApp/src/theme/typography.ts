/**
 * FoodLens Design System — Typography Tokens
 * Font: Poppins (Google Fonts)
 */

import {TextStyle} from 'react-native';

export const FontFamily = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semiBold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
} as const;

export const FontSize = {
  h1: 24,
  h2: 18,
  subtitle: 14,
  body: 14,
  caption: 12,
  small: 10,
  large: 28,
  xlarge: 36,
} as const;

export const LineHeight = {
  h1: 32,
  h2: 26,
  subtitle: 20,
  body: 22,
  caption: 18,
  small: 14,
  large: 36,
  xlarge: 44,
} as const;

// Pre-built typography styles matching the Figma spec
export const Typography: Record<string, TextStyle> = {
  h1: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h1,
    lineHeight: LineHeight.h1,
  },
  h2: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h2,
    lineHeight: LineHeight.h2,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.subtitle,
    lineHeight: LineHeight.subtitle,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    lineHeight: LineHeight.body,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    lineHeight: LineHeight.caption,
  },
  buttonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.subtitle,
    lineHeight: LineHeight.subtitle,
  },
  scoreLarge: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xlarge,
    lineHeight: LineHeight.xlarge,
  },
};
