// app/(onboarding)/solution.tsx - "The Solution" Screen
// Show how Unbind solves the problem

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { COLORS } from '../../constants/brand';
import { OnboardingEvents } from '../../services/analytics';

const STEPS = [
  {
    id: 'speak',
    icon: 'mic',
    title: 'Speak',
    description: 'Talk about what\'s on your mind',
    color: COLORS.primary,
    bgColor: '#EEF2FF',
  },
  {
    id: 'process',
    icon: 'sparkles',
    title: 'AI processes',
    description: 'Our AI understands and organizes',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  {
    id: 'act',
    icon: 'checkbox',
    title: 'Act',
    description: 'Get micro-tasks you can actually do',
    color: '#10B981',
    bgColor: '#D1FAE5',
  },
];

export default function SolutionScreen() {
  const router = useRouter();
  
  // Animated values for the flow arrows
  const arrow1Opacity = useSharedValue(0);
  const arrow2Opacity = useSharedValue(0);
  
  // Pulsing mic icon
  const micScale = useSharedValue(1);
  
  useEffect(() => {
    // Track screen view
    OnboardingEvents.solutionScreenViewed();
    
    // Animate arrows appearing in sequence
    arrow1Opacity.value = withDelay(800, withTiming(1, { duration: 400 }));
    arrow2Opacity.value = withDelay(1000, withTiming(1, { duration: 400 }));
    
    // Gentle pulse for mic icon
    micScale.value = withDelay(1200, withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    ));
  }, []);

  const arrow1Style = useAnimatedStyle(() => ({
    opacity: arrow1Opacity.value,
  }));

  const arrow2Style = useAnimatedStyle(() => ({
    opacity: arrow2Opacity.value,
  }));
  
  const micStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const handleContinue = () => {
    OnboardingEvents.stepCompleted(2, 'solution');
    router.push('/(onboarding)/demographics');
  };

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <OnboardingProgressBar currentStep={2} totalSteps={4} />

      {/* Header */}
      <View style={styles.header}>
        <Animated.Text
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.title}
        >
          What if you could{'\n'}untangle your thoughts{'\n'}in 2 minutes?
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(200).duration(500)}
          style={styles.subtitle}
        >
          Unbind turns your voice into clarity and action
        </Animated.Text>
      </View>

      {/* Steps Flow */}
      <View style={styles.stepsContainer}>
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <Animated.View
              entering={SlideInRight.delay(400 + index * 200).duration(400).springify()}
              style={styles.stepWrapper}
            >
              <View style={styles.stepCard}>
                <Animated.View 
                  style={[
                    styles.stepIcon, 
                    { backgroundColor: step.bgColor },
                    index === 0 ? micStyle : undefined
                  ]}
                >
                  <Ionicons name={step.icon as any} size={28} color={step.color} />
                </Animated.View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            </Animated.View>
            
            {/* Arrow between steps */}
            {index < STEPS.length - 1 && (
              <Animated.View
                style={[styles.arrowContainer, index === 0 ? arrow1Style : arrow2Style]}
              >
                <Ionicons name="arrow-down" size={20} color="#D1D5DB" />
              </Animated.View>
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Social Proof */}
      <Animated.View
        entering={FadeIn.delay(1200).duration(400)}
        style={styles.socialProof}
      >
        <View style={styles.avatarStack}>
          <View style={[styles.avatar, styles.avatar1]}>
            <Ionicons name="person" size={14} color="#FFFFFF" />
          </View>
          <View style={[styles.avatar, styles.avatar2]}>
            <Ionicons name="person" size={14} color="#FFFFFF" />
          </View>
          <View style={[styles.avatar, styles.avatar3]}>
            <Ionicons name="person" size={14} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.socialProofText}>
          Join 10,000+ users who beat procrastination daily
        </Text>
      </Animated.View>

      {/* Footer */}
      <Animated.View
        entering={FadeInUp.delay(1400).duration(500)}
        style={styles.footer}
      >
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Show me how</Text>
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
  header: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: '#6B7280',
    lineHeight: 24,
  },
  stepsContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepWrapper: {
    marginBottom: 4,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 20,
  },
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatar1: {
    backgroundColor: COLORS.primary,
    zIndex: 3,
  },
  avatar2: {
    backgroundColor: '#F59E0B',
    marginLeft: -10,
    zIndex: 2,
  },
  avatar3: {
    backgroundColor: '#10B981',
    marginLeft: -10,
    zIndex: 1,
  },
  socialProofText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 16,
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
