// services/user.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { getCurrentSession } from './auth';

const USER_KEY = '@unbind_user';
const PREFERENCES_KEY = '@unbind_preferences';
const TRIAL_START_KEY = '@unbind_trial_start';

interface UserState {
  hasCompletedOnboarding: boolean;
  sessionCount: number;
  hasSeenPaywall: boolean;
  isPremium: boolean;
  firstSessionDate: string | null;
  // Daily tracking (local backup)
  dailySessionCount: number;
  lastSessionDate: string | null;
}

interface UserPreferences {
  goals: string[];
  frequency: 'morning' | 'evening' | 'flexible' | null;
  notificationsEnabled: boolean;
  notificationTime: string | null;
  language: string;
}

const DEFAULT_USER_STATE: UserState = {
  hasCompletedOnboarding: false,
  sessionCount: 0,
  hasSeenPaywall: false,
  isPremium: false,
  firstSessionDate: null,
  dailySessionCount: 0,
  lastSessionDate: null,
};

const DEFAULT_PREFERENCES: UserPreferences = {
  goals: [],
  frequency: null,
  notificationsEnabled: false,
  notificationTime: null,
  language: 'en', // English as default
};

// ==================== USER STATE ====================

/**
 * Get the current user state
 */
export async function getUserState(): Promise<UserState> {
  try {
    const data = await AsyncStorage.getItem(USER_KEY);
    if (data) {
      return { ...DEFAULT_USER_STATE, ...JSON.parse(data) };
    }
    return DEFAULT_USER_STATE;
  } catch (error) {
    console.error('Error reading user state:', error);
    return DEFAULT_USER_STATE;
  }
}

/**
 * Update user state
 */
async function updateUserState(updates: Partial<UserState>): Promise<UserState> {
  const current = await getUserState();
  const newState = { ...current, ...updates };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(newState));
  return newState;
}

/**
 * Check if this is the user's first session
 */
export async function isFirstSession(): Promise<boolean> {
  const state = await getUserState();
  return state.sessionCount === 0;
}

/**
 * Mark onboarding as complete
 */
export async function markOnboardingComplete(): Promise<void> {
  await updateUserState({ hasCompletedOnboarding: true });
}

/**
 * Reset onboarding (for testing purposes)
 */
export async function resetOnboarding(): Promise<void> {
  await updateUserState({ hasCompletedOnboarding: false, hasSeenPaywall: false });
}

/**
 * Check if user has completed onboarding
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const state = await getUserState();
  return state.hasCompletedOnboarding;
}

/**
 * Increment session count (call after each successful journal entry)
 */
export async function incrementSessionCount(): Promise<number> {
  const state = await getUserState();
  const newCount = state.sessionCount + 1;

  const updates: Partial<UserState> = { sessionCount: newCount };

  if (!state.firstSessionDate) {
    updates.firstSessionDate = new Date().toISOString();
  }

  await updateUserState(updates);
  return newCount;
}

/**
 * Get the current session count
 */
export async function getSessionCount(): Promise<number> {
  const state = await getUserState();
  return state.sessionCount;
}

/**
 * Check if user should see the paywall
 * Returns trigger reason for analytics
 */
export async function shouldShowPaywall(): Promise<{
  show: boolean;
  trigger: string;
  sessionsToday: number;
  maxSessions: number;
}> {
  const state = await getUserState();
  // MUST match config/plans.ts
  const FREE_DAILY_LIMIT = 1;
  const PREMIUM_DAILY_LIMIT = 10;
  const maxSessions = state.isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

  // Get today's count
  const today = new Date().toISOString().split('T')[0];
  let sessionsToday = 0;
  if (state.lastSessionDate === today) {
    sessionsToday = state.dailySessionCount;
  }

  if (state.isPremium) {
    return { show: false, trigger: '', sessionsToday, maxSessions };
  }

  // First session - soft sell
  if (state.sessionCount === 1 && !state.hasSeenPaywall) {
    return { show: true, trigger: 'first_session', sessionsToday, maxSessions };
  }

  // Every 3rd session - reminder
  if (state.sessionCount > 1 && state.sessionCount % 3 === 0) {
    return { show: true, trigger: 'session_reminder', sessionsToday, maxSessions };
  }

  return { show: false, trigger: '', sessionsToday, maxSessions };
}

