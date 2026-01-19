import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PaywallScreen() {
  const router = useRouter();
  const { mood } = useLocalSearchParams<{ mood?: string }>();

  const handleClose = () => {
    router.replace('/record');
  };

  const handleSubscribe = () => {
    // Aquí luego integrarás RevenueCat / In-App Purchases
    // Por ahora solo simulamos y volvemos a record
    router.replace('/record');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>7 days free</Text>

      <Text style={styles.title}>Keep turning thoughts into clarity</Text>
      <Text style={styles.subtitle}>
        Unlock unlimited voice entries, smarter insights and weekly summaries
        based on everything you share.
      </Text>

      {mood ? (
        <View style={styles.highlightCard}>
          <Text style={styles.highlightTitle}>
            From {mood} to clear and focused
          </Text>
          <Text style={styles.highlightText}>
            Use Voice Journal AI every day for 7 days and see how your mind
            feels when everything is organized for you.
          </Text>
        </View>
      ) : null}

      <View style={styles.benefitsCard}>
        <Text style={styles.benefitItem}>• Unlimited daily voice entries</Text>
        <Text style={styles.benefitItem}>• Clear summaries and action steps</Text>
        <Text style={styles.benefitItem}>
          • Weekly email with your main patterns
        </Text>
        <Text style={styles.benefitItem}>• Private. Nothing is shared.</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleSubscribe}>
          <Text style={styles.primaryButtonText}>
            Start 7-day free trial – $9.99/month
          </Text>
          <Text style={styles.primaryButtonSub}>
            No charge today. Cancel anytime in 2 taps.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleClose}>
          <Text style={styles.secondaryButtonText}>Not now</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          After the trial, your subscription renews automatically unless you
          cancel at least 24 hours before the end of the period.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
    paddingTop: 70,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 20,
  },
  highlightCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  benefitsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  benefitItem: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 6,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 24,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButtonSub: {
    color: '#D1D5DB',
    fontSize: 12,
    marginTop: 3,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  legal: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
});
