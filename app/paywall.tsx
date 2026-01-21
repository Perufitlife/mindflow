// app/paywall.tsx - In-App Paywall (trial expired or daily limit)
// 2 Plans: Monthly & Yearly with attractive presentation

import { Ionicons } from '@expo/vector-icons';
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
import { COLORS } from '../constants/brand';
import { TRIAL_CONFIG } from '../config/revenuecat';
import { PLANS } from '../config/plans';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '../services/subscriptions';
import {
  trackPaywallShown,
  trackPaywallSubscribeClicked,
} from '../services/analytics';
import posthog from '../posthog';

type PlanType = 'yearly' | 'monthly';

export default function PaywallScreen() {
  const router = useRouter();
  const { trigger } = useLocalSearchParams<{ trigger?: string }>();

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [packages, setPackages] = useState<{ monthly: PurchasesPackage | null; yearly: PurchasesPackage | null }>({
    monthly: null,
    yearly: null,
  });
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');

  const isTrialExpired = trigger === 'trial_expired';
  const isLimitReached = trigger === 'daily_limit';

  useEffect(() => {
    trackPaywallShown(trigger || 'manual');
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offering = await getOfferings();
      if (offering?.availablePackages) {
        setPackages({
          monthly: offering.availablePackages.find(p => p.packageType === 'MONTHLY') || null,
          yearly: offering.availablePackages.find(p => p.packageType === 'ANNUAL') || null,
        });
      }
    } catch (error) {
      console.warn('Failed to load offerings (expected in Expo Go):', error);
      // App will show fallback prices
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    const pkg = packages[selectedPlan];
    if (!pkg) {
      Alert.alert('Error', 'Unable to load subscription. Please try again.');
      return;
    }

    setPurchasing(true);
    trackPaywallSubscribeClicked(selectedPlan);

    try {
      const result = await purchasePackage(pkg);
      if (result.success) {
        posthog.capture('subscription_success', { plan: selectedPlan, trigger: trigger || 'manual' });
        Alert.alert(
          'Welcome to Premium! 🎉',
          'You now have full access. Let\'s get productive!',
          [{ text: 'Let\'s go!', onPress: () => router.replace('/(tabs)') }]
        );
      } else if (result.error !== 'cancelled') {
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
        Alert.alert('Success', 'Your subscription has been restored!', [
          { text: 'Continue', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find an active subscription.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to restore purchases.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* No close button - user must subscribe or use system back */}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header based on trigger */}
        <View style={styles.header}>
          {isTrialExpired ? (
            <>
              <View style={styles.expiredIcon}>
                <Ionicons name="time-outline" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>Your free trial{'\n'}has ended</Text>
              <Text style={styles.subtitle}>
                Subscribe to continue beating procrastination with AI-powered micro-tasks.
              </Text>
            </>
          ) : isLimitReached ? (
            <>
              <View style={styles.limitIcon}>
                <Ionicons name="flash" size={48} color="#F59E0B" />
              </View>
              <Text style={styles.title}>You've hit your{'\n'}daily limit</Text>
              <Text style={styles.subtitle}>
                Come back tomorrow or upgrade to Premium for 10 sessions per day.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>UNBIND PREMIUM</Text>
              </View>
              <Text style={styles.title}>Unlock your full{'\n'}potential</Text>
              <Text style={styles.subtitle}>
                10 voice sessions per day. Beat procrastination every day.
              </Text>
            </>
          )}
        </View>

        {/* Benefits */}
        <View style={styles.benefits}>
          <BenefitRow icon="rocket" title="10x your productivity" />
          <BenefitRow icon="flash" title="AI micro-tasks that work" />
          <BenefitRow icon="trending-up" title="Track your progress" />
        </View>

        {/* Pricing */}
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.pricing}>
            {/* YEARLY */}
            <TouchableOpacity
              style={[styles.priceOption, selectedPlan === 'yearly' && styles.priceOptionSelected]}
              onPress={() => setSelectedPlan('yearly')}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
              <View style={styles.priceRadio}>
                <Ionicons
                  name={selectedPlan === 'yearly' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={selectedPlan === 'yearly' ? COLORS.primary : '#D1D5DB'}
                />
              </View>
              <View style={styles.priceInfo}>
                <Text style={styles.priceLabel}>Yearly</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceMain}>${PLANS.PREMIUM.pricePerMonthYearly.toFixed(2)}</Text>
                  <Text style={styles.pricePeriod}>/month</Text>
                </View>
                <Text style={styles.priceBilled}>${PLANS.PREMIUM.priceYearly} billed annually</Text>
              </View>
              <View style={styles.saveBadge}>
                <Text style={styles.saveText}>SAVE {PLANS.PREMIUM.yearlySavingsPercent}%</Text>
              </View>
            </TouchableOpacity>

            {/* MONTHLY */}
            <TouchableOpacity
              style={[styles.priceOption, selectedPlan === 'monthly' && styles.priceOptionSelected]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <View style={styles.priceRadio}>
                <Ionicons
                  name={selectedPlan === 'monthly' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={selectedPlan === 'monthly' ? COLORS.primary : '#D1D5DB'}
                />
              </View>
              <View style={styles.priceInfo}>
                <Text style={styles.priceLabel}>Monthly</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceMain}>${PLANS.PREMIUM.priceMonthly.toFixed(2)}</Text>
                  <Text style={styles.pricePeriod}>/month</Text>
                </View>
                <Text style={styles.priceBilled}>Billed monthly</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, purchasing && styles.buttonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isTrialExpired ? 'Subscribe Now' : `Start ${TRIAL_CONFIG.durationDays}-day free trial`}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRestore} disabled={purchasing} style={styles.restoreButton}>
          <Text style={styles.linkText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.legalText}>
          {isTrialExpired 
            ? `${selectedPlan === 'yearly' ? `$${PLANS.PREMIUM.priceYearly}/year` : `$${PLANS.PREMIUM.priceMonthly}/month`}. Cancel anytime.`
            : `${TRIAL_CONFIG.durationDays}-day free trial, then ${selectedPlan === 'yearly' ? `$${PLANS.PREMIUM.priceYearly}/year` : `$${PLANS.PREMIUM.priceMonthly}/month`}. Cancel anytime.`
          }
        </Text>
      </View>
    </View>
  );
}

function BenefitRow({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.benefitRow}>
      <Ionicons name={icon as any} size={22} color={COLORS.primary} />
      <Text style={styles.benefitText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 70, paddingHorizontal: 24, paddingBottom: 20 },
  header: { alignItems: 'center', marginBottom: 28 },
  badge: { backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginBottom: 16 },
  badgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  expiredIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  limitIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 30, fontWeight: '700', color: '#111827', textAlign: 'center', lineHeight: 38, marginBottom: 10 },
  subtitle: { fontSize: 17, color: '#6B7280', textAlign: 'center', lineHeight: 26 },
  benefits: { marginBottom: 28, gap: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitText: { fontSize: 16, color: '#374151', fontWeight: '500' },
  pricing: { gap: 12 },
  priceOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 18, borderWidth: 2, borderColor: 'transparent' },
  priceOptionSelected: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  bestValueBadge: { position: 'absolute', top: -12, left: 18, backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bestValueText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  saveBadge: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  saveText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  priceRadio: { marginRight: 14 },
  priceInfo: { flex: 1 },
  priceLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  priceMain: { fontSize: 26, fontWeight: '700', color: COLORS.primary },
  pricePeriod: { fontSize: 15, fontWeight: '500', color: '#6B7280', marginLeft: 2 },
  priceBilled: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  footer: { padding: 24, paddingBottom: 44, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 14 },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  restoreButton: { alignItems: 'center', marginBottom: 14 },
  linkText: { color: '#6B7280', fontSize: 15, fontWeight: '500' },
  legalText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
});
