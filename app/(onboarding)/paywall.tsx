// app/(onboarding)/paywall.tsx - Onboarding Paywall with RevenueCat
// Connects to RevenueCat for real subscriptions with free trial

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
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
import { TRIAL_CONFIG, FALLBACK_PRICES } from '../../config/revenuecat';
import { markOnboardingComplete } from '../../services/user';
import { PaywallEvents, OnboardingEvents, UserProperties } from '../../services/analytics';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  getPackagePrice,
} from '../../services/subscriptions';

type PaywallStep = 1 | 2 | 3;

export default function OnboardingPaywall() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    transcript?: string;
    tasks?: string;
    mood?: string;
  }>();
  
  const [step, setStep] = useState<PaywallStep>(1);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [userName, setUserName] = useState('');
  const [yearlyPackage, setYearlyPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [priceInfo, setPriceInfo] = useState({
    price: FALLBACK_PRICES.yearly.pricePerMonth,
    period: '/month',
    fullPrice: FALLBACK_PRICES.yearly.price,
    hasFreeTrial: true,
    freeTrialDays: TRIAL_CONFIG.durationDays,
  });
  
  // Pulse animation for urgency
  const urgencyPulse = useSharedValue(1);

  useEffect(() => {
    PaywallEvents.shown('onboarding');
    PaywallEvents.stepViewed(1);
    loadUserName();
    loadOfferings();
    
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

  async function loadOfferings() {
    try {
      const offering = await getOfferings();
      if (offering?.availablePackages) {
        const yearly = offering.availablePackages.find(p => p.packageType === 'ANNUAL');
        const monthly = offering.availablePackages.find(p => p.packageType === 'MONTHLY');
        
        if (yearly) {
          setYearlyPackage(yearly);
          const info = getPackagePrice(yearly);
          setPriceInfo({
            price: info.pricePerMonth,
            period: '/month',
            fullPrice: info.price,
            hasFreeTrial: info.hasFreeTrial,
            freeTrialDays: info.freeTrialDays || TRIAL_CONFIG.durationDays,
          });
        }
        if (monthly) {
          setMonthlyPackage(monthly);
        }
      }
    } catch (error) {
      console.warn('Failed to load offerings:', error);
      // Will use fallback prices
    } finally {
      setLoading(false);
    }
  }

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
    // Use yearly package by default (best value with trial)
    const pkg = yearlyPackage || monthlyPackage;
    
    if (!pkg) {
      // RevenueCat not available (Expo Go) - skip to app
      Alert.alert(
        'Purchases Unavailable',
        'In-app purchases are not available in Expo Go. Please use a development build to test purchases.',
        [
          {
            text: 'Continue Anyway',
            onPress: async () => {
              await markOnboardingComplete();
              router.replace('/(tabs)');
            },
          },
        ]
      );
      return;
    }

    setPurchasing(true);
    
    try {
      PaywallEvents.trialStarted();
      
      const result = await purchasePackage(pkg);
      
      if (result.success) {
        // Purchase successful!
        OnboardingEvents.completed(0);
        UserProperties.setSubscriptionStatus('trial');
        UserProperties.setOnboardingCompleted(true);
        
        await markOnboardingComplete();
        
        Alert.alert(
          'Welcome to Unbind! 🎉',
          `Your ${priceInfo.freeTrialDays}-day free trial has started. Let's beat procrastination!`,
          [{ text: "Let's go!", onPress: () => router.replace('/(tabs)') }]
        );
      } else if (result.error === 'cancelled') {
        // User cancelled - do nothing
        console.log('User cancelled purchase');
      } else {
        // Other error
        Alert.alert('Error', result.error || 'Something went wrong. Please try again.');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const result = await restorePurchases();
      if (result.isPremium) {
        await markOnboardingComplete();
        UserProperties.setSubscriptionStatus('premium');
        Alert.alert('Welcome Back!', 'Your subscription has been restored.', [
          { text: 'Continue', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        Alert.alert('No Subscription Found', "We couldn't find an active subscription for this account.");
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to restore purchases.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleSkip = async () => {
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
      style={styles.stepWrapper}
    >
      <ScrollView 
        style={styles.stepScrollView}
        contentContainerStyle={styles.stepScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="gift-outline" size={48} color={COLORS.primary} />
        </View>
        
        <Text style={styles.stepTitle}>Try Unbind free</Text>
        <Text style={styles.stepSubtitle}>
          {priceInfo.freeTrialDays} days free, then {priceInfo.price}{priceInfo.period}
        </Text>
        
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <Text style={styles.benefitText}>{priceInfo.freeTrialDays} days completely free</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <Text style={styles.benefitText}>Unlimited AI sessions</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <Text style={styles.benefitText}>Cancel anytime</Text>
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

  // STEP 2: How it works
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
        
        <Text style={styles.stepTitle}>No surprises</Text>
        <Text style={styles.stepSubtitle}>We'll remind you before your trial ends</Text>
        
        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.timelineDotActive]}>
              <Ionicons name="play" size={14} color="#FFFFFF" />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineDay}>Today</Text>
              <Text style={styles.timelineText}>Start your free trial</Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View style={styles.timelineDot}>
              <Ionicons name="notifications" size={14} color="#F59E0B" />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineDay}>Day {priceInfo.freeTrialDays - 1}</Text>
              <Text style={styles.timelineText}>Reminder notification</Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View style={styles.timelineDot}>
              <Ionicons name="card" size={14} color={COLORS.primary} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineDay}>Day {priceInfo.freeTrialDays}</Text>
              <Text style={styles.timelineText}>First payment (if you stay)</Text>
            </View>
          </View>
        </View>

        {/* Trust */}
        <View style={styles.trustRow}>
          <Ionicons name="shield-checkmark" size={18} color="#10B981" />
          <Text style={styles.trustText}>Cancel anytime in Settings</Text>
        </View>
      </ScrollView>

      <View style={styles.fixedFooter}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Got it</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // STEP 3: Final CTA
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
        <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
          <Ionicons name="sparkles" size={48} color="#10B981" />
        </View>
        
        <Text style={styles.stepTitle}>
          {userName ? `Ready, ${userName}?` : "Ready to start?"}
        </Text>
        
        {/* What they created */}
        {parsedTasks.length > 0 && (
          <View style={styles.achievementCard}>
            <Text style={styles.achievementLabel}>Your first micro-tasks:</Text>
            {parsedTasks.slice(0, 2).map((task, index) => (
              <View key={index} style={styles.taskRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.taskText} numberOfLines={1}>{task.title}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Features */}
        <View style={styles.featuresGrid}>
          <View style={styles.featureItem}>
            <Ionicons name="infinite" size={24} color={COLORS.primary} />
            <Text style={styles.featureText}>Unlimited</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="flash" size={24} color={COLORS.primary} />
            <Text style={styles.featureText}>AI Tasks</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="trending-up" size={24} color={COLORS.primary} />
            <Text style={styles.featureText}>Progress</Text>
          </View>
        </View>

        {/* Price display */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>After free trial:</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceMain}>{priceInfo.price}</Text>
            <Text style={styles.pricePeriod}>{priceInfo.period}</Text>
          </View>
          <Text style={styles.priceBilled}>Billed as {priceInfo.fullPrice}/year</Text>
        </View>
      </ScrollView>

      <View style={styles.fixedFooterLarge}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <>
            <TouchableOpacity
              style={[styles.primaryButton, purchasing && styles.buttonDisabled]}
              onPress={handleStartTrial}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    Start {priceInfo.freeTrialDays}-day free trial
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={handleRestore} disabled={purchasing}>
                <Text style={styles.linkText}>Restore</Text>
              </TouchableOpacity>
              <Text style={styles.linkDivider}>•</Text>
              <TouchableOpacity onPress={handleSkip} disabled={purchasing}>
                <Text style={styles.linkText}>Skip</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.legalText}>
              {priceInfo.freeTrialDays}-day free trial, then {priceInfo.fullPrice}/year. Cancel anytime.
            </Text>
          </>
        )}
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
  stepWrapper: {
    flex: 1,
  },
  stepScrollView: {
    flex: 1,
  },
  stepScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    fontSize: 17,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  benefitsList: {
    width: '100%',
    gap: 16,
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
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotActive: {
    backgroundColor: COLORS.primary,
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
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginLeft: 17,
    marginVertical: 4,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  trustText: {
    fontSize: 14,
    color: '#6B7280',
  },
  achievementCard: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  achievementLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 12,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  taskText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  featuresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  priceCard: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceMain: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pricePeriod: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 4,
  },
  priceBilled: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  fixedFooter: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 16,
  },
  fixedFooterLarge: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 16,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  linkDivider: {
    color: '#D1D5DB',
    marginHorizontal: 16,
  },
  legalText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});
