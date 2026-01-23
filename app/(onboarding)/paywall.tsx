// app/(onboarding)/paywall.tsx - Onboarding Paywall with RevenueCat
// Connects to RevenueCat for real subscriptions with free trial

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import Animated, {
  FadeIn,
  SlideInRight,
  SlideOutLeft,
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
type PlanType = 'yearly' | 'monthly';

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
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  
  // Packages from RevenueCat
  const [yearlyPackage, setYearlyPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  
  // Price info for both plans
  const [yearlyPrice, setYearlyPrice] = useState({
    price: FALLBACK_PRICES.yearly.price,
    pricePerMonth: FALLBACK_PRICES.yearly.pricePerMonth,
    hasFreeTrial: true,
    freeTrialDays: TRIAL_CONFIG.durationDays,
  });
  
  const [monthlyPrice, setMonthlyPrice] = useState({
    price: FALLBACK_PRICES.monthly.price,
    pricePerMonth: FALLBACK_PRICES.monthly.pricePerMonth,
    hasFreeTrial: true,
    freeTrialDays: TRIAL_CONFIG.durationDays,
  });

  useEffect(() => {
    PaywallEvents.shown('onboarding');
    PaywallEvents.stepViewed(1);
    loadUserName();
    loadOfferings();
  }, []);

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
          setYearlyPrice({
            price: info.price,
            pricePerMonth: info.pricePerMonth,
            hasFreeTrial: info.hasFreeTrial,
            freeTrialDays: info.freeTrialDays || TRIAL_CONFIG.durationDays,
          });
        }
        
        if (monthly) {
          setMonthlyPackage(monthly);
          const info = getPackagePrice(monthly);
          setMonthlyPrice({
            price: info.price,
            pricePerMonth: info.pricePerMonth,
            hasFreeTrial: info.hasFreeTrial,
            freeTrialDays: info.freeTrialDays || TRIAL_CONFIG.durationDays,
          });
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
    // Select package based on user choice
    const pkg = selectedPlan === 'yearly' ? yearlyPackage : monthlyPackage;
    
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
        
        const trialDays = selectedPlan === 'yearly' ? yearlyPrice.freeTrialDays : monthlyPrice.freeTrialDays;
        
        Alert.alert(
          'Welcome to Unbind! 🎉',
          `Your ${trialDays}-day free trial has started. Let's beat procrastination!`,
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

  // Calculate savings
  const monthlyCostIfPaidMonthly = parseFloat(monthlyPrice.price.replace('$', '')) * 12;
  const yearlyCost = parseFloat(yearlyPrice.price.replace('$', ''));
  const savingsPercent = Math.round(((monthlyCostIfPaidMonthly - yearlyCost) / monthlyCostIfPaidMonthly) * 100);

  // Current selected price info
  const currentPrice = selectedPlan === 'yearly' ? yearlyPrice : monthlyPrice;
  const trialDays = currentPrice.freeTrialDays;

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

  // Check if yearly has free trial (only yearly should have it)
  const yearlyHasTrial = yearlyPrice.hasFreeTrial && yearlyPrice.freeTrialDays > 0;
  const yearlyTrialDays = yearlyPrice.freeTrialDays || TRIAL_CONFIG.durationDays;

  // Plan selector component
  const renderPlanSelector = () => (
    <View style={styles.planSelector}>
      {/* Yearly Plan - WITH FREE TRIAL */}
      <TouchableOpacity
        style={[
          styles.planOption,
          selectedPlan === 'yearly' && styles.planOptionSelected,
        ]}
        onPress={() => setSelectedPlan('yearly')}
        activeOpacity={0.8}
      >
        {/* Best Value + Free Trial Badge */}
        <View style={styles.badgeRow}>
          {savingsPercent > 0 && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsBadgeText}>SAVE {savingsPercent}%</Text>
            </View>
          )}
          <View style={styles.trialBadge}>
            <Ionicons name="gift-outline" size={12} color="#FFFFFF" />
            <Text style={styles.trialBadgeText}>{yearlyTrialDays} DAYS FREE</Text>
          </View>
        </View>
        <View style={styles.planHeader}>
          <View style={[
            styles.radioCircle,
            selectedPlan === 'yearly' && styles.radioCircleSelected,
          ]}>
            {selectedPlan === 'yearly' && <View style={styles.radioInner} />}
          </View>
          <Text style={[
            styles.planName,
            selectedPlan === 'yearly' && styles.planNameSelected,
          ]}>
            Yearly
          </Text>
        </View>
        <View style={styles.planPricing}>
          <Text style={[
            styles.planPriceLarge,
            selectedPlan === 'yearly' && styles.planPriceSelected,
          ]}>
            {yearlyPrice.price}
          </Text>
          <Text style={styles.planPeriodLarge}>/year</Text>
        </View>
        <Text style={styles.planEquivalent}>Just {yearlyPrice.pricePerMonth}/month</Text>
        {yearlyHasTrial && (
          <Text style={styles.planTrialNote}>{yearlyTrialDays}-day free trial, then billed annually</Text>
        )}
      </TouchableOpacity>

      {/* Monthly Plan - NO FREE TRIAL */}
      <TouchableOpacity
        style={[
          styles.planOption,
          styles.planOptionSecondary,
          selectedPlan === 'monthly' && styles.planOptionSelected,
        ]}
        onPress={() => setSelectedPlan('monthly')}
        activeOpacity={0.8}
      >
        <View style={styles.planHeader}>
          <View style={[
            styles.radioCircle,
            selectedPlan === 'monthly' && styles.radioCircleSelected,
          ]}>
            {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
          </View>
          <Text style={[
            styles.planName,
            selectedPlan === 'monthly' && styles.planNameSelected,
          ]}>
            Monthly
          </Text>
          <Text style={styles.noTrialText}>No free trial</Text>
        </View>
        <View style={styles.planPricing}>
          <Text style={[
            styles.planPrice,
            selectedPlan === 'monthly' && styles.planPriceSelected,
          ]}>
            {monthlyPrice.price}
          </Text>
          <Text style={styles.planPeriod}>/month</Text>
        </View>
        <Text style={styles.planBilled}>Billed monthly, cancel anytime</Text>
      </TouchableOpacity>
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
          {trialDays} days free, then {currentPrice.pricePerMonth}/month
        </Text>
        
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <Text style={styles.benefitText}>{trialDays} days completely free</Text>
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
              <Text style={styles.timelineDay}>Day {trialDays - 1}</Text>
              <Text style={styles.timelineText}>Reminder notification</Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View style={styles.timelineDot}>
              <Ionicons name="card" size={14} color={COLORS.primary} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineDay}>Day {trialDays}</Text>
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

  // STEP 3: Plan Selection + CTA
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
        <Text style={styles.stepTitle}>
          {userName ? `Choose your plan, ${userName}` : "Choose your plan"}
        </Text>
        <Text style={styles.stepSubtitle}>
          {selectedPlan === 'yearly' 
            ? `Start with ${yearlyTrialDays} days free` 
            : 'Get started today'}
        </Text>
        
        {/* Plan Selector */}
        {renderPlanSelector()}

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
                <Text style={styles.primaryButtonText}>
                  {selectedPlan === 'yearly' 
                    ? `Start ${yearlyTrialDays}-day free trial`
                    : `Subscribe for ${monthlyPrice.price}/mo`}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRestore} disabled={purchasing} style={styles.restoreButton}>
              <Text style={styles.linkText}>Restore Purchases</Text>
            </TouchableOpacity>

            <Text style={styles.legalText}>
              {selectedPlan === 'yearly' 
                ? `${yearlyTrialDays}-day free trial, then ${yearlyPrice.price}/year. Cancel anytime.`
                : `Billed ${monthlyPrice.price} today, then monthly. Cancel anytime.`}
            </Text>
            
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => Linking.openURL('https://unbindapp.com/terms.html')}>
                <Text style={styles.legalLink}>Terms of Use</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>|</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://unbindapp.com/privacy.html')}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
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
  
  // Plan Selector Styles
  planSelector: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  planOption: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  planOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F5F3FF',
  },
  badgeRow: {
    position: 'absolute',
    top: -10,
    right: 16,
    flexDirection: 'row',
    gap: 6,
  },
  savingsBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  trialBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trialBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  planOptionSecondary: {
    opacity: 0.9,
  },
  noTrialText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 'auto',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  planNameSelected: {
    color: COLORS.primary,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 36,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  planPriceLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  planPriceSelected: {
    color: COLORS.primary,
  },
  planPeriod: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 2,
  },
  planPeriodLarge: {
    fontSize: 18,
    color: '#6B7280',
    marginLeft: 4,
  },
  planBilled: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 36,
    marginTop: 4,
  },
  planEquivalent: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 36,
    marginTop: 4,
  },
  planTrialNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 36,
    marginTop: 2,
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
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  _unused: {
    color: '#D1D5DB',
    marginHorizontal: 16,
  },
  legalText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 12,
    color: '#D1D5DB',
  },
});
