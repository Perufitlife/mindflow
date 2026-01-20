// app/(onboarding)/paywall.tsx - 3-Step Paywall (Arthur's method)
// Step 1: Trial intro, Step 2: Reminder promise, Step 3: Value + CTA

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/brand';
import { TRIAL_CONFIG } from '../../config/revenuecat';
import { PLANS } from '../../config/plans';
import { markOnboardingComplete, startTrial } from '../../services/user';
import { PaywallEvents, OnboardingEvents, UserProperties } from '../../services/analytics';

type PaywallStep = 1 | 2 | 3;

export default function OnboardingPaywall() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    transcript?: string;
    tasks?: string;
    mood?: string;
  }>();
  
  const [step, setStep] = useState<PaywallStep>(1);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    PaywallEvents.shown('onboarding');
    PaywallEvents.stepViewed(1);
  }, []);

  // Parse tasks for display
  let parsedTasks: { title: string }[] = [];
  try {
    if (params.tasks) {
      parsedTasks = JSON.parse(params.tasks).slice(0, 3);
    }
  } catch (e) {
    console.error('Error parsing tasks:', e);
  }

  const handleNext = () => {
    if (step < 3) {
      const nextStep = (step + 1) as PaywallStep;
      PaywallEvents.stepViewed(nextStep);
      setStep(nextStep);
    }
  };

  const handleStartTrial = async () => {
    setActivating(true);
    try {
      await startTrial();
      await markOnboardingComplete();
      
      // Track events
      PaywallEvents.trialStarted();
      OnboardingEvents.completed(0); // TODO: track actual time
      UserProperties.setSubscriptionStatus('trial');
      UserProperties.setOnboardingCompleted(true);
      
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to start trial:', error);
      await markOnboardingComplete();
      router.replace('/(tabs)');
    } finally {
      setActivating(false);
    }
  };

  const handleRemindLater = async () => {
    PaywallEvents.trialRemindLater();
    PaywallEvents.dismissed(step);
    await markOnboardingComplete();
    router.replace('/(tabs)');
  };

  // Step indicators
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((s) => (
        <View
          key={s}
          style={[
            styles.stepDot,
            s === step && styles.stepDotActive,
            s < step && styles.stepDotComplete,
          ]}
        />
      ))}
    </View>
  );

  // STEP 1: Trial Intro
  const renderStep1 = () => (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={SlideOutLeft.duration(300)}
      style={styles.stepContainer}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="gift-outline" size={56} color={COLORS.primary} />
      </View>
      
      <Text style={styles.stepTitle}>Start your free journey</Text>
      
      <View style={styles.benefitsList}>
        <View style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.benefitText}>{TRIAL_CONFIG.durationDays} days completely free</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.benefitText}>Full access to all features</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.benefitText}>No payment required now</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
        <Text style={styles.primaryButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );

  // STEP 2: Reminder Promise
  const renderStep2 = () => (
    <Animated.View
      entering={SlideInRight.duration(400)}
      exiting={SlideOutLeft.duration(300)}
      style={styles.stepContainer}
    >
      <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
        <Ionicons name="notifications-outline" size={56} color="#F59E0B" />
      </View>
      
      <Text style={styles.stepTitle}>We'll remind you</Text>
      <Text style={styles.stepSubtitle}>No surprises, no hidden charges</Text>
      
      <View style={styles.timeline}>
        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, styles.timelineDotActive]}>
            <Ionicons name="play" size={14} color="#FFFFFF" />
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineDay}>Today</Text>
            <Text style={styles.timelineText}>Your free trial starts</Text>
          </View>
        </View>

        <View style={styles.timelineLine} />

        <View style={styles.timelineItem}>
          <View style={styles.timelineDot}>
            <Ionicons name="notifications" size={14} color="#F59E0B" />
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineDay}>Day {TRIAL_CONFIG.durationDays - 1}</Text>
            <Text style={styles.timelineText}>We'll send you a reminder</Text>
          </View>
        </View>

        <View style={styles.timelineLine} />

        <View style={styles.timelineItem}>
          <View style={styles.timelineDot}>
            <Ionicons name="calendar" size={14} color={COLORS.primary} />
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineDay}>Day {TRIAL_CONFIG.durationDays}</Text>
            <Text style={styles.timelineText}>You decide if it's for you</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
        <Text style={styles.primaryButtonText}>Sounds good</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );

  // STEP 3: Value + CTA
  const renderStep3 = () => (
    <Animated.View
      entering={SlideInRight.duration(400)}
      style={styles.stepContainer}
    >
      <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
        <Ionicons name="sparkles" size={56} color="#10B981" />
      </View>
      
      <Text style={styles.stepTitle}>Here's what you'll unlock</Text>
      
      {/* What they achieved */}
      {parsedTasks.length > 0 && (
        <View style={styles.achievementCard}>
          <Text style={styles.achievementLabel}>You just created:</Text>
          {parsedTasks.map((task, index) => (
            <View key={index} style={styles.taskRow}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.taskText} numberOfLines={1}>{task.title}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Premium features */}
      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="mic" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.featureText}>Unlimited voice sessions</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="flash" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.featureText}>AI-powered micro-tasks</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Ionicons name="trending-up" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.featureText}>Progress tracking</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, activating && styles.buttonDisabled]}
        onPress={handleStartTrial}
        disabled={activating}
      >
        {activating ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>
              Start {TRIAL_CONFIG.durationDays}-day free trial
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleRemindLater}
        disabled={activating}
      >
        <Text style={styles.secondaryButtonText}>Remind me tomorrow</Text>
      </TouchableOpacity>

      <Text style={styles.legalText}>
        Free for {TRIAL_CONFIG.durationDays} days, then ${PLANS.PREMIUM.priceMonthly}/month.{'\n'}
        Cancel anytime.
      </Text>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {renderStepIndicator()}
      
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  stepDotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  stepDotComplete: {
    backgroundColor: '#10B981',
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  benefitsList: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
    marginTop: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 17,
    color: '#374151',
    fontWeight: '500',
  },
  timeline: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  timelineDotActive: {
    backgroundColor: COLORS.primary,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginLeft: 17,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDay: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  timelineText: {
    fontSize: 14,
    color: '#6B7280',
  },
  achievementCard: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  achievementLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  taskText: {
    fontSize: 15,
    color: '#166534',
    flex: 1,
  },
  featuresList: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginTop: 'auto',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  legalText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    paddingBottom: 40,
  },
});
