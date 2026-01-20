// config/revenuecat.ts
// RevenueCat Configuration for Unbind
// 2 Plans: Monthly ($19.99) and Yearly ($99.99)

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Check if running in Expo Go (no native modules)
const isExpoGo = Constants.appOwnership === 'expo';

// API Keys (Public - safe to include in client)
// IMPORTANT: Use PUBLIC keys (appl_ for iOS, goog_ for Android)
// Find them in RevenueCat Dashboard → API Keys → Public API key

// TODO: Replace with your actual PUBLIC API keys from RevenueCat Dashboard
const REVENUECAT_API_KEY_IOS = 'appl_YOUR_IOS_PUBLIC_KEY_HERE';
const REVENUECAT_API_KEY_ANDROID = 'goog_YOUR_ANDROID_PUBLIC_KEY_HERE';

// Select API key based on platform
// Note: RevenueCat purchases don't work in Expo Go - need development build
export const REVENUECAT_API_KEY = Platform.select({
  ios: REVENUECAT_API_KEY_IOS,
  android: REVENUECAT_API_KEY_ANDROID,
  default: REVENUECAT_API_KEY_IOS,
});

// Entitlement identifier
export const ENTITLEMENT_ID = 'premium';

// Product identifiers - MUST match App Store Connect
export const PRODUCTS = {
  MONTHLY: 'unbind_monthly_1999',
  YEARLY: 'unbind_yearly_9999',
} as const;

// Offering identifier
export const OFFERING_ID = 'default';

// Pricing for display (before RevenueCat loads)
// Presented attractively: show per-month price
export const FALLBACK_PRICES = {
  monthly: {
    price: '$19.99',
    pricePerMonth: '$19.99',
    period: 'month',
    periodDisplay: '/month',
  },
  yearly: {
    price: '$99.99',
    pricePerMonth: '$8.33',  // $99.99 / 12 = $8.33
    period: 'year',
    periodDisplay: '/year',
    savings: '58%',  // vs monthly ($239.88 - $99.99) / $239.88
    billedAs: 'Billed annually',
  },
};

// Trial configuration
export const TRIAL_CONFIG = {
  durationDays: 3,
  sessionsPerDay: 10,
};
