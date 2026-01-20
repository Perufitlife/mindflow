// services/subscriptions.ts
// RevenueCat Subscription Service for Unbind

import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { REVENUECAT_API_KEY, ENTITLEMENT_ID, OFFERING_ID } from '../config/revenuecat';
import posthog from '../posthog';

let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Call this once when app starts
 * Note: Won't work in Expo Go - needs development build for real purchases
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  if (isInitialized) {
    console.log('RevenueCat already initialized');
    return;
  }

  try {
    if (!REVENUECAT_API_KEY) {
      console.warn('RevenueCat API key not configured');
      return;
    }

    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: userId || undefined,
    });

    // Enable debug logs in development
    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }

    isInitialized = true;
    console.log('RevenueCat initialized successfully');
  } catch (error: any) {
    // Don't crash the app if RevenueCat fails (e.g., in Expo Go)
    console.warn('RevenueCat init failed (expected in Expo Go):', error.message);
    // App will work without purchases in Expo Go
  }
}

/**
 * Set user ID for RevenueCat (call after authentication)
 */
export async function setRevenueCatUserId(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    console.log('RevenueCat user ID set:', userId);
  } catch (error) {
    console.error('Failed to set RevenueCat user ID:', error);
  }
}

/**
 * Check if user has premium access
 */
export async function checkPremiumStatus(): Promise<boolean> {
  if (!isInitialized) {
    console.warn('RevenueCat not initialized, returning false for premium');
    return false;
  }
  
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
    
    console.log('Premium status:', isPremium);
    return isPremium;
  } catch (error: any) {
    console.warn('Failed to check premium status:', error.message);
    return false;
  }
}

/**
 * Get customer info
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isInitialized) {
    return null;
  }
  
  try {
    return await Purchases.getCustomerInfo();
  } catch (error: any) {
    console.warn('Failed to get customer info:', error.message);
    return null;
  }
}

/**
 * Get available offerings (products)
 * Returns null if RevenueCat is not initialized (e.g., in Expo Go)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  // Don't try if not initialized (prevents crash in Expo Go)
  if (!isInitialized) {
    console.warn('RevenueCat not initialized, skipping getOfferings');
    return null;
  }
  
  try {
    const offerings = await Purchases.getOfferings();
    
    if (offerings?.current) {
      console.log('Current offering:', offerings.current.identifier);
      return offerings.current;
    }
    
    // Try to get specific offering
    if (offerings?.all?.[OFFERING_ID]) {
      return offerings.all[OFFERING_ID];
    }
    
    console.warn('No offerings available');
    return null;
  } catch (error: any) {
    console.warn('Failed to get offerings (expected in Expo Go):', error.message);
    return null;
  }
}

/**
 * Purchase a package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  if (!isInitialized) {
    return { success: false, error: 'Purchases not available in Expo Go' };
  }
  
  try {
    console.log('Purchasing package:', pkg.identifier);
    
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    
    const isPremium = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
    
    if (isPremium) {
      // Track successful purchase
      posthog.capture('subscription_purchased', {
        package: pkg.identifier,
        product: pkg.product.identifier,
        price: pkg.product.price,
      });
      
      console.log('Purchase successful!');
      return { success: true, customerInfo };
    }
    
    return { success: false, error: 'Purchase did not grant premium access' };
  } catch (error: any) {
    // User cancelled
    if (error.userCancelled) {
      console.log('User cancelled purchase');
      posthog.capture('subscription_cancelled');
      return { success: false, error: 'cancelled' };
    }
    
    console.error('Purchase failed:', error);
    posthog.capture('subscription_error', { error: error.message });
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/**
 * Restore purchases
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  isPremium: boolean;
  error?: string;
}> {
  if (!isInitialized) {
    return { success: false, isPremium: false, error: 'Purchases not available in Expo Go' };
  }
  
  try {
    console.log('Restoring purchases...');
    
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
    
    posthog.capture('purchases_restored', { isPremium });
    
    console.log('Restore complete, premium:', isPremium);
    return { success: true, isPremium };
  } catch (error: any) {
    console.error('Restore failed:', error);
    return { success: false, isPremium: false, error: error.message };
  }
}

/**
 * Get formatted price for a package
 */
export function getPackagePrice(pkg: PurchasesPackage): {
  price: string;
  pricePerMonth: string;
  period: string;
  hasFreeTrial: boolean;
  freeTrialDays: number;
} {
  const product = pkg.product;
  const price = product.priceString;
  
  // Check for intro price (free trial)
  const introPrice = product.introPrice;
  const hasFreeTrial = introPrice?.price === 0;
  const freeTrialDays = hasFreeTrial ? (introPrice?.periodNumberOfUnits || 0) : 0;
  
  // Calculate price per month for annual
  let pricePerMonth = price;
  let period = '/mo';
  
  if (pkg.packageType === 'ANNUAL') {
    const monthlyPrice = product.price / 12;
    pricePerMonth = `$${monthlyPrice.toFixed(2)}`;
    period = '/yr';
  }
  
  return {
    price,
    pricePerMonth,
    period,
    hasFreeTrial,
    freeTrialDays,
  };
}