/**
 * Get daily session count
 */
export async function getDailySessionCount(): Promise<{
  count: number;
  maxSessions: number;
}> {
  const state = await getUserState();
  // MUST match config/plans.ts
  const FREE_DAILY_LIMIT = 1;
  const PREMIUM_DAILY_LIMIT = 10;
  const maxSessions = state.isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

  const today = new Date().toISOString().split('T')[0];
  if (state.lastSessionDate === today) {
    return { count: state.dailySessionCount, maxSessions };
  }
  return { count: 0, maxSessions };
}

/**
 * Increment daily session count
 */
export async function incrementDailySessionCount(): Promise<number> {
  const state = await getUserState();
  const today = new Date().toISOString().split('T')[0];

  let newDailyCount = 1;
  if (state.lastSessionDate === today) {
    newDailyCount = (state.dailySessionCount || 0) + 1;
  }

  await updateUserState({
    dailySessionCount: newDailyCount,
    lastSessionDate: today,
  });

  return newDailyCount;
}

/**
 * Mark that user has seen the paywall
 */
export async function markPaywallSeen(): Promise<void> {
  await updateUserState({ hasSeenPaywall: true });
}

/**
 * Set premium status (call after successful purchase)
 */
export async function setPremiumStatus(isPremium: boolean): Promise<void> {
  await updateUserState({ isPremium });
}

/**
 * Start the free trial
 * Saves trial_start_date to Supabase profile and local storage
 */
export async function startTrial(): Promise<void> {
  const now = new Date().toISOString();
  
  // Save locally first (backup)
  await AsyncStorage.setItem(TRIAL_START_KEY, now);
  
  // Try to save to Supabase if user is authenticated
  try {
    const session = await getCurrentSession();
    if (session?.user) {
      const { error } = await supabase
        .from('profiles')
        .update({ trial_start_date: now })
        .eq('id', session.user.id);
      
      if (error) {
        console.error('Failed to save trial start to Supabase:', error);
      }
    }
  } catch (error) {
    console.error('Error starting trial:', error);
    // Local storage backup is already saved, so user can still use the app
  }
}

/**
 * Get trial start date
 */
export async function getTrialStartDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TRIAL_START_KEY);
  } catch {
    return null;
  }
}

/**
 * Check if user is premium
 */
export async function isPremiumUser(): Promise<boolean> {
  const state = await getUserState();
  return state.isPremium;
}

/**
 * Reset user state (for testing/debugging)
 */
export async function resetUserState(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
  await AsyncStorage.removeItem(PREFERENCES_KEY);
}

// ==================== USER PREFERENCES ====================

/**
 * Get user preferences
 */
export async function getPreferences(): Promise<UserPreferences> {
  try {
    const data = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (data) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(data) };
    }
    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('Error reading preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update user preferences
 */
export async function updatePreferences(
  updates: Partial<UserPreferences>
): Promise<UserPreferences> {
  const current = await getPreferences();
  const newPrefs = { ...current, ...updates };
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPrefs));
  return newPrefs;
}

/**
 * Save selected goals
 */
export async function saveGoals(goals: string[]): Promise<void> {
  await updatePreferences({ goals });
}

/**
 * Save frequency preference
 */
export async function saveFrequency(
  frequency: 'morning' | 'evening' | 'flexible'
): Promise<void> {
  await updatePreferences({ frequency });
}

/**
 * Save notification settings
 */
export async function saveNotificationSettings(
  enabled: boolean,
  time?: string
): Promise<void> {
  await updatePreferences({
    notificationsEnabled: enabled,
    notificationTime: time || null,
  });
}

// ==================== STATS ====================

/**
 * Get user stats for dashboard
 */
export async function getUserStats(): Promise<{
  totalSessions: number;
  streak: number;
  firstSessionDate: string | null;
}> {
  const state = await getUserState();

  return {
    totalSessions: state.sessionCount,
    streak: 0, // Streak is calculated from entries in storage.ts
    firstSessionDate: state.firstSessionDate,
  };
}
