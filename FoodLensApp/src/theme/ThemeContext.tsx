/**
 * FoodLens Design System — Theme Context & Provider
 * Manages Light, Dark, and System Theme switching with persistent storage.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {useColorScheme} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LightColors,
  DarkColors,
  ThemeColors,
  setGlobalThemeColors,
} from './colors';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = '@foodlens_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  isDark: false,
  colors: LightColors,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference on launch
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved);
        }
      } catch (err) {
        console.warn('[ThemeContext] Failed to load theme mode:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Compute whether dark theme is active
  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return systemScheme === 'dark';
  }, [themeMode, systemScheme]);

  // Sync global Colors object
  useEffect(() => {
    setGlobalThemeColors(isDark);
  }, [isDark]);

  const setThemeMode = useCallback(
    async (mode: ThemeMode) => {
      setThemeModeState(mode);
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch (err) {
        console.warn('[ThemeContext] Failed to save theme mode:', err);
      }
    },
    [],
  );

  const toggleTheme = useCallback(async () => {
    const nextMode = isDark ? 'light' : 'dark';
    await setThemeMode(nextMode);
  }, [isDark, setThemeMode]);

  const colors = useMemo(() => {
    return isDark ? DarkColors : LightColors;
  }, [isDark]);

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      colors,
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, isDark, colors, setThemeMode, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
