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

// Using JavaScript Intl API instead of expo-localization
// This avoids iOS 18 SDK compatibility issues with expo-localization

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
    // Use Intl API to get locale info
    const locale = getDeviceLocale();
    
    // Extract region from locale (e.g., "en-CA" -> "CA", "es-MX" -> "MX")
    if (locale.includes('-')) {
      const parts = locale.split('-');
      const region = parts[parts.length - 1];
      // Region codes are typically 2 uppercase letters
      if (region && region.length === 2) {
        return region.toUpperCase();
      }
    }
    
    // Try to get from Intl.Locale if available
    if (typeof Intl !== 'undefined' && Intl.Locale) {
      try {
        const intlLocale = new Intl.Locale(locale);
        if (intlLocale.region) {
          return intlLocale.region.toUpperCase();
        }
      } catch {
        // Intl.Locale not supported or invalid locale
      }
    }
    
    return 'XX'; // Unknown
  } catch (error) {
    console.warn('Failed to get device country:', error);
    return 'XX';
  }
}

/**
 * Get the user's device locale (e.g., "en-CA", "es-MX")
 * Uses React Native's Intl API
 */
export function getDeviceLocale(): string {
  try {
    // Get locales from Intl API (works in React Native)
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const resolvedOptions = Intl.DateTimeFormat().resolvedOptions();
      if (resolvedOptions.locale) {
        return resolvedOptions.locale;
      }
    }
    
    // Fallback: try navigator.language (for web)
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language;
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
