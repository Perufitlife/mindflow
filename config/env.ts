// config/env.ts
import Constants from 'expo-constants';

// La API key se lee desde app.json > extra o desde variables de entorno
const getEnvVar = (key: string): string => {
  const value = Constants.expoConfig?.extra?.[key] || process.env[key] || '';
  return value;
};

// ============================================
// ENVIRONMENT DETECTION
// ============================================

/**
 * Detect if running in production or development
 * - Expo Go = dev
 * - __DEV__ flag = dev
 * - TestFlight = dev (via eas.json profile flag)
 * - AppStore = prod
 */
export function getEnvironment(): 'prod' | 'dev' {
  // Expo Go = always dev
  if (Constants.appOwnership === 'expo') return 'dev';
  
  // Check for TestFlight flag set in eas.json extra
  const isTestFlight = Constants.expoConfig?.extra?.isTestFlight || false;
  if (isTestFlight) return 'dev';
  
  // Fallback: use React Native __DEV__ flag
  if (__DEV__) return 'dev';
  
  return 'prod';
}

// ============================================
// DEVICE COUNTRY/REGION
// ============================================

import * as Localization from 'expo-localization';

/**
 * Get the user's device country/region code
 * Returns ISO 3166-1 alpha-2 code (e.g., "CA", "US", "MX")
 * Falls back to "XX" if unable to detect
 * 
 * Note: PostHog also adds $geoip_country_code server-side based on IP
 * This gives us both device locale AND actual IP-based country
 */
export function getDeviceCountry(): string {
  try {
    // Try to get region from locales array (more reliable)
    const locales = Localization.getLocales();
    if (locales && locales.length > 0 && locales[0].regionCode) {
      return locales[0].regionCode;
    }
    
    // Fallback to region property
    if (Localization.region) {
      return Localization.region;
    }
    
    return 'XX'; // Unknown
  } catch (error) {
    console.warn('Failed to get device country:', error);
    return 'XX';
  }
}

/**
 * Get the user's device locale (e.g., "en-CA", "es-MX")
 */
export function getDeviceLocale(): string {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      return locales[0].languageTag || 'en';
    }
    return 'en';
  } catch (error) {
    console.warn('Failed to get device locale:', error);
    return 'en';
  }
}

export const ENV = {
  OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY'),
  SUPABASE_URL: getEnvVar('SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY'),
};

// Validar que las variables necesarias estén configuradas
export const validateEnv = (): { valid: boolean; missing: string[] } => {
  const missing: string[] = [];
  
  if (!ENV.SUPABASE_URL) {
    missing.push('SUPABASE_URL');
  }
  if (!ENV.SUPABASE_ANON_KEY) {
    missing.push('SUPABASE_ANON_KEY');
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
};
