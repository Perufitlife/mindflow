// app/(onboarding)/paywall.tsx - 3-Step Paywall (Arthur's method)
// Step 1: Trial intro, Step 2: Reminder promise, Step 3: Value + CTA

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
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
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/brand';
import { TRIAL_CONFIG } from '../../config/revenuecat';
import { PLANS } from '../../config/plans';
import { markOnboardingComplete, startTrial } from '../../services/user';
import { PaywallEvents, OnboardingEvents, UserProperties } from '../../services/analytics';

type PaywallStep = 1 | 2 | 3;

// Countdown timer hook
function useCountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 });
  
  useEffect(() => {
    // Check if we have a saved end time
    const loadTimer = async () => {
      try {
        const savedEndTime = await AsyncStorage.getItem('@paywall_timer_end');
        let endTime: number;
        
        if (savedEndTime) {
          endTime = parseInt(savedEndTime, 10);
          // If timer has expired, reset it
          if (Date.now() >= endTime) {
            endTime = Date.now() + 24 * 60 * 60 * 1000;
            await AsyncStorage.setItem('@paywall_timer_end', endTime.toString());
          }
        } else {
          // First visit - set 24h timer
          endTime = Date.now() + 24 * 60 * 60 * 1000;
          await AsyncStorage.setItem('@paywall_timer_end', endTime.toString());
        }
        
        // Update timer every second
        const interval = setInterval(() => {
          const now = Date.now();
          const diff = endTime - now;
          
          if (diff <= 0) {
            setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
            clearInterval(interval);
          } else {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft({ hours, minutes, seconds });
          }
        }, 1000);
        
        return () => clearInterval(interval);
      } catch (e) {
        console.error('Timer error:', e);
      }
    };
    
    loadTimer();
  }, []);
  
  return timeLeft;
}

