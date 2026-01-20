// config/env.ts
import Constants from 'expo-constants';

// La API key se lee desde app.json > extra o desde variables de entorno
const getEnvVar = (key: string): string => {
  const value = Constants.expoConfig?.extra?.[key] || process.env[key] || '';
  return value;
};

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
