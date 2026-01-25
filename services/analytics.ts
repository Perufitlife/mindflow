// services/analytics.ts - Centralized Analytics & Funnel Tracking
// Arthur: "Gasta 90% de tu tiempo en el onboarding. Más del 80% de las conversiones son ahí."

import posthog from '../posthog';

// Safe wrapper for posthog.capture to prevent crashes
function safeCapture(eventName: string, properties?: Record<string, any>) {
  try {
    if (posthog && typeof posthog.capture === 'function') {
      posthog.capture(eventName, properties);
    } else {
      console.warn(`[ANALYTICS] PostHog not available, skipping event: ${eventName}`);
    }
  } catch (error) {
    console.warn(`[ANALYTICS] Failed to capture event ${eventName}:`, error);
  }
}

// ============================================
// ONBOARDING FUNNEL EVENTS
// ============================================

export const OnboardingEvents = {
  // Onboarding Start
  started: () => {
    safeCapture('onboarding_started', {
      timestamp: new Date().toISOString(),
    });
  },

  // Step completion
  stepCompleted: (stepNumber: number, stepName: string, data?: Record<string, any>) => {
    posthog.capture('onboarding_step_completed', {
      step_number: stepNumber,
      step_name: stepName,
      ...data,
    });
  },

  // Drop off tracking
  droppedAt: (stepNumber: number, stepName: string) => {
    posthog.capture('onboarding_dropped', {
      dropped_at_step: stepNumber,
      dropped_at_name: stepName,
    });
  },

  // Completion
  completed: (totalTimeSeconds: number) => {
    posthog.capture('onboarding_completed', {
      total_time_seconds: totalTimeSeconds,
      completed_at: new Date().toISOString(),
    });
  },

  // Individual screen events
  problemScreenViewed: () => {
    posthog.capture('onboarding_problem_viewed');
  },

  solutionScreenViewed: () => {
    posthog.capture('onboarding_solution_viewed');
  },

  demographicsViewed: () => {
    posthog.capture('onboarding_demographics_viewed');
  },

  demographicsCompleted: (hasName: boolean, ageRange: string, gender: string) => {
    posthog.capture('onboarding_demographics_completed', {
      has_name: hasName,
      age_range: ageRange,
      gender: gender,
    });
  },

  personalizeViewed: () => {
    posthog.capture('onboarding_personalize_viewed');
  },

  personalizeSelected: (challenge: string) => {
    posthog.capture('onboarding_personalize_completed', {
      challenge_selected: challenge,
    });
  },
};

// ============================================
// COMMITMENT SCREEN EVENTS
// ============================================

export const CommitmentEvents = {
  shown: () => {
    posthog.capture('commitment_screen_shown');
  },

  holdStarted: () => {
    posthog.capture('commitment_hold_started');
  },

  completed: (holdTimeMs: number) => {
    posthog.capture('commitment_completed', {
      hold_time_ms: holdTimeMs,
    });
  },

  skipped: () => {
    posthog.capture('commitment_skipped');
  },
};

// ============================================
// PAYWALL FUNNEL EVENTS
// ============================================

export const PaywallEvents = {
  // Overall paywall
  shown: (source: 'onboarding' | 'limit_reached' | 'settings' | 'manual') => {
    posthog.capture('paywall_shown', {
      source,
    });
  },

  dismissed: (atStep: number) => {
    posthog.capture('paywall_dismissed', {
      dismissed_at_step: atStep,
    });
  },

  // Step tracking (3-step paywall)
  stepViewed: (stepNumber: 1 | 2 | 3) => {
    posthog.capture('paywall_step_viewed', {
      step: stepNumber,
    });
  },

  // Trial events
  trialStarted: (priceId?: string) => {
    posthog.capture('trial_started', {
      price_id: priceId,
      started_at: new Date().toISOString(),
    });
  },

  trialRemindLater: () => {
    posthog.capture('trial_remind_later');
  },

  // Conversion events
  purchaseInitiated: (productId: string, price: number) => {
    posthog.capture('purchase_initiated', {
      product_id: productId,
      price,
    });
  },

  purchaseCompleted: (productId: string, price: number, currency: string) => {
    posthog.capture('purchase_completed', {
      product_id: productId,
      price,
      currency,
      revenue: price,
    });
  },

  purchaseFailed: (productId: string, errorMessage: string) => {
    posthog.capture('purchase_failed', {
      product_id: productId,
      error: errorMessage,
    });
  },

  purchaseCancelled: (productId: string) => {
    posthog.capture('purchase_cancelled', {
      product_id: productId,
    });
  },
};

// ============================================
// SESSION EVENTS
// ============================================

