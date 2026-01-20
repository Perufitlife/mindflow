// app/(onboarding)/paywall-comparison.tsx - Alternative Paywall for A/B Testing
// Feature comparison table format (vs 3-step flow)

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { COLORS } from '../../constants/brand';
import { TRIAL_CONFIG } from '../../config/revenuecat';
import { PLANS } from '../../config/plans';
import { markOnboardingComplete, startTrial } from '../../services/user';
import { PaywallEvents, OnboardingEvents, UserProperties } from '../../services/analytics';
import UnbindLogo from '../../components/UnbindLogo';

interface FeatureRow {
  feature: string;
  free: boolean | string;
  premium: boolean | string;
}

const FEATURES: FeatureRow[] = [
  { feature: 'Voice sessions per day', free: '1', premium: 'Unlimited' },
  { feature: 'AI-powered micro-tasks', free: true, premium: true },
  { feature: 'Session history', free: '7 days', premium: 'Unlimited' },
  { feature: 'Streak tracking', free: true, premium: true },
  { feature: 'Deep AI insights', free: false, premium: true },
  { feature: 'Priority support', free: false, premium: true },
  { feature: 'Custom themes', free: false, premium: true },
  { feature: 'Export data', free: false, premium: true },
];

export default function PaywallComparisonScreen() {
  const router = useRouter();
  const [activating, setActivating] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    PaywallEvents.shown('onboarding');
    loadUserName();
    
    // Track that user saw comparison paywall (for A/B analysis)
    PaywallEvents.stepViewed(1);
  }, []);

  async function loadUserName() {
    try {
      const name = await AsyncStorage.getItem('@user_name');
      if (name) setUserName(name);
    } catch (e) {
      console.error('Error loading user name:', e);
    }
  }

  const handleStartTrial = async () => {
    setActivating(true);
    try {
      await startTrial();
      await markOnboardingComplete();
      
      PaywallEvents.trialStarted();
      OnboardingEvents.completed(0);
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

  const handleContinueFree = async () => {
    PaywallEvents.dismissed(1);
    await markOnboardingComplete();
    router.replace('/(tabs)');
  };

  const renderFeatureValue = (value: boolean | string, isPremium: boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Ionicons name="checkmark-circle" size={22} color="#10B981" />
      ) : (
        <Ionicons name="close-circle" size={22} color="#D1D5DB" />
      );
    }
    return (
      <Text style={[
        styles.featureValue,
        isPremium && styles.featureValuePremium,
      ]}>
        {value}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.header}>
          <UnbindLogo size={48} animation="breathing" />
          <Text style={styles.title}>
            {userName ? `${userName}, choose your plan` : 'Choose your plan'}
          </Text>
          <Text style={styles.subtitle}>
            Start your journey to beat procrastination
          </Text>
        </Animated.View>

        {/* Comparison Table */}
        <Animated.View entering={FadeIn.delay(300).duration(500)} style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={styles.featureColumn}>
              <Text style={styles.columnLabel}>Features</Text>
            </View>
            <View style={styles.planColumn}>
              <Text style={styles.planLabel}>Free</Text>
            </View>
            <View style={[styles.planColumn, styles.premiumColumn]}>
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>POPULAR</Text>
              </View>
              <Text style={[styles.planLabel, styles.premiumLabel]}>Premium</Text>
            </View>
          </View>

          {/* Feature Rows */}
          {FEATURES.map((row, index) => (
            <Animated.View 
              key={row.feature}
              entering={FadeIn.delay(400 + index * 50).duration(300)}
              style={[
                styles.tableRow,
                index % 2 === 0 && styles.tableRowAlt,
              ]}
            >
              <View style={styles.featureColumn}>
                <Text style={styles.featureText}>{row.feature}</Text>
              </View>
              <View style={styles.planColumn}>
                {renderFeatureValue(row.free, false)}
              </View>
              <View style={[styles.planColumn, styles.premiumColumn]}>
                {renderFeatureValue(row.premium, true)}
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Pricing Cards */}
        <Animated.View entering={FadeInUp.delay(700).duration(500)} style={styles.pricingCards}>
          {/* Free Card */}
          <View style={styles.pricingCard}>
            <Text style={styles.pricingTitle}>Free</Text>
            <Text style={styles.pricingPrice}>$0</Text>
            <Text style={styles.pricingPeriod}>forever</Text>
            <TouchableOpacity 
              style={styles.freeButton}
              onPress={handleContinueFree}
            >
              <Text style={styles.freeButtonText}>Continue Free</Text>
            </TouchableOpacity>
          </View>

          {/* Premium Card */}
          <View style={[styles.pricingCard, styles.premiumCard]}>
            <View style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>{TRIAL_CONFIG.durationDays} DAYS FREE</Text>
            </View>
            <Text style={[styles.pricingTitle, styles.premiumPricingTitle]}>Premium</Text>
            <Text style={[styles.pricingPrice, styles.premiumPricingPrice]}>
              ${PLANS.PREMIUM.priceMonthly}
            </Text>
            <Text style={[styles.pricingPeriod, styles.premiumPricingPeriod]}>/month</Text>
            <TouchableOpacity 
              style={[styles.premiumButton, activating && styles.buttonDisabled]}
              onPress={handleStartTrial}
              disabled={activating}
            >
              {activating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.premiumButtonText}>Start Free Trial</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Trust Indicators */}
        <Animated.View entering={FadeIn.delay(900).duration(500)} style={styles.trustSection}>
          <View style={styles.trustRow}>
            <Ionicons name="shield-checkmark" size={18} color="#10B981" />
            <Text style={styles.trustText}>Cancel anytime</Text>
          </View>
          <View style={styles.trustRow}>
            <Ionicons name="notifications" size={18} color="#F59E0B" />
            <Text style={styles.trustText}>We'll remind you before trial ends</Text>
          </View>
          <View style={styles.trustRow}>
            <Ionicons name="lock-closed" size={18} color="#6366F1" />
            <Text style={styles.trustText}>No payment required now</Text>
          </View>
        </Animated.View>

        {/* Legal */}
        <Text style={styles.legalText}>
          Free for {TRIAL_CONFIG.durationDays} days, then ${PLANS.PREMIUM.priceMonthly}/month.{'\n'}
          Cancel anytime. Terms apply.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  featureColumn: {
    flex: 2,
    justifyContent: 'center',
  },
  planColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumColumn: {
    backgroundColor: '#EEF2FF20',
  },
  columnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  planLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  premiumLabel: {
    color: COLORS.primary,
  },
  popularBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  featureValue: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  featureValuePremium: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  pricingCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  premiumCard: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
    borderWidth: 2,
    position: 'relative',
  },
  trialBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trialBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pricingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 8,
  },
  premiumPricingTitle: {
    color: COLORS.primary,
  },
  pricingPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  premiumPricingPrice: {
    color: COLORS.primary,
  },
  pricingPeriod: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  premiumPricingPeriod: {
    color: COLORS.primary,
  },
  freeButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  freeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  premiumButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  premiumButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  trustSection: {
    gap: 12,
    marginBottom: 24,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trustText: {
    fontSize: 14,
    color: '#6B7280',
  },
  legalText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});
