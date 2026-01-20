// app/(onboarding)/personalize.tsx - Quick Personalization Screen
// 2 simple questions before first session

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { COLORS } from '../../constants/brand';
import { signInAnonymously } from '../../services/auth';
import { updatePreferences, markOnboardingComplete } from '../../services/user';
import { OnboardingEvents } from '../../services/analytics';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHALLENGES = [
  { id: 'overwhelmed', label: 'Overwhelmed mind', icon: 'cloud-outline' },
  { id: 'procrastination', label: 'Procrastination', icon: 'time-outline' },
  { id: 'focus', label: 'Lack of focus', icon: 'eye-outline' },
  { id: 'anxiety', label: 'Anxiety & stress', icon: 'pulse-outline' },
];

const TIMES = [
  { id: 'morning', label: 'Morning routine', icon: 'sunny-outline', description: 'Start your day with clarity' },
  { id: 'evening', label: 'Evening wind-down', icon: 'moon-outline', description: 'Reflect and plan for tomorrow' },
  { id: 'flexible', label: 'Whenever I need it', icon: 'time-outline', description: 'No fixed schedule' },
];

export default function PersonalizeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const [challenge, setChallenge] = useState('overwhelmed');
  const [time, setTime] = useState('flexible');
  const [isLoading, setIsLoading] = useState(false);

  const userName = params.name || '';

  useEffect(() => {
    OnboardingEvents.personalizeViewed();
  }, []);

  const handleStartFirstSession = async () => {
    setIsLoading(true);
    
    try {
      // Track personalization choices
      OnboardingEvents.personalizeSelected(challenge);
      OnboardingEvents.stepCompleted(4, 'personalize', {
        challenge,
        preferred_time: time,
      });

      // Save preferences including challenge for commit screen
      await updatePreferences({
        goals: [challenge],
        frequency: time as 'morning' | 'evening' | 'flexible',
      });
      
      // Save challenge for commit screen
      await AsyncStorage.setItem('@user_challenge', challenge);

      // Create anonymous user for the session
      await signInAnonymously();

      // Mark that user is in "first session" mode (not fully onboarded yet)
      // They'll complete onboarding after first session + trial acceptance
      
      // Navigate to notifications screen (then commitment)
      router.push('/(onboarding)/notifications');
    } catch (error) {
      console.error('Error in personalize:', error);
      // Still proceed even if there's an error
      router.push('/(onboarding)/notifications');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <OnboardingProgressBar currentStep={4} totalSteps={6} />

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        </Animated.View>

        {/* Question 1: Challenge */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <Text style={styles.questionLabel}>YOUR CHALLENGE</Text>
          <Text style={styles.questionTitle}>What's your biggest challenge?</Text>
          
          <View style={styles.optionsGrid}>
            {CHALLENGES.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeIn.delay(300 + index * 50).duration(300)}
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
                    size={24}
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
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Question 2: Time */}
        <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.question2}>
          <Text style={styles.questionLabel}>YOUR ROUTINE</Text>
          <Text style={styles.questionTitle}>When would you like to journal?</Text>
          
          <View style={styles.timeOptions}>
            {TIMES.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeIn.delay(600 + index * 50).duration(300)}
              >
                <TouchableOpacity
                  style={[
                    styles.timeCard,
                    time === item.id && styles.timeCardSelected,
                  ]}
                  onPress={() => setTime(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.timeIcon,
                    time === item.id && styles.timeIconSelected,
                  ]}>
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={time === item.id ? '#FFFFFF' : COLORS.primary}
                    />
                  </View>
                  <View style={styles.timeContent}>
                    <Text style={[
                      styles.timeLabel,
                      time === item.id && styles.timeLabelSelected,
                    ]}>
                      {item.label}
                    </Text>
                    <Text style={styles.timeDescription}>{item.description}</Text>
                  </View>
                  {time === item.id && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <Animated.View
        entering={FadeInUp.delay(800).duration(500)}
        style={styles.footer}
      >
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleStartFirstSession}
          disabled={isLoading}
        >
          <Ionicons name="mic" size={22} color="#FFFFFF" />
          <Text style={styles.buttonText}>
            {isLoading ? 'Setting up...' : 'Try my first session free'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.freeNote}>
          No credit card required
        </Text>
      </Animated.View>
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
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  questionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionWrapper: {
    width: '48%',
  },
  optionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  optionCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 10,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: COLORS.primary,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  question2: {
    marginTop: 36,
  },
  timeOptions: {
    gap: 12,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
  },
  timeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  timeIconSelected: {
    backgroundColor: COLORS.primary,
  },
  timeContent: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  timeLabelSelected: {
    color: COLORS.primary,
  },
  timeDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  freeNote: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
