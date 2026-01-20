// components/OnboardingProgressBar.tsx
// Progress bar para onboarding - Impacto: 74% → 83% completion (Arthur)

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../constants/brand';

interface OnboardingProgressBarProps {
  currentStep: number;
  totalSteps: number;
  showStepText?: boolean;
}

export default function OnboardingProgressBar({
  currentStep,
  totalSteps,
  showStepText = false, // Default to false - progress bar is sufficient
}: OnboardingProgressBarProps) {
  const progress = currentStep / totalSteps;

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: withSpring(`${progress * 100}%`, {
      damping: 15,
      stiffness: 100,
    }),
  }));

  return (
    <View style={styles.container}>
      {showStepText && (
        <Text style={styles.stepText}>
          Step {currentStep} of {totalSteps}
        </Text>
      )}
      <View style={styles.barContainer}>
        <Animated.View style={[styles.barFill, animatedBarStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  stepText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  barContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
});