export default function OnboardingPaywall() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    transcript?: string;
    tasks?: string;
    mood?: string;
  }>();
  
  const [step, setStep] = useState<PaywallStep>(1);
  const [activating, setActivating] = useState(false);
  const [userName, setUserName] = useState('');
  const timeLeft = useCountdownTimer();
  
  // Pulse animation for urgency
  const urgencyPulse = useSharedValue(1);

  useEffect(() => {
    PaywallEvents.shown('onboarding');
    PaywallEvents.stepViewed(1);
    loadUserName();
    
    // Pulse animation
    urgencyPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      true
    );
  }, []);

  const urgencyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: urgencyPulse.value }],
  }));

  async function loadUserName() {
    try {
      const name = await AsyncStorage.getItem('@user_name');
      if (name) setUserName(name);
    } catch (e) {
      console.error('Error loading user name:', e);
    }
  }
  
  const formatTime = (num: number) => num.toString().padStart(2, '0');

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

  // STEP 1: Trial Intro with Urgency
  const renderStep1 = () => (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={SlideOutLeft.duration(300)}
      style={styles.stepWrapper}
    >
      <ScrollView 
        style={styles.stepScrollView}
        contentContainerStyle={styles.stepScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Urgency Banner with Countdown */}
        <Animated.View style={[styles.urgencyBanner, urgencyStyle]}>
          <Ionicons name="time-outline" size={18} color="#F59E0B" />
          <Text style={styles.urgencyText}>
            Special offer expires in {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
          </Text>
        </Animated.View>

        <View style={styles.iconCircle}>
          <Ionicons name="gift-outline" size={48} color={COLORS.primary} />
        </View>
        
        <Text style={styles.stepTitle}>Start your free journey</Text>
        
        {/* Value proposition */}
        <Text style={styles.valueProposition}>
          Valued at $197/year. Yours free for {TRIAL_CONFIG.durationDays} days.
        </Text>
        
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <Text style={styles.benefitText}>{TRIAL_CONFIG.durationDays} days completely free</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <Text style={styles.benefitText}>Full access to all features</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <Text style={styles.benefitText}>No payment required now</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.fixedFooter}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // STEP 2: Reminder Promise
  const renderStep2 = () => (
    <Animated.View
      entering={SlideInRight.duration(400)}
      exiting={SlideOutLeft.duration(300)}
      style={styles.stepWrapper}
    >
      <ScrollView 
        style={styles.stepScrollView}
        contentContainerStyle={styles.stepScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="notifications-outline" size={48} color="#F59E0B" />
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

        {/* Trust Badges */}
        <View style={styles.trustBadges}>
          <View style={styles.trustBadge}>
            <Ionicons name="lock-closed" size={14} color="#10B981" />
            <Text style={styles.trustBadgeText}>Encrypted</Text>
          </View>
          <View style={styles.trustBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={styles.trustBadgeText}>No hidden fees</Text>
          </View>
          <View style={styles.trustBadge}>
            <Ionicons name="heart" size={14} color="#10B981" />
            <Text style={styles.trustBadgeText}>Cancel anytime</Text>
          </View>
        </View>

        {/* App Store Rating */}
        <View style={styles.appStoreRating}>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons key={i} name="star" size={14} color="#F59E0B" />
            ))}
          </View>
          <Text style={styles.ratingText}>4.9 on App Store</Text>
        </View>
      </ScrollView>

      <View style={styles.fixedFooter}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Sounds good</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // STEP 3: Value + CTA + Loss Aversion
  const renderStep3 = () => (
    <Animated.View
      entering={SlideInRight.duration(400)}
      style={styles.stepWrapper}
    >
      <ScrollView 
        style={styles.stepScrollView}
        contentContainerStyle={styles.stepScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconCircleSmall, { backgroundColor: '#D1FAE5' }]}>
          <Ionicons name="sparkles" size={40} color="#10B981" />
        </View>
        
        <Text style={styles.stepTitleSmall}>
          {userName ? `${userName}, here's what you unlock` : "Here's what you unlock"}
        </Text>
        
        {/* What they achieved */}
        {parsedTasks.length > 0 && (
          <View style={styles.achievementCardCompact}>
            <Text style={styles.achievementLabel}>You just created:</Text>
            {parsedTasks.slice(0, 2).map((task, index) => (
              <View key={index} style={styles.taskRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.taskTextSmall} numberOfLines={1}>{task.title}</Text>
              </View>
            ))}
            {parsedTasks.length > 2 && (
              <Text style={styles.moreTasksText}>+{parsedTasks.length - 2} more tasks</Text>
            )}
          </View>
        )}

        {/* Loss Aversion Frame */}
        <View style={styles.lossAversionCardCompact}>
          <Text style={styles.lossAversionTitleSmall}>Without Unbind:</Text>
          <View style={styles.lossItemCompact}>
            <Ionicons name="close-circle" size={16} color="#EF4444" />
            <Text style={styles.lossTextSmall}>Feel overwhelmed daily</Text>
          </View>
          <View style={styles.lossItemCompact}>
            <Ionicons name="close-circle" size={16} color="#EF4444" />
            <Text style={styles.lossTextSmall}>Keep procrastinating</Text>
          </View>
        </View>

        {/* Premium features - compact */}
        <View style={styles.featuresCompact}>
          <View style={styles.featureItemCompact}>
            <Ionicons name="infinite" size={18} color={COLORS.primary} />
            <Text style={styles.featureTextSmall}>Unlimited sessions</Text>
          </View>
          <View style={styles.featureItemCompact}>
            <Ionicons name="flash" size={18} color={COLORS.primary} />
            <Text style={styles.featureTextSmall}>AI micro-tasks</Text>
          </View>
          <View style={styles.featureItemCompact}>
            <Ionicons name="trending-up" size={18} color={COLORS.primary} />
            <Text style={styles.featureTextSmall}>Progress tracking</Text>
          </View>
        </View>

        {/* Guarantee */}
        <View style={styles.guaranteeCompact}>
          <Ionicons name="shield-checkmark" size={18} color="#10B981" />
          <Text style={styles.guaranteeTextSmall}>100% satisfaction guarantee</Text>
        </View>
      </ScrollView>

      <View style={styles.fixedFooterLarge}>
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
          style={styles.secondaryButtonCompact}
          onPress={handleRemindLater}
          disabled={activating}
        >
          <Text style={styles.secondaryButtonText}>Remind me tomorrow</Text>
        </TouchableOpacity>

        <Text style={styles.legalTextCompact}>
          Free {TRIAL_CONFIG.durationDays} days, then ${PLANS.PREMIUM.priceMonthly}/mo. Cancel anytime.
        </Text>
      </View>
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
  // New responsive layout styles
  stepWrapper: {
    flex: 1,
  },
  stepScrollView: {
    flex: 1,
  },
  stepScrollContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingBottom: 20,
  },
  fixedFooter: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  fixedFooterLarge: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircleSmall: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepTitleSmall: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
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
  // Urgency Banner Styles
  urgencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  urgencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  valueProposition: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  // Trust Badges Styles
  trustBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  trustBadgeText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  appStoreRating: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 4,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Loss Aversion Styles
  lossAversionCard: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  lossAversionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 12,
  },
  lossItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  lossText: {
    fontSize: 14,
    color: '#7F1D1D',
    flex: 1,
  },
  guarantee: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  guaranteeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  // Compact styles for Step 3 (responsive)
  achievementCardCompact: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  taskTextSmall: {
    fontSize: 13,
    color: '#166534',
    flex: 1,
  },
  moreTasksText: {
    fontSize: 12,
    color: '#059669',
    fontStyle: 'italic',
    marginTop: 4,
  },
  lossAversionCardCompact: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  lossAversionTitleSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 8,
  },
  lossItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  lossTextSmall: {
    fontSize: 13,
    color: '#7F1D1D',
    flex: 1,
  },
  featuresCompact: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  featureItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
    minWidth: '30%',
  },
  featureTextSmall: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  guaranteeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  guaranteeTextSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  secondaryButtonCompact: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  legalTextCompact: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});
