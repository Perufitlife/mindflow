// app/(onboarding)/personalize.tsx - Challenge Screen (Simplified)
// One question per screen for better UX

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { COLORS } from '../../constants/brand';
import { signInAnonymously } from '../../services/auth';
import { updatePreferences } from '../../services/user';
import { OnboardingEvents } from '../../services/analytics';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHALLENGES = [
  { id: 'overwhelmed', label: 'Overwhelmed mind', icon: 'cloud-outline' },
  { id: 'procrastination', label: 'Procrastination', icon: 'time-outline' },
  { id: 'focus', label: 'Lack of focus', icon: 'eye-outline' },
  { id: 'anxiety', label: 'Anxiety & stress', icon: 'pulse-outline' },
];

export default function ChallengeScreen() {
  const router = useRouter();
  const [challenge, setChallenge] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canContinue = challenge.length > 0;

  useEffect(() => {
    OnboardingEvents.personalizeViewed();
  }, []);

  const handleContinue = async () => {
    setIsLoading(true);
    
    try {
      // Track personalization choices
      OnboardingEvents.personalizeSelected(challenge);
      OnboardingEvents.stepCompleted(4, 'challenge', {
        challenge,
      });

      // Save preferences
      await updatePreferences({
        goals: [challenge],
      });
      
      // Save challenge for commit screen
      await AsyncStorage.setItem('@user_challenge', challenge);

      // Create anonymous user for the session
      await signInAnonymously();

      // Navigate to notifications screen
      router.push('/(onboarding)/notifications');
    } catch (error) {
      console.error('Error in challenge:', error);
      router.push('/(onboarding)/notifications');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <OnboardingProgressBar currentStep={4} totalSteps={6} />

      <View style={styles.content}>
        {/* Back button */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        </Animated.View>

        {/* Question */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <Text style={styles.questionTitle}>What's your biggest challenge?</Text>
        </Animated.View>

        {/* Options */}
        <View style={styles.optionsGrid}>
          {CHALLENGES.map((item, index) => (
            <Animated.View
              key={item.id}
              entering={FadeIn.delay(300 + index * 80).duration(400)}
              style={styles.optionWrapper}
            >
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  challenge === item.id && styles.optionCardSelected,
                ]}
                onPress={() => setChallenge(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon as any}
                  size={32}
                  color={challenge === item.id ? COLORS.primary : '#6B7280'}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    challenge === item.id && styles.optionLabelSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {challenge === item.id && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <Animated.View
        entering={FadeInUp.delay(600).duration(500)}
        style={styles.footer}
      >
        <TouchableOpacity
          style={[styles.button, (!canContinue || isLoading) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Setting up...' : 'Continue'}
          </Text>
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
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  questionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 32,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  optionWrapper: {
    width: '47%',
  },
  optionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    minHeight: 120,
    justifyContent: 'center',
  },
  optionCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: COLORS.primary,
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  button: {
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
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
