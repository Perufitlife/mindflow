// app/(onboarding)/demographics.tsx - Demographic Questions for Analytics
// Arthur: "Age and gender are useful for analytics and ad targeting"

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { COLORS } from '../../constants/brand';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { OnboardingEvents, UserProperties } from '../../services/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AGE_RANGES = [
  { id: '18-24', label: '18-24' },
  { id: '25-34', label: '25-34' },
  { id: '35-44', label: '35-44' },
  { id: '45-54', label: '45-54' },
  { id: '55+', label: '55+' },
];

const GENDERS = [
  { id: 'female', label: 'Female', icon: 'female' },
  { id: 'male', label: 'Male', icon: 'male' },
  { id: 'other', label: 'Prefer not to say', icon: 'person' },
];

export default function DemographicsScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  const canContinue = name.trim().length > 0;

  useEffect(() => {
    OnboardingEvents.demographicsViewed();
  }, []);

  const handleContinue = async () => {
    // Save demographics to AsyncStorage
    try {
      await AsyncStorage.setItem('@user_name', name.trim());
      await AsyncStorage.setItem('@user_age', age);
      await AsyncStorage.setItem('@user_gender', gender);
    } catch (e) {
      console.error('Error saving demographics:', e);
    }

    // Track for analytics
    OnboardingEvents.demographicsCompleted(
      name.trim().length > 0,
      age || 'not_provided',
      gender || 'not_provided'
    );
    OnboardingEvents.stepCompleted(3, 'demographics', {
      has_name: name.trim().length > 0,
      age_range: age,
      gender: gender,
    });
    
    // Set user properties for segmentation
    if (age || gender) {
      UserProperties.setDemographics(age || 'not_provided', gender || 'not_provided');
    }

    // Navigate to personalize with name
    router.push({
      pathname: '/(onboarding)/personalize',
      params: { name: name.trim() },
    });
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
      <View style={styles.container}>
        {/* Progress Bar - Step 3 of 6 */}
        <OnboardingProgressBar currentStep={3} totalSteps={6} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
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
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <Text style={styles.sectionLabel}>LET'S GET TO KNOW YOU</Text>
          <Text style={styles.questionTitle}>What should we call you?</Text>
          
          <TextInput
            style={styles.nameInput}
            placeholder="Your name"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={30}
          />
        </Animated.View>

        {/* Age Range */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.section}>
          <Text style={styles.questionSubtitle}>How old are you? (optional)</Text>
          
          <View style={styles.ageGrid}>
            {AGE_RANGES.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeIn.delay(500 + index * 50).duration(300)}
              >
                <TouchableOpacity
                  style={[
                    styles.ageChip,
                    age === item.id && styles.ageChipSelected,
                  ]}
                  onPress={() => setAge(age === item.id ? '' : item.id)}
                >
                  <Text
                    style={[
                      styles.ageChipText,
                      age === item.id && styles.ageChipTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Gender */}
        <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.section}>
          <Text style={styles.questionSubtitle}>How do you identify? (optional)</Text>
          
          <View style={styles.genderOptions}>
            {GENDERS.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeIn.delay(700 + index * 50).duration(300)}
              >
                <TouchableOpacity
                  style={[
                    styles.genderCard,
                    gender === item.id && styles.genderCardSelected,
                  ]}
                  onPress={() => setGender(gender === item.id ? '' : item.id)}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={24}
                    color={gender === item.id ? COLORS.primary : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.genderLabel,
                      gender === item.id && styles.genderLabelSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {gender === item.id && (
                    <View style={styles.checkIcon}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Privacy note */}
        <Animated.View entering={FadeIn.delay(900).duration(500)} style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" />
          <Text style={styles.privacyText}>
            Your information is private and helps us personalize your experience.
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <Animated.View
        entering={FadeInUp.delay(800).duration(500)}
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
  sectionLabel: {
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
    marginBottom: 16,
  },
  questionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
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
  section: {
    marginTop: 32,
  },
  ageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ageChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ageChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
  },
  ageChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  ageChipTextSelected: {
    color: COLORS.primary,
  },
  genderOptions: {
    gap: 12,
  },
  genderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
  },
  genderLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 12,
  },
  genderLabelSelected: {
    color: COLORS.primary,
  },
  checkIcon: {
    marginLeft: 8,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 8,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
