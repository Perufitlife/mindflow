// config/plans.ts - Plan Configuration & Limits
// 2 Plans: Monthly ($19.99) and Yearly ($99.99)
// IMPORTANT: Keep in sync with supabase/functions/process-journal/index.ts

/**
 * BUSINESS MODEL: Trial-Only (No Freemium)
 * ========================================
 * 
 * FREE TRIAL: 3 days, 10 sessions/day (max 30 total)
 * PREMIUM:    10 sessions/day, unlimited
 * 
 * PRICING (presented attractively):
 * - Monthly: $19.99/month
 * - Yearly:  $99.99/year ($8.33/month - SAVE 58%)
 */

export const PLANS = {
  TRIAL: {
    id: 'trial',
    name: 'Free Trial',
    durationDays: 3,
    sessionsPerDay: 10,
    maxTotalSessions: 30,
    price: 0,
    features: [
      '3 days free access',
      '10 voice sessions per day',
      'AI-powered micro-tasks',
      'Full premium experience',
    ],
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    sessionsPerDay: 10,
    sessionsPerMonth: 300,
    priceMonthly: 19.99,
    priceYearly: 99.99,
    pricePerMonthYearly: 8.33,  // $99.99 / 12
    yearlySavingsPercent: 58,
    trialDays: 3,
    features: [
      '10 voice sessions per day',
      'AI-powered micro-tasks',
      'Unlimited task history',
      'Priority AI processing',
      'Progress insights',
      'Export your data',
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;

/**
 * Check if user is in trial period
 */
export function isInTrialPeriod(trialStartDate: string | null): boolean {
  if (!trialStartDate) return false;
  
  const start = new Date(trialStartDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  return diffDays < PLANS.TRIAL.durationDays;
}

/**
 * Get remaining trial days
 */
export function getRemainingTrialDays(trialStartDate: string | null): number {
  if (!trialStartDate) return PLANS.TRIAL.durationDays;
  
  const start = new Date(trialStartDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, PLANS.TRIAL.durationDays - diffDays);
}

/**
 * Get session limits based on user status
 */
export function getSessionLimits(isPremium: boolean, isInTrial: boolean) {
  if (isPremium) {
    return {
      sessionsPerDay: PLANS.PREMIUM.sessionsPerDay,
      planName: 'Premium',
      hasAccess: true,
    };
  }
  
  if (isInTrial) {
    return {
      sessionsPerDay: PLANS.TRIAL.sessionsPerDay,
      planName: 'Trial',
      hasAccess: true,
    };
  }
  
  return {
    sessionsPerDay: 0,
    planName: 'Expired',
    hasAccess: false,
  };
}

/**
 * Check if user has reached daily limit
 */
export function hasReachedDailyLimit(
  usedToday: number,
  isPremium: boolean,
  isInTrial: boolean
): boolean {
  const { sessionsPerDay, hasAccess } = getSessionLimits(isPremium, isInTrial);
  
  if (!hasAccess) return true;
  
  return usedToday >= sessionsPerDay;
}

/**
 * Format price attractively
 */
export function formatPriceAttractively(plan: 'monthly' | 'yearly'): {
  mainPrice: string;
  subtext: string;
  badge?: string;
} {
  if (plan === 'yearly') {
    return {
      mainPrice: `$${PLANS.PREMIUM.pricePerMonthYearly.toFixed(2)}`,
      subtext: `$${PLANS.PREMIUM.priceYearly} billed annually`,
      badge: `SAVE ${PLANS.PREMIUM.yearlySavingsPercent}%`,
    };
  }
  
  return {
    mainPrice: `$${PLANS.PREMIUM.priceMonthly.toFixed(2)}`,
    subtext: 'Billed monthly',
  };
}
