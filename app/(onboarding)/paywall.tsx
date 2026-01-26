// app/(onboarding)/paywall.tsx - Simplified Onboarding Paywall
// Single-step paywall with personalization based on user challenge

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
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
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { COLORS } from '../../constants/brand';
import { TRIAL_CONFIG, FALLBACK_PRICES } from '../../config/revenuecat';
import { getChallengeCopy, ChallengeType } from '../../config/challenge-copy';
import { markOnboardingComplete } from '../../services/user';
import { PaywallEvents, OnboardingEvents, UserProperties, trackPaywallChallengeShown } from '../../services/analytics';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  getPackagePrice,
} from '../../services/subscriptions';

type PlanType = 'yearly' | 'monthly';

export default function OnboardingPaywall() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    transcript?: string;
    tasks?: string;
    mood?: string;
    taskCount?: string;
  }>();
  
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [userName, setUserName] = useState('');
  const [userChallenge, setUserChallenge] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  
  // Packages from RevenueCat
  const [yearlyPackage, setYearlyPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  
  // Price info
  const [yearlyPrice, setYearlyPrice] = useState({
    price: FALLBACK_PRICES.yearly.price,
    pricePerMonth: FALLBACK_PRICES.yearly.pricePerMonth,
    hasFreeTrial: true,
    freeTrialDays: TRIAL_CONFIG.durationDays,
    productTitle: 'Unbind Premium (Yearly)',
  });
  
  const [monthlyPrice, setMonthlyPrice] = useState({
    price: FALLBACK_PRICES.monthly.price,
    pricePerMonth: FALLBACK_PRICES.monthly.pricePerMonth,
    hasFreeTrial: false,
    freeTrialDays: 0,
    productTitle: 'Unbind Premium (Monthly)',
  });

  // Track paywall view time
  const paywallOpenTime = useRef(Date.now());
  const exitReasonRef = useRef<'back_button' | 'skip' | 'purchase' | 'restore' | 'unmount'>('unmount');

  // Track time viewed on unmount
  useEffect(() => {
    return () => {
      const timeViewed = Math.round((Date.now() - paywallOpenTime.current) / 1000);
      PaywallEvents.timeViewed(timeViewed);
      PaywallEvents.exitPaywall(exitReasonRef.current);
    };
  }, []);

  useEffect(() => {
    PaywallEvents.shown('onboarding');
    loadUserData();
    loadOfferings();
  }, []);

  async function loadUserData() {
    try {
      const [name, challenge] = await Promise.all([
        AsyncStorage.getItem('@user_name'),
        AsyncStorage.getItem('@user_challenge'),
      ]);
      if (name) setUserName(name);
      if (challenge) {
        setUserChallenge(challenge);
        trackPaywallChallengeShown(challenge);
      }
    } catch (e) {
      console.error('Error loading user data:', e);
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
          const productTitle = yearly.product?.title || 'Unbind Premium (Yearly)';
          setYearlyPrice({
            price: info.price,
            pricePerMonth: info.pricePerMonth,
            hasFreeTrial: info.hasFreeTrial,
            freeTrialDays: info.freeTrialDays || TRIAL_CONFIG.durationDays,
            productTitle,
          });
        }
        
        if (monthly) {
          setMonthlyPackage(monthly);
          const info = getPackagePrice(monthly);
          const productTitle = monthly.product?.title || 'Unbind Premium (Monthly)';
          setMonthlyPrice({
            price: info.price,
            pricePerMonth: info.pricePerMonth,
            hasFreeTrial: false,
            freeTrialDays: 0,
            productTitle,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load offerings:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleStartTrial = async () => {
    const pkg = selectedPlan === 'yearly' ? yearlyPackage : monthlyPackage;
    
    if (!pkg) {
      Alert.alert(
        'Purchases Unavailable',
        'In-app purchases are not available in Expo Go. Please use a development build.',
        [{ text: 'Continue Anyway', onPress: () => completeOnboarding() }]
      );
      return;
    }

    setPurchasing(true);
    
    try {
      PaywallEvents.trialStarted();
      PaywallEvents.purchaseInitiated(pkg.product.identifier, parseFloat(pkg.product.price));
      const result = await purchasePackage(pkg);
      
      if (result.success) {
        PaywallEvents.purchaseCompleted(
          pkg.product.identifier,
          parseFloat(pkg.product.price),
          pkg.product.currencyCode
        );
        exitReasonRef.current = 'purchase';
        OnboardingEvents.completed(0);
        UserProperties.setSubscriptionStatus('trial');
        UserProperties.setOnboardingCompleted(true);
        
        await markOnboardingComplete();
        
        const trialDays = selectedPlan === 'yearly' ? yearlyPrice.freeTrialDays : 0;
        const message = trialDays > 0 
          ? `Your ${trialDays}-day free trial has started. Let's beat procrastination!`
          : "You now have full access. Let's beat procrastination!";
        
        Alert.alert('Welcome to Unbind!', message, [
          { text: "Let's go!", onPress: () => router.replace('/(tabs)') }
        ]);
      } else if (result.error === 'cancelled') {
        console.log('User cancelled purchase');
      } else {
        Alert.alert('Purchase Failed', result.error || 'Please try again.');
      }
    } catch (error: any) {
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
        exitReasonRef.current = 'restore';
        await markOnboardingComplete();
        UserProperties.setSubscriptionStatus('premium');
        Alert.alert('Welcome Back!', 'Your subscription has been restored.', [
          { text: 'Continue', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        Alert.alert('No Subscription Found', "We couldn't find an active subscription.");
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to restore purchases.');
    } finally {
      setPurchasing(false);
    }
  };

  const completeOnboarding = async () => {
    await markOnboardingComplete();
    router.replace('/(tabs)');
  };

  // Get personalized copy
  const challengeCopy = getChallengeCopy(userChallenge);
  const taskCount = parseInt(params.taskCount || '0', 10) || 0;
  const trialDays = yearlyPrice.freeTrialDays;

  // Calculate savings
  const monthlyAnnual = parseFloat(monthlyPrice.price.replace('$', '')) * 12;
  const yearlyCost = parseFloat(yearlyPrice.price.replace('$', ''));
  const savingsPercent = Math.round(((monthlyAnnual - yearlyCost) / monthlyAnnual) * 100);

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Personalized Header */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>{challengeCopy.paywall_title}</Text>
          <Text style={styles.subtitle}>{challengeCopy.paywall_subtitle}</Text>
        </Animated.View>

        {/* Social Proof - Task Achievement */}
        {taskCount > 0 && (
          <Animated.View entering={FadeIn.delay(200).duration(500)} style={styles.socialProof}>
            <Text style={styles.socialProofText}>
              In just 2 minutes, you created {taskCount} actionable tasks
            </Text>
            <View style={styles.socialProofRow}>
              <Ionicons name="people" size={16} color="#6B7280" />
              <Text style={styles.socialProofSubtext}>
                Join 10,000+ people {challengeCopy.benefit.toLowerCase()}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Yearly Plan - Primary (with trial) */}
        <Animated.View entering={FadeIn.delay(300).duration(500)}>
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.8}
          >
            {/* Badges */}
            <View style={styles.badgeRow}>
              <View style={styles.bestValueBadge}>
                <Text style={styles.badgeText}>BEST VALUE</Text>
              </View>
              {trialDays > 0 && (
                <View style={styles.trialBadge}>
                  <Ionicons name="gift" size={12} color="#FFFFFF" />
                  <Text style={styles.trialBadgeText}>{trialDays} DAYS FREE</Text>
                </View>
              )}
              {savingsPercent > 0 && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsBadgeText}>SAVE {savingsPercent}%</Text>
                </View>
              )}
            </View>

            {/* Radio + Label */}
            <View style={styles.planHeader}>
              <View style={[styles.radioCircle, selectedPlan === 'yearly' && styles.radioCircleSelected]}>
                {selectedPlan === 'yearly' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Yearly</Text>
                <Text style={styles.productTitle}>{yearlyPrice.productTitle}</Text>
              </View>
            </View>

            {/* Price - Billed amount prominent */}
            <View style={styles.priceSection}>
              <Text style={styles.priceLarge}>{yearlyPrice.price}</Text>
              <Text style={styles.pricePeriod}>/year</Text>
            </View>
            <Text style={styles.priceSubtext}>Just {yearlyPrice.pricePerMonth}/month</Text>
            
            {trialDays > 0 && (
              <Text style={styles.trialNote}>
                {trialDays}-day free trial, then billed annually
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Monthly Plan - Secondary */}
        <Animated.View entering={FadeIn.delay(400).duration(500)}>
          <TouchableOpacity
            style={[styles.monthlyOption, selectedPlan === 'monthly' && styles.monthlyOptionSelected]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={[styles.radioCircle, selectedPlan === 'monthly' && styles.radioCircleSelected]}>
              {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.monthlyText}>
              Or pay {monthlyPrice.price}/month (no free trial)
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Trust Indicators */}
        <Animated.View entering={FadeIn.delay(500).duration(500)} style={styles.trustSection}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={18} color="#10B981" />
            <Text style={styles.trustText}>Cancel anytime</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="notifications" size={18} color="#F59E0B" />
            <Text style={styles.trustText}>Reminder before trial ends</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <>
            {/* Primary CTA - Aspirational */}
            <TouchableOpacity
              style={[styles.primaryButton, purchasing && styles.buttonDisabled]}
              onPress={handleStartTrial}
              disabled={purchasing}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.primary, '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                {purchasing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>{challengeCopy.cta}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Restore */}
            <TouchableOpacity onPress={handleRestore} disabled={purchasing} style={styles.restoreButton}>
              <Text style={styles.restoreText}>Already unlocked? Restore</Text>
            </TouchableOpacity>

            {/* Legal */}
            <Text style={styles.legalText}>
              {selectedPlan === 'yearly' && trialDays > 0
                ? `${trialDays}-day free trial, then ${yearlyPrice.price}/year. Cancel anytime.`
                : `${selectedPlan === 'yearly' ? yearlyPrice.price + '/year' : monthlyPrice.price + '/month'}. Cancel anytime.`}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  // Social proof
  socialProof: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  socialProofText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    textAlign: 'center',
    marginBottom: 8,
  },
  socialProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  socialProofSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Plan card
  planCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  bestValueBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  trialBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  savingsBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  productTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 36,
  },
  priceLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
  },
  pricePeriod: {
    fontSize: 18,
    color: '#6B7280',
    marginLeft: 4,
  },
  priceSubtext: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 36,
    marginTop: 4,
  },
  trialNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 36,
    marginTop: 8,
  },
  // Monthly option
  monthlyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 20,
  },
  monthlyOptionSelected: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  monthlyText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  // Trust section
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Footer
  footer: {
    padding: 24,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    marginBottom: 14,
  },
  restoreText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
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