export const SessionEvents = {
  // Recording
  recordingStarted: () => {
    posthog.capture('recording_started');
  },

  recordingCompleted: (durationSeconds: number) => {
    posthog.capture('recording_completed', {
      duration_seconds: durationSeconds,
    });
  },

  recordingCancelled: (durationSeconds: number) => {
    posthog.capture('recording_cancelled', {
      duration_seconds: durationSeconds,
    });
  },

  // Processing
  processingStarted: () => {
    posthog.capture('processing_started');
  },

  processingCompleted: (durationSeconds: number) => {
    posthog.capture('processing_completed', {
      processing_time_seconds: durationSeconds,
    });
  },

  processingFailed: (errorMessage: string) => {
    posthog.capture('processing_failed', {
      error: errorMessage,
    });
  },

  // Output
  outputViewed: () => {
    posthog.capture('output_viewed');
  },

  outputSaved: (taskCount: number) => {
    posthog.capture('output_saved', {
      task_count: taskCount,
    });
  },
};

// ============================================
// TASK EVENTS
// ============================================

export const TaskEvents = {
  completed: (taskId: string, entryId: string) => {
    posthog.capture('task_completed', {
      task_id: taskId,
      entry_id: entryId,
    });
  },

  uncompleted: (taskId: string, entryId: string) => {
    posthog.capture('task_uncompleted', {
      task_id: taskId,
      entry_id: entryId,
    });
  },

  allCompleted: (entryId: string, totalTasks: number) => {
    posthog.capture('all_tasks_completed', {
      entry_id: entryId,
      total_tasks: totalTasks,
    });
  },
};

// ============================================
// RETENTION EVENTS
// ============================================

export const RetentionEvents = {
  appOpened: (sessionNumber: number, daysSinceInstall: number) => {
    posthog.capture('app_opened', {
      session_number: sessionNumber,
      days_since_install: daysSinceInstall,
    });
  },

  streakMilestone: (streakDays: number) => {
    posthog.capture('streak_milestone', {
      streak_days: streakDays,
    });
  },

  streakLost: (previousStreak: number) => {
    posthog.capture('streak_lost', {
      previous_streak: previousStreak,
    });
  },

  tutorialCompleted: () => {
    posthog.capture('tutorial_completed');
  },

  tutorialSkipped: (atStep: number) => {
    posthog.capture('tutorial_skipped', {
      skipped_at_step: atStep,
    });
  },

  favoriteAdded: (entryId: string) => {
    posthog.capture('favorite_added', {
      entry_id: entryId,
    });
  },

  favoriteRemoved: (entryId: string) => {
    posthog.capture('favorite_removed', {
      entry_id: entryId,
    });
  },
};

// ============================================
// SETTINGS/ENGAGEMENT EVENTS
// ============================================

export const EngagementEvents = {
  settingsOpened: () => {
    posthog.capture('settings_opened');
  },

  themeChanged: (theme: 'light' | 'dark' | 'system') => {
    posthog.capture('theme_changed', {
      new_theme: theme,
    });
  },

  languageChanged: (language: string) => {
    posthog.capture('language_changed', {
      new_language: language,
    });
  },

  feedbackSubmitted: (type: 'bug' | 'feature' | 'general') => {
    posthog.capture('feedback_submitted', {
      feedback_type: type,
    });
  },

  notificationsToggled: (enabled: boolean) => {
    posthog.capture('notifications_toggled', {
      enabled,
    });
  },

  shareAttempted: (contentType: 'session' | 'task' | 'app') => {
    posthog.capture('share_attempted', {
      content_type: contentType,
    });
  },
};

// ============================================
// USER PROPERTIES
// ============================================

export const UserProperties = {
  setSubscriptionStatus: (status: 'free' | 'trial' | 'premium' | 'expired') => {
    posthog.capture('$set', {
      $set: {
        subscription_status: status,
      },
    });
  },

  setOnboardingCompleted: (completed: boolean) => {
    posthog.capture('$set', {
      $set: {
        onboarding_completed: completed,
      },
    });
  },

  setTotalSessions: (count: number) => {
    posthog.capture('$set', {
      $set: {
        total_sessions: count,
      },
    });
  },

  setCurrentStreak: (days: number) => {
    posthog.capture('$set', {
      $set: {
        current_streak: days,
      },
    });
  },

  setDemographics: (age: string, gender: string) => {
    posthog.capture('$set', {
      $set: {
        age_range: age,
        gender: gender,
      },
    });
  },
};

// ============================================
// RECORDING EVENTS
// ============================================