/**
 * Sync user ID with RevenueCat after authentication
 */
export async function syncUserWithRevenueCat(userId: string): Promise<void> {
  try {
    if (!isInitialized) {
      await initializeRevenueCat(userId);
    } else {
      await setRevenueCatUserId(userId);
    }
  } catch (error) {
    console.error('Failed to sync user with RevenueCat:', error);
  }
}

// ============================================
// REVENUECAT EXPERIMENTS
// ============================================

/**
 * Get current paywall from RevenueCat Experiments
 * This returns the offering that RevenueCat has selected for this user based on experiments
 * 
 * To set up experiments:
 * 1. Go to RevenueCat Dashboard > Experiments
 * 2. Create a new experiment
 * 3. Define variants (different offerings/paywalls)
 * 4. Set traffic allocation
 * 5. Start the experiment
 * 
 * The getOfferings() call automatically returns the variant assigned to this user
 */
export async function getCurrentPaywallExperiment(): Promise<{
  offering: PurchasesOffering | null;
  experimentId?: string;
  variant?: string;
}> {
  if (!isInitialized) {
    return { offering: null };
  }

  try {
    const offerings = await Purchases.getOfferings();
    
    if (!offerings?.current) {
      return { offering: null };
    }

    // Track which offering variant user received
    posthog.capture('paywall_experiment_exposure', {
      offering_id: offerings.current.identifier,
      has_packages: (offerings.current.availablePackages?.length || 0) > 0,
    });

    return {
      offering: offerings.current,
      experimentId: offerings.current.identifier, // Offering ID serves as experiment variant
    };
  } catch (error) {
    console.error('Error getting paywall experiment:', error);
    return { offering: null };
  }
}

/**
 * Get all available offerings for manual selection
 * Useful when you want to show different paywalls manually
 */
export async function getAllOfferings(): Promise<Record<string, PurchasesOffering>> {
  if (!isInitialized) {
    return {};
  }

  try {
    const offerings = await Purchases.getOfferings();
    return offerings?.all || {};
  } catch (error) {
    console.error('Error getting all offerings:', error);
    return {};
  }
}

/**
 * RevenueCat Experiments best practices:
 * 
 * 1. PAYWALL TESTS:
 *    - Create different offerings in RevenueCat Dashboard
 *    - Each offering can have different products/prices
 *    - Name them descriptively: "paywall_v1", "paywall_simple", "paywall_premium"
 * 
 * 2. PRICE TESTS:
 *    - Create offerings with same layout but different products
 *    - Example: "price_4.99", "price_6.99", "price_9.99"
 * 
 * 3. TRIAL LENGTH TESTS:
 *    - Create products with different trial periods
 *    - iOS: Configure in App Store Connect
 *    - Android: Configure in Google Play Console
 * 
 * 4. TRACKING:
 *    - RevenueCat automatically tracks conversions per experiment
 *    - View results in RevenueCat Dashboard > Experiments
 * 
 * 5. SAMPLE SIZE:
 *    - Need ~1000+ users per variant for statistical significance
 *    - Run experiments for at least 2 weeks
 */

export interface PaywallExperimentConfig {
  // Experiment metadata
  experimentName: string;
  variantName: string;
  
  // Paywall customization
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  showCountdown?: boolean;
  showSocialProof?: boolean;
  
  // Pricing display
  highlightAnnual?: boolean;
  showSavings?: boolean;
}

/**
 * Example paywall configurations for A/B testing
 * These can be used as templates for experiments
 */
export const PAYWALL_VARIANTS: Record<string, PaywallExperimentConfig> = {
  control: {
    experimentName: 'paywall_v1',
    variantName: 'control',
    headline: 'Unlock Your Full Potential',
    subheadline: 'Get unlimited sessions and personalized insights',
    ctaText: 'Start Free Trial',
    showCountdown: false,
    showSocialProof: true,
    highlightAnnual: true,
    showSavings: true,
  },
  
  urgency: {
    experimentName: 'paywall_v1',
    variantName: 'urgency',
    headline: 'Limited Time Offer',
    subheadline: 'Start your mental clarity journey today',
    ctaText: 'Claim Your Trial',
    showCountdown: true, // Show countdown timer
    showSocialProof: true,
    highlightAnnual: true,
    showSavings: true,
  },
  
  minimal: {
    experimentName: 'paywall_v1',
    variantName: 'minimal',
    headline: 'Go Premium',
    subheadline: 'Try free for 3 days',
    ctaText: 'Continue',
    showCountdown: false,
    showSocialProof: false,
    highlightAnnual: false,
    showSavings: false,
  },
};
