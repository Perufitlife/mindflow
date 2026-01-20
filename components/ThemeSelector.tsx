// components/ThemeSelector.tsx - Theme Selection Component
// Add this to Settings screen

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeMode, useTheme } from '../contexts/ThemeContext';

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: string }[] = [
  { id: 'light', label: 'Light', icon: 'sunny' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'System', icon: 'phone-portrait' },
];

export default function ThemeSelector() {
  const { theme, setTheme, colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Ionicons name="color-palette-outline" size={22} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Appearance</Text>
      </View>

      <View style={styles.options}>
        {THEME_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.option,
              { 
                backgroundColor: theme === option.id ? colors.primaryLight : colors.backgroundSecondary,
                borderColor: theme === option.id ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setTheme(option.id)}
          >
            <Ionicons
              name={option.icon as any}
              size={24}
              color={theme === option.id ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.optionLabel,
                { color: theme === option.id ? colors.primary : colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
            {theme === option.id && (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  options: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});