export function trackRecordingStarted() {
  try {
    if (posthog && typeof posthog.capture === 'function') {
      posthog.capture('recording_started', {
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('[ANALYTICS] Failed to track recording started:', error);
  }
}

export function trackRecordingStopped(durationSeconds: number) {
  try {
    if (posthog && typeof posthog.capture === 'function') {
      posthog.capture('recording_stopped', {
        duration_seconds: durationSeconds,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('[ANALYTICS] Failed to track recording stopped:', error);
  }
}

// ============================================
// TASK EVENTS
// ============================================

export function trackTaskCompleted(data: { taskId: string; duration: number; sessionId?: string }) {
  posthog.capture('task_completed', {
    task_id: data.taskId,
    duration_minutes: data.duration,
    session_id: data.sessionId,
  });
}

export function trackTaskAdded(durationMinutes: number) {
  posthog.capture('task_added', {
    duration_minutes: durationMinutes,
  });
}

export function trackTaskRemoved() {
  posthog.capture('task_removed');
}

// ============================================
// OUTPUT PREVIEW EVENTS
// ============================================

export function trackOutputPreviewShown(taskCount: number, challenge: string) {
  try {
    if (posthog && typeof posthog.capture === 'function') {
      posthog.capture('output_preview_shown', {
        task_count: taskCount,
        challenge,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('[ANALYTICS] Failed to track output preview shown:', error);
  }
}

export function trackBlurTapped(section: string) {
  try {
    if (posthog && typeof posthog.capture === 'function') {
      posthog.capture('blur_tapped', {
        section, // 'summary', 'insight', 'tasks', 'blocker'
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('[ANALYTICS] Failed to track blur tapped:', error);
  }
}

export function trackUnlockCTATapped(challenge: string) {
  try {
    if (posthog && typeof posthog.capture === 'function') {
      posthog.capture('unlock_cta_tapped', {
        challenge,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('[ANALYTICS] Failed to track unlock CTA tapped:', error);
  }
}

export function trackPaywallChallengeShown(challenge: string) {
  try {
    if (posthog && typeof posthog.capture === 'function') {
      posthog.capture('paywall_challenge_shown', {
        challenge,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('[ANALYTICS] Failed to track paywall challenge shown:', error);
  }
}

// ============================================
// AUTH EVENTS
// ============================================

export function trackSignUp(method: string = 'email') {
  posthog.capture('user_signed_up', {
    method,
    timestamp: new Date().toISOString(),
  });
}

export function trackSignIn(method: string = 'email') {
  posthog.capture('user_signed_in', {
    method,
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// PAYWALL TRACKING FUNCTIONS
// ============================================

export function trackPaywallShown(trigger: string) {
  try {
    if (posthog && typeof posthog.capture === 'function') {
      posthog.capture('paywall_shown', {
        trigger,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('[ANALYTICS] Failed to track paywall shown:', error);
  }
}

export function trackPaywallSubscribeClicked(plan: string) {
  try {
    if (posthog && typeof posthog.capture === 'function') {
      posthog.capture('paywall_subscribe_clicked', {
        plan,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('[ANALYTICS] Failed to track paywall subscribe clicked:', error);
  }
}

// ============================================
// FUNNEL HELPERS
// ============================================

export const FunnelHelpers = {
  // Track complete onboarding funnel
  trackOnboardingFunnel: (steps: { name: string; completed: boolean; duration?: number }[]) => {
    const completedSteps = steps.filter(s => s.completed).length;
    const totalSteps = steps.length;
    const dropOffStep = steps.findIndex(s => !s.completed);

    posthog.capture('onboarding_funnel', {
      completed_steps: completedSteps,
      total_steps: totalSteps,
      completion_rate: completedSteps / totalSteps,
      drop_off_step: dropOffStep === -1 ? null : dropOffStep + 1,
      steps: steps,
    });
  },

  // Track paywall funnel
  trackPaywallFunnel: (viewedSteps: number[], converted: boolean, selectedPlan?: string) => {
    posthog.capture('paywall_funnel', {
      viewed_steps: viewedSteps,
      highest_step: Math.max(...viewedSteps),
      converted,
      selected_plan: selectedPlan,
    });
  },
};

// ============================================
// NOTIFICATION PERMISSION EVENTS
// ============================================

export const NotificationEvents = {
  benefitsShown: () => {
    posthog.capture('notification_benefits_shown');
  },

  accepted: () => {
    posthog.capture('notification_accepted');
  },

  declined: () => {
    posthog.capture('notification_declined');
  },

  declinedScreenShown: () => {
    posthog.capture('notification_declined_screen_shown');
  },

  declinedReconsidered: () => {
    posthog.capture('notification_declined_reconsidered');
  },

  declinedConfirmed: () => {
    posthog.capture('notification_declined_confirmed');
  },
};

// ============================================
// WEEKLY SUMMARY EVENTS
// ============================================

export const WeeklySummaryEvents = {
  shown: (data: { sessions: number; tasksCompleted: number; streak: number }) => {
    posthog.capture('weekly_summary_shown', data);
  },

  dismissed: () => {
    posthog.capture('weekly_summary_dismissed');
  },

  insightViewed: (insight: string) => {
    posthog.capture('weekly_summary_insight_viewed', { insight });
  },
};

// ============================================
// ACHIEVEMENT EVENTS
// ============================================

export const AchievementEvents = {
  unlocked: (data: { achievementId: string; achievementName: string; xp: number; totalXp: number }) => {
    posthog.capture('achievement_unlocked', {
      achievement_id: data.achievementId,
      achievement_name: data.achievementName,
      xp_gained: data.xp,
      total_xp: data.totalXp,
    });
  },

  profileViewed: () => {
    posthog.capture('achievements_profile_viewed');
  },

  levelUp: (newLevel: number) => {
    posthog.capture('level_up', { new_level: newLevel });
  },
};

// ============================================
// OUTPUT CELEBRATION EVENTS
// ============================================

export const OutputEvents = {
  celebrationShown: (taskCount: number) => {
    posthog.capture('output_celebration_shown', { task_count: taskCount });
  },

  firstTaskPrompted: () => {
    posthog.capture('first_task_prompted');
  },

  firstTaskStarted: (taskId: string, duration: number) => {
    posthog.capture('first_task_started', { task_id: taskId, duration });
  },

  insightViewed: (blocker: string) => {
    posthog.capture('output_insight_viewed', { blocker });
  },
};

// ============================================
// PROCESSING PHASE EVENTS
// ============================================

export const ProcessingEvents = {
  phaseStarted: (phase: number, phaseName: string) => {
    posthog.capture('processing_phase_started', { phase, phase_name: phaseName });
  },

  phaseCompleted: (phase: number, durationMs: number) => {
    posthog.capture('processing_phase_completed', { phase, duration_ms: durationMs });
  },

  allPhasesCompleted: (totalDurationMs: number) => {
    posthog.capture('processing_all_phases_completed', { total_duration_ms: totalDurationMs });
  },
};

// ============================================
// PAYWALL AB TEST EVENTS
// ============================================

export const PaywallABEvents = {
  variantShown: (variant: 'steps' | 'comparison') => {
    posthog.capture('paywall_variant_shown', { variant });
  },

  timerShown: (hoursLeft: number) => {
    posthog.capture('paywall_timer_shown', { hours_left: hoursLeft });
  },

  comparisonTableScrolled: (depth: number) => {
    posthog.capture('paywall_comparison_scrolled', { scroll_depth: depth });
  },

  trustBadgeViewed: () => {
    posthog.capture('paywall_trust_badge_viewed');
  },

  lossAversionShown: () => {
    posthog.capture('paywall_loss_aversion_shown');
  },
};

// ============================================
// DYNAMIC PROMPTS EVENTS
// ============================================

export const PromptEvents = {
  shown: (timeOfDay: 'morning' | 'afternoon' | 'evening', prompt: string) => {
    posthog.capture('dynamic_prompt_shown', { time_of_day: timeOfDay, prompt });
  },

  interacted: (prompt: string) => {
    posthog.capture('dynamic_prompt_interacted', { prompt });
  },
};

// ============================================
// ERROR TRACKING
// ============================================

export const ErrorEvents = {
  /**
   * Capture a critical error with full context
   * Use this for crashes or unexpected errors
   */
  captureError: (error: Error | any, context: {
    screen?: string;
    action?: string;
    userId?: string;
    additionalData?: Record<string, any>;
  }) => {
    try {
      const errorMessage = error?.message || String(error);
      const errorStack = error?.stack || 'No stack trace';
      const errorName = error?.name || 'UnknownError';
      
      // Safely call posthog.capture with error handling
      if (posthog && typeof posthog.capture === 'function') {
        posthog.capture('app_error', {
          error_message: errorMessage,
          error_name: errorName,
          error_stack: errorStack.substring(0, 1000), // Limit stack trace length
          screen: context.screen || 'unknown',
          action: context.action || 'unknown',
          user_id: context.userId,
          timestamp: new Date().toISOString(),
          ...context.additionalData,
        });
      } else {
        console.warn('[ERROR] PostHog not available, skipping error capture');
      }
      
      // Also log to console for debugging
      console.error('[ERROR]', {
        message: errorMessage,
        name: errorName,
        screen: context.screen,
        action: context.action,
        stack: errorStack,
      });
    } catch (captureError) {
      // If error capture itself fails, at least log to console
      console.error('[ERROR] Failed to capture error:', captureError);
      console.error('[ERROR] Original error:', error);
    }
  },

  /**
   * Capture a crash (unhandled exception)
   */
  captureCrash: (error: Error, screen: string) => {
    ErrorEvents.captureError(error, {
      screen,
      action: 'crash',
      additionalData: {
        is_crash: true,
      },
    });
  },
};
