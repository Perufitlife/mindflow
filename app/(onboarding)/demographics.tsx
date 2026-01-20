// app/(onboarding)/demographics.tsx - Name Screen (Simplified)
// One question per screen for better UX

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { COLORS } from '../../constants/brand';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { OnboardingEvents } from '../../services/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NameScreen() {
  const router = useRouter();
  const [name, setName] = useState('');

  const canContinue = name.trim().length > 0;

  useEffect(() => {
    OnboardingEvents.demographicsViewed();
  }, []);

  const handleContinue = async () => {
    // Save name to AsyncStorage
    try {
      await AsyncStorage.setItem('@user_name', name.trim());
    } catch (e) {
      console.error('Error saving name:', e);
    }

    // Track for analytics
    OnboardingEvents.stepCompleted(3, 'name', {
      has_name: true,
    });

    // Navigate to challenge screen
    router.push('/(onboarding)/personalize');
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
      <View style={styles.container}>
        {/* Progress Bar */}
        <OnboardingProgressBar currentStep={3} totalSteps={6} />

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

          {/* Name Input */}
          <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.questionContainer}>
            <Text style={styles.questionTitle}>What should we call you?</Text>
            
            <TextInput
              style={styles.nameInput}
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              maxLength={30}
            />
          </Animated.View>
        </View>

        {/* Footer */}
        <Animated.View
          entering={FadeInUp.delay(400).duration(500)}
          style={styles.footer}
        >
          <TouchableOpacity
            style={[styles.button, !canContinue && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            <Text style={styles.buttonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
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
  questionContainer: {
    flex: 1,
  },
  questionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  nameInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 18,
    fontSize: 18,
    color: '#111827',
    borderWidth: 2,
    borderColor: '#E5E7EB',
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
