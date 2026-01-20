// services/openai.ts - Uses Supabase Edge Function
import * as FileSystem from 'expo-file-system/legacy';
import { SUPABASE_URL } from '../config/supabase';
import { getCurrentSession, signInAnonymously } from './auth';
import { getPreferences } from './user';

export interface MicroTask {
  id: string;
  title: string;
  duration: number;
  completed: boolean;
  completedAt?: string;
}

export interface JournalAnalysis {
  summary: string;
  blocker: string;
  mood: string;
  tasks: MicroTask[];
}

export interface ProcessResult {
  transcript: string;
  analysis: JournalAnalysis;
  sessionId?: string;
  sessionsToday: number;
  maxSessions: number;
  isInTrial?: boolean;
  trialDaysRemaining?: number;
  isPremium?: boolean;
}

/**
 * Get or create a valid session
 */
async function getValidSession() {
  let session = await getCurrentSession();
  
  if (!session) {
    console.log('No session found, creating anonymous user...');
    const { error } = await signInAnonymously();
    if (error) {
      console.error('Anonymous sign in failed:', error);
      throw new Error('Authentication failed: ' + error.message);
    }
    session = await getCurrentSession();
  }
  
  if (!session) {
    throw new Error('Failed to create session');
  }
  
  return session;
}

/**
 * Process journal entry through Supabase Edge Function
 */
export async function processJournalEntry(audioUri: string, retryCount = 0): Promise<ProcessResult> {
  try {
    // Get or create valid session
    let session = await getValidSession();

    // Get language preference
    const prefs = await getPreferences();
    const language = prefs.language || 'en';

    // Read audio file as base64
    console.log('Reading audio file...');
    const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: 'base64',
    });

    // Call Edge Function
    console.log('Calling Edge Function...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-journal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioBase64,
        language,
      }),
    });

    const data = await response.json();
    console.log('Edge Function response:', response.status, JSON.stringify(data));

    if (!response.ok) {
      // Handle Invalid JWT - create new session and retry once
      if (response.status === 401 && retryCount < 1) {
        console.log('Invalid JWT, creating new session and retrying...');
        const { error } = await signInAnonymously();
        if (!error) {
          return processJournalEntry(audioUri, retryCount + 1);
        }
      }
      
      // Handle trial expired
      if (data.error === 'trial_expired') {
        throw new Error('TRIAL_EXPIRED');
      }
      
      // Handle daily limit
      if (data.error === 'daily_limit_reached') {
        throw new Error(`LIMIT_REACHED:${data.sessionsToday}:${data.maxSessions}`);
      }
      
      throw new Error(data.error || data.message || `Processing failed: ${response.status}`);
    }

    console.log('Processing complete!');
    return {
      transcript: data.transcript,
      analysis: data.analysis,
      sessionId: data.sessionId,
      sessionsToday: data.sessionsToday,
      maxSessions: data.maxSessions,
      isInTrial: data.isInTrial,
      trialDaysRemaining: data.trialDaysRemaining,
      isPremium: data.isPremium,
    };

  } catch (error: any) {
    // Don't log expected errors
    if (error.message?.startsWith('LIMIT_REACHED:') || error.message === 'TRIAL_EXPIRED') {
      console.log('Access restricted:', error.message);
    } else {
      console.error('Process error:', error);
    }
    throw error;
  }
}

/**
 * Parse limit error
 */
export function parseLimitError(error: Error): {
  isLimitError: boolean;
  isTrialExpired: boolean;
  sessionsToday: number;
  maxSessions: number;
} {
  const message = error.message;
  
  if (message === 'TRIAL_EXPIRED') {
    return {
      isLimitError: false,
      isTrialExpired: true,
      sessionsToday: 0,
      maxSessions: 0,
    };
  }
  
  if (message.startsWith('LIMIT_REACHED:')) {
    const parts = message.split(':');
    return {
      isLimitError: true,
      isTrialExpired: false,
      sessionsToday: parseInt(parts[1], 10),
      maxSessions: parseInt(parts[2], 10),
    };
  }
  
  return { isLimitError: false, isTrialExpired: false, sessionsToday: 0, maxSessions: 10 };
}
