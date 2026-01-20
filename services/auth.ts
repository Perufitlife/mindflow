// services/auth.ts - Authentication Service
import { AuthError, Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../config/supabase';
import { PLANS } from '../config/plans';
import { Profile } from '../types/database';

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string,
  fullName?: string
): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  return { user: data.user, error };
}

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { user: data.user, error };
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Sign in with Apple
 */
export async function signInWithApple(): Promise<{
  user: User | null;
  error: AuthError | Error | null;
}> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('No identity token received from Apple');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    return { user: data.user, error };
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return { user: null, error: null }; // User cancelled
    }
    return { user: null, error };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Get user profile from database
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return { error };
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

/**
 * Sign in anonymously (for users who haven't signed up yet)
 * This allows them to use the app with limits
 */
export async function signInAnonymously(): Promise<{
  user: User | null;
  error: AuthError | null;
}> {
  const { data, error } = await supabase.auth.signInAnonymously();
  return { user: data.user, error };
}

/**
 * Check if current user is anonymous
 */
export async function isAnonymousUser(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.is_anonymous === true;
}

/**
 * Convert anonymous user to permanent account
 */
export async function linkEmailToAnonymous(
  email: string,
  password: string
): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.updateUser({
    email,
    password,
  });
  return { user: data.user, error };
}

/**
 * Check if user can record more sessions today
 * New model: Trial (3 days, 10/day) or Premium (10/day)
 */
export async function canRecordSession(userId: string): Promise<{
  canRecord: boolean;
  sessionsToday: number;
  maxSessions: number;
  isInTrial: boolean;
  trialExpired: boolean;
}> {
  const profile = await getProfile(userId);
  const isPremium = profile?.is_premium === true;
  
  // Check trial status
  const trialStartDate = profile?.trial_start_date ? new Date(profile.trial_start_date) : null;
  const now = new Date();
  let isInTrial = false;
  let trialExpired = false;
  
  if (trialStartDate && !isPremium) {
    const diffMs = now.getTime() - trialStartDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    isInTrial = diffDays < PLANS.TRIAL.durationDays;
    trialExpired = diffDays >= PLANS.TRIAL.durationDays;
  }
  
  // No access if not premium and trial expired
  if (!isPremium && trialExpired) {
    return {
      canRecord: false,
      sessionsToday: 0,
      maxSessions: 0,
      isInTrial: false,
      trialExpired: true,
    };
  }
  
  // Both trial and premium get 10 sessions/day
  const maxSessions = PLANS.PREMIUM.sessionsPerDay;
  const today = new Date().toISOString().split('T')[0];

  let sessionsToday = 0;

  if (profile?.last_session_date === today) {
    sessionsToday = profile.daily_sessions_count || 0;
  }

  return {
    canRecord: sessionsToday < maxSessions,
    sessionsToday,
    maxSessions,
    isInTrial,
    trialExpired: false,
  };
}

/**
 * Increment daily session count
 */
export async function incrementSessionCount(
  userId: string
): Promise<{ error: Error | null }> {
  const profile = await getProfile(userId);
  const today = new Date().toISOString().split('T')[0];

  let newCount = 1;
  if (profile?.last_session_date === today) {
    newCount = (profile.daily_sessions_count || 0) + 1;
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      daily_sessions_count: newCount,
      last_session_date: today,
    })
    .eq('id', userId);

  return { error };
}

/**
 * Reset password
 */
export async function resetPassword(
  email: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return { error };
}
