// contexts/ThemeContext.tsx - Theme Provider for Dark Mode
// Arthur: "Dark mode was very requested - at least 20 messages asking for it"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@app_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  card: string;
  
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Borders
  border: string;
  borderLight: string;
  
  // Primary
  primary: string;
  primaryLight: string;
  
  // Status
  success: string;
  warning: string;
  error: string;
  
  // Specific
  inputBackground: string;
  tabBar: string;
  overlay: string;
}

export const lightColors: ThemeColors = {
  background: '#F9FAFB',
  backgroundSecondary: '#FFFFFF',
  card: '#FFFFFF',
  
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  primary: '#6366F1',
  primaryLight: '#EEF2FF',
  
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  inputBackground: '#F9FAFB',
  tabBar: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const darkColors: ThemeColors = {
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  card: '#1E293B',
  
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  
  border: '#334155',
  borderLight: '#1E293B',
  
  primary: '#818CF8',
  primaryLight: '#312E81',
  
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  
  inputBackground: '#1E293B',
  tabBar: '#1E293B',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  isDark: false,
  colors: lightColors,
  setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme as ThemeMode);
      }
    } catch (e) {
      console.error('Error loading theme:', e);
    } finally {
      setIsLoaded(true);
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_KEY, newTheme);
      setThemeState(newTheme);
    } catch (e) {
      console.error('Error saving theme:', e);
    }
  };

  // Determine if dark mode should be active
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper hook for creating themed styles
export function useThemedStyles<T>(
  styleFactory: (colors: ThemeColors, isDark: boolean) => T
): T {
  const { colors, isDark } = useTheme();
  return styleFactory(colors, isDark);
}
