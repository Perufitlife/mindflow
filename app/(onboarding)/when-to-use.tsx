// app/(onboarding)/when-to-use.tsx - When To Use Unbind Screen
// Enseña al usuario CUANDO abrir la app para reducir abandono D2-7

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { COLORS } from '../../constants/brand';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { OnboardingEvents } from '../../services/analytics';

const TRIGGERS = [
  { icon: 'lock-closed-outline', text: 'Your brain feels stuck' },
  { icon: 'cloud-outline', text: "You're overwhelmed" },
  { icon: 'help-circle-outline', text: "You don't know where to start" },
  { icon: 'time-outline', text: "You're avoiding something" },
  { icon: 'git-branch-outline', text: "You can't choose what to do first" },
];

export default function WhenToUseScreen() {
  const router = useRouter();

  useEffect(() => {
    OnboardingEvents.stepCompleted(7, 'when-to-use');
  }, []);

  const handleContinue = () => {
    router.replace('/(tabs)/record');
  };

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <OnboardingProgressBar currentStep={7} totalSteps={7} />

      <View style={styles.content}>
        {/* Back button */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.header}>
          <Text style={styles.title}>Use Unbind when...</Text>
          <Text style={styles.subtitle}>Open the app whenever you feel:</Text>
        </Animated.View>

        {/* Triggers List */}
        <View style={styles.triggersList}>
          {TRIGGERS.map((trigger, index) => (
            <Animated.View
              key={index}
              entering={FadeIn.delay(300 + index * 100).duration(400)}
              style={styles.triggerItem}
            >
              <View style={styles.triggerIcon}>
                <Ionicons name={trigger.icon as any} size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.triggerText}>{trigger.text}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Insight */}
        <Animated.View entering={FadeIn.delay(900).duration(500)} style={styles.insightCard}>
          <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
          <Text style={styles.insightText}>
            It only takes 2 minutes to go from paralysis to action.
          </Text>
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View entering={FadeInUp.delay(1000).duration(500)} style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>Got it, let's start</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#6B7280',
    fontWeight: '500',
  },
  triggersList: {
    gap: 16,
  },
  triggerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 18,
    gap: 16,
  },
  triggerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
    gap: 12,
  },
  insightText: {
    fontSize: 15,
    color: '#92400E',
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 16,
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
