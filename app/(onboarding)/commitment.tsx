// app/(onboarding)/commitment.tsx - Personal Commitment Screen
// Psicología: Principio de Consistencia (Cialdini) - Compromiso explícito aumenta adherencia

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/brand';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import UnbindLogo from '../../components/UnbindLogo';
import { CommitmentEvents, OnboardingEvents } from '../../services/analytics';

const HOLD_DURATION = 3000; // 3 seconds
const HAPTIC_CHECKPOINTS = [0.25, 0.5, 0.75, 1.0];

export default function CommitmentScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userChallenge, setUserChallenge] = useState('');
  const [isHolding, setIsHolding] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hapticIndex, setHapticIndex] = useState(0);
  
  const holdProgress = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const logoAnimation = useState<'breathing' | 'pulse' | 'success'>('breathing');
  const holdStartTime = useRef<number>(0);
  const holdInterval = useRef<NodeJS.Timeout | null>(null);

  // Sparkle animations for celebration
  const sparkle1 = useSharedValue(0);
  const sparkle2 = useSharedValue(0);
  const sparkle3 = useSharedValue(0);

  useEffect(() => {
    loadUserData();
    CommitmentEvents.shown();
  }, []);

  async function loadUserData() {
    try {
      const [name, challenge] = await Promise.all([
        AsyncStorage.getItem('@user_name'),
        AsyncStorage.getItem('@user_challenge'),
      ]);
      setUserName(name || 'friend');
      setUserChallenge(challenge || 'overwhelmed');
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  }

  const getChallengeText = () => {
    switch (userChallenge) {
      case 'overwhelmed':
        return 'clear my overwhelmed mind';
      case 'procrastination':
        return 'beat procrastination';
      case 'focus':
        return 'improve my focus';
      case 'anxiety':
        return 'reduce my anxiety';
      default:
        return 'take action on what matters';
    }
  };

  const triggerHaptic = (progress: number) => {
    if (progress >= HAPTIC_CHECKPOINTS[hapticIndex]) {
      if (hapticIndex < 3) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setHapticIndex(prev => prev + 1);
    }
  };

  const handleHoldStart = () => {
    if (isComplete) return;
    
    setIsHolding(true);
    setHapticIndex(0);
    holdStartTime.current = Date.now();
    CommitmentEvents.holdStarted();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate progress
    holdProgress.value = withTiming(1, {
      duration: HOLD_DURATION,
      easing: Easing.linear,
    });
    
    // Pulsing ring animation
    ringScale.value = withSequence(
      withTiming(1.05, { duration: 300 }),
      withTiming(1, { duration: 300 }),
    );
    
    // Start interval for haptic feedback
    holdInterval.current = setInterval(() => {
      const elapsed = Date.now() - holdStartTime.current;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);
      triggerHaptic(progress);
      
      if (progress >= 1) {
        handleHoldComplete();
      }
    }, 100);
  };

  const handleHoldEnd = () => {
    if (isComplete) return;
    
    setIsHolding(false);
    
    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      holdInterval.current = null;
    }
    
    // If not complete, reset progress
    if (holdProgress.value < 1) {
      holdProgress.value = withTiming(0, { duration: 200 });
      setHapticIndex(0);
    }
  };

  const handleHoldComplete = () => {
    if (isComplete) return;
    
    setIsComplete(true);
    setIsHolding(false);
    
    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      holdInterval.current = null;
    }
    
    const holdTime = Date.now() - holdStartTime.current;
    CommitmentEvents.completed(holdTime);
    OnboardingEvents.stepCompleted(5, 'commitment');
    
    // Trigger success animations
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Sparkle animations
    sparkle1.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(500, withTiming(0, { duration: 300 }))
    );
    sparkle2.value = withDelay(100, withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(500, withTiming(0, { duration: 300 }))
    ));
    sparkle3.value = withDelay(200, withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(500, withTiming(0, { duration: 300 }))
    ));
    
    // Save commitment date
    AsyncStorage.setItem('@commitment_date', new Date().toISOString());
    
    // Navigate after celebration
    setTimeout(() => {
      router.replace('/(tabs)/record');
    }, 1500);
  };

  const handleSkip = () => {
    CommitmentEvents.skipped();
    router.replace('/(tabs)/record');
  };

  // Animated styles
  const progressCircleStyle = useAnimatedStyle(() => {
    const strokeDashoffset = interpolate(
      holdProgress.value,
      [0, 1],
      [251.2, 0] // Circumference of circle with r=40
    );
    return {
      strokeDashoffset,
    };
  });

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const sparkle1Style = useAnimatedStyle(() => ({
    opacity: sparkle1.value,
    transform: [
      { scale: sparkle1.value },
      { translateX: interpolate(sparkle1.value, [0, 1], [0, -50]) },
      { translateY: interpolate(sparkle1.value, [0, 1], [0, -50]) },
    ],
  }));

  const sparkle2Style = useAnimatedStyle(() => ({
    opacity: sparkle2.value,
    transform: [
      { scale: sparkle2.value },
      { translateX: interpolate(sparkle2.value, [0, 1], [0, 50]) },
      { translateY: interpolate(sparkle2.value, [0, 1], [0, -30]) },
    ],
  }));

  const sparkle3Style = useAnimatedStyle(() => ({
    opacity: sparkle3.value,
    transform: [
      { scale: sparkle3.value },
      { translateY: interpolate(sparkle3.value, [0, 1], [0, 60]) },
    ],
  }));

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <OnboardingProgressBar currentStep={6} totalSteps={6} />

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
          <Text style={styles.title}>Make it official</Text>
        </Animated.View>

        {/* Commitment Text */}
        <Animated.View entering={FadeIn.delay(400).duration(500)} style={styles.commitmentCard}>
          <Text style={styles.commitmentText}>
            "I, <Text style={styles.nameHighlight}>{userName}</Text>, commit to taking 2 minutes each day to {getChallengeText()} and take action on what matters most."
          </Text>
        </Animated.View>

        {/* Hold Circle */}
        <Animated.View 
          entering={FadeInUp.delay(600).duration(500)} 
          style={styles.holdContainer}
        >
          {/* Sparkles */}
          <Animated.View style={[styles.sparkle, sparkle1Style]}>
            <Ionicons name="sparkles" size={24} color="#F59E0B" />
          </Animated.View>
          <Animated.View style={[styles.sparkle, sparkle2Style]}>
            <Ionicons name="star" size={20} color="#10B981" />
          </Animated.View>
          <Animated.View style={[styles.sparkle, sparkle3Style]}>
            <Ionicons name="heart" size={22} color="#EF4444" />
          </Animated.View>

          <Animated.View style={[styles.holdRing, ringAnimatedStyle]}>
            {/* Background circle */}
            <View style={styles.holdCircleBg} />
            
            {/* Progress SVG simulation using View */}
            <View style={styles.progressContainer}>
              <Animated.View 
                style={[
                  styles.progressArc,
                  useAnimatedStyle(() => ({
                    opacity: holdProgress.value > 0 ? 1 : 0,
                    transform: [{ rotate: `${holdProgress.value * 360}deg` }],
                  })),
                ]} 
              />
            </View>

            {/* Hold button */}
            <Pressable
              onPressIn={handleHoldStart}
              onPressOut={handleHoldEnd}
              style={[
                styles.holdButton,
                isHolding && styles.holdButtonActive,
                isComplete && styles.holdButtonComplete,
              ]}
            >
              {isComplete ? (
                <UnbindLogo size={60} animation="success" showGlow />
              ) : (
                <View style={styles.holdButtonContent}>
                  <Ionicons 
                    name={isHolding ? "finger-print" : "hand-left"} 
                    size={40} 
                    color={isHolding ? COLORS.primary : '#6B7280'} 
                  />
                  <Text style={[
                    styles.holdText,
                    isHolding && styles.holdTextActive,
                  ]}>
                    {isHolding ? 'Keep holding...' : 'Hold to commit'}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Outer progress ring */}
            <Animated.View 
              style={[
                styles.progressRing,
                useAnimatedStyle(() => ({
                  borderColor: interpolate(
                    holdProgress.value,
                    [0, 0.5, 1],
                    [0, 0.5, 1]
                  ) > 0.5 ? COLORS.primary : '#E5E7EB',
                  borderWidth: interpolate(holdProgress.value, [0, 1], [3, 6]),
                })),
              ]} 
            />
          </Animated.View>

          {/* Progress indicator */}
          <Animated.Text 
            style={[
              styles.progressPercent,
              useAnimatedStyle(() => ({
                opacity: holdProgress.value > 0 ? 1 : 0,
              })),
            ]}
          >
            <Animated.Text>
              {/* This will be updated by the animation */}
            </Animated.Text>
          </Animated.Text>
        </Animated.View>

        {/* Social proof */}
        <Animated.View entering={FadeIn.delay(800).duration(500)} style={styles.socialProof}>
          <Ionicons name="trending-up" size={18} color="#10B981" />
          <Text style={styles.socialProofText}>
            People who commit are 3x more likely to succeed
          </Text>
        </Animated.View>
      </View>

      {/* Skip option */}
      <Animated.View entering={FadeInUp.delay(1000).duration(500)} style={styles.footer}>
        {isComplete ? (
          <Text style={styles.completeText}>You're committed! Let's go...</Text>
        ) : (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
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
    alignItems: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  commitmentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 32,
  },
  commitmentText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 28,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  nameHighlight: {
    color: COLORS.primary,
    fontWeight: '700',
    fontStyle: 'normal',
  },
  holdContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
  },
  sparkle: {
    position: 'absolute',
    zIndex: 10,
  },
  holdRing: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  holdCircleBg: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F3F4F6',
  },
  progressContainer: {
    position: 'absolute',
    width: 180,
    height: 180,
  },
  progressArc: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: COLORS.primary,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
  },
  progressRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  holdButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 5,
  },
  holdButtonActive: {
    backgroundColor: '#EEF2FF',
    transform: [{ scale: 0.98 }],
  },
  holdButtonComplete: {
    backgroundColor: '#D1FAE5',
  },
  holdButtonContent: {
    alignItems: 'center',
    gap: 8,
  },
  holdText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  holdTextActive: {
    color: COLORS.primary,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 16,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
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
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  completeText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
});
