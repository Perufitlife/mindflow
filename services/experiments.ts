// services/experiments.ts - PostHog Feature Flags & A/B Testing
// Arthur: "AB test SIEMPRE. Cambios pequeños pueden cambiar todo."

import posthog from '../posthog';

// ============================================
// EXPERIMENT KEYS
// ============================================

export const EXPERIMENTS = {
  // Onboarding experiments
  ONBOARDING_LENGTH: 'onboarding-length', // 'short' | 'long'
  ONBOARDING_STYLE: 'onboarding-style', // 'standard' | 'storytelling'
  
  // Paywall experiments
  PAYWALL_COUNTDOWN: 'paywall-countdown', // boolean
  PAYWALL_STYLE: 'paywall-style', // 'single' | 'multi-step'
  PAYWALL_CTA: 'paywall-cta', // 'start_trial' | 'continue_free' | 'unlock_premium'
  
  // Commitment screen
  COMMITMENT_ENABLED: 'commitment-screen-enabled', // boolean
  
  // Pricing experiments
  TRIAL_LENGTH: 'trial-length', // '3_days' | '7_days'
  
  // Feature experiments
  STREAK_STYLE: 'streak-style', // 'simple' | 'duolingo'
  TUTORIAL_ENABLED: 'tutorial-enabled', // boolean
  
  // UI experiments
  RECORD_BUTTON_STYLE: 'record-button-style', // 'circle' | 'pill'
  HOME_LAYOUT: 'home-layout', // 'cards' | 'compact'
} as const;

// ============================================
// EXPERIMENT HELPERS
// ============================================

/**
 * Get a feature flag value from PostHog
 */
export async function getExperimentVariant<T = string>(
  experimentKey: string,
  defaultValue: T
): Promise<T> {
  try {
    // PostHog feature flags
    const variant = posthog.getFeatureFlag(experimentKey);
    
    if (variant === undefined || variant === null) {
      return defaultValue;
    }
    
    return variant as T;
  } catch (error) {
    console.error(`Error getting experiment ${experimentKey}:`, error);
    return defaultValue;
  }
}

/**
 * Check if a boolean feature flag is enabled
 */
export function isFeatureEnabled(featureKey: string): boolean {
  try {
    const flag = posthog.getFeatureFlag(featureKey);
    return flag === true || flag === 'true';
  } catch (error) {
    console.error(`Error checking feature ${featureKey}:`, error);
    return false;
  }
}

/**
 * Reload feature flags from server
 */
export async function reloadExperiments(): Promise<void> {
  try {
    await posthog.reloadFeatureFlagsAsync();
  } catch (error) {
    console.error('Error reloading experiments:', error);
  }
}

// ============================================
// SPECIFIC EXPERIMENT GETTERS
// ============================================

export const Experiments = {
  /**
   * Onboarding: Short (4 screens) vs Long (6 screens)
   */
  getOnboardingLength: (): 'short' | 'long' => {
    const variant = posthog.getFeatureFlag(EXPERIMENTS.ONBOARDING_LENGTH);
    return (variant as 'short' | 'long') || 'short';
  },

  /**
   * Paywall: Show countdown timer or not
   */
  showPaywallCountdown: (): boolean => {
    return isFeatureEnabled(EXPERIMENTS.PAYWALL_COUNTDOWN);
  },

  /**
   * Paywall: Single page vs Multi-step
   */
  getPaywallStyle: (): 'single' | 'multi-step' => {
    const variant = posthog.getFeatureFlag(EXPERIMENTS.PAYWALL_STYLE);
    return (variant as 'single' | 'multi-step') || 'multi-step';
  },

  /**
   * Paywall: CTA text variant
   */
  getPaywallCTA: (): 'start_trial' | 'continue_free' | 'unlock_premium' => {
    const variant = posthog.getFeatureFlag(EXPERIMENTS.PAYWALL_CTA);
    return (variant as 'start_trial' | 'continue_free' | 'unlock_premium') || 'start_trial';
  },

  /**
   * Commitment: Show commitment screen before paywall
   */
  showCommitmentScreen: (): boolean => {
    const flag = posthog.getFeatureFlag(EXPERIMENTS.COMMITMENT_ENABLED);
    // Default to true (show commitment screen)
    return flag !== false && flag !== 'false';
  },

  /**
   * Trial: Length in days
   */
  getTrialLength: (): 3 | 7 => {
    const variant = posthog.getFeatureFlag(EXPERIMENTS.TRIAL_LENGTH);
    return variant === '7_days' ? 7 : 3;
  },

  /**
   * Streak: Style (simple counter vs Duolingo-style)
   */
  getStreakStyle: (): 'simple' | 'duolingo' => {
    const variant = posthog.getFeatureFlag(EXPERIMENTS.STREAK_STYLE);
    return (variant as 'simple' | 'duolingo') || 'duolingo';
  },

  /**
   * Tutorial: Show interactive tutorial
   */
  showTutorial: (): boolean => {
    const flag = posthog.getFeatureFlag(EXPERIMENTS.TUTORIAL_ENABLED);
    // Default to true (show tutorial)
    return flag !== false && flag !== 'false';
  },

  /**
   * Record button: Circle vs Pill shape
   */
  getRecordButtonStyle: (): 'circle' | 'pill' => {
    const variant = posthog.getFeatureFlag(EXPERIMENTS.RECORD_BUTTON_STYLE);
    return (variant as 'circle' | 'pill') || 'circle';
  },

  /**
   * Home layout: Cards vs Compact
   */
  getHomeLayout: (): 'cards' | 'compact' => {
    const variant = posthog.getFeatureFlag(EXPERIMENTS.HOME_LAYOUT);
    return (variant as 'cards' | 'compact') || 'cards';
  },
};

// ============================================
// EXPERIMENT TRACKING
// ============================================

/**
 * Track when user is exposed to an experiment
 * This is called automatically by PostHog when getFeatureFlag is called
 * but you can also manually track for custom scenarios
 */
export function trackExperimentExposure(
  experimentKey: string,
  variant: string
): void {
  posthog.capture('$feature_flag_called', {
    $feature_flag: experimentKey,
    $feature_flag_response: variant,
  });
}

/**
 * Track conversion for an experiment
 * Call this when the user completes the goal action
 */
export function trackExperimentConversion(
  experimentKey: string,
  conversionType: 'trial_started' | 'purchase_completed' | 'onboarding_completed' | 'session_completed'
): void {
  posthog.capture('experiment_conversion', {
    experiment: experimentKey,
    conversion_type: conversionType,
    variant: posthog.getFeatureFlag(experimentKey),
  });
}

// ============================================
// CTA TEXT VARIANTS
// ============================================

export const CTA_TEXTS = {
  start_trial: {
    primary: 'Start Free Trial',
    secondary: 'Try 3 days free',
  },
  continue_free: {
    primary: 'Continue Free',
    secondary: 'Start with 3 free days',
  },
  unlock_premium: {
    primary: 'Unlock Premium',
    secondary: 'Get unlimited access',
  },
} as const;

/**
 * Get CTA texts based on experiment variant
 */
export function getCTATexts(): { primary: string; secondary: string } {
  const variant = Experiments.getPaywallCTA();
  return CTA_TEXTS[variant];
}
