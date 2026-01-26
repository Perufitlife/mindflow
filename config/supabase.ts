// config/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || '';

// Check if we're in a server/static rendering context
const isSSR = Platform.OS === 'web' && typeof window === 'undefined';

if (!supabaseUrl || !supabaseAnonKey) {
  if (!isSSR) {
    console.warn('Supabase URL or Anon Key not configured');
  }
}

// Custom storage that handles web SSR (where window is not defined)
const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return null;
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};

// Use placeholder URL for SSR to avoid crash during static rendering
const effectiveUrl = supabaseUrl || (isSSR ? 'https://placeholder.supabase.co' : '');
const effectiveKey = supabaseAnonKey || (isSSR ? 'placeholder-key' : '');

export const supabase = effectiveUrl && effectiveKey 
  ? createClient(effectiveUrl, effectiveKey, {
      auth: {
        storage: customStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null as any; // Null client when not configured (will be handled by calling code)

// Export config for Edge Function calls
export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;
