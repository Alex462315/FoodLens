/**
 * FoodLens — Main Application Entry Point
 *
 * Wraps the app with ThemeProvider and AuthProvider.
 * Provides reactive Light & Dark mode support across navigation and status bar.
 */

import React from 'react';
import {StatusBar} from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import {AuthProvider} from './src/context/AuthContext';
import {ThemeProvider, useTheme} from './src/theme/ThemeContext';
import {LightColors, DarkColors} from './src/theme/colors';
import AppNavigator from './src/navigation/AppNavigator';

const lightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: LightColors.background,
    card: LightColors.surface,
    text: LightColors.darkText,
    border: LightColors.border,
    primary: LightColors.primaryGreen,
  },
};

const darkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: DarkColors.background,
    card: DarkColors.surface,
    text: DarkColors.darkText,
    border: DarkColors.border,
    primary: DarkColors.primaryGreen,
  },
};

const MainApp: React.FC = () => {
  const {isDark, colors} = useTheme();

  return (
    <NavigationContainer theme={isDark ? darkNavTheme : lightNavTheme}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <AppNavigator />
    </NavigationContainer>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
