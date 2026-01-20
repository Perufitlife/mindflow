// app/(onboarding)/commit.tsx - Commitment Psychology Screen
// Simplified version without GestureDetector for better compatibility

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants/brand';
import { CommitmentEvents } from '../../services/analytics';

export default function CommitScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    transcript?: string;
    tasks?: string;
    mood?: string;
  }>();

  const [isComplete, setIsComplete] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [userName, setUserName] = useState('Friend');
  const [challenge, setChallenge] = useState('clear my mind');
  
  const progress = useSharedValue(0);
  const circleScale = useSharedValue(1);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load user data from AsyncStorage
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const name = await AsyncStorage.getItem('@user_name');
        const userChallenge = await AsyncStorage.getItem('@user_challenge');
        if (name) setUserName(name);
        if (userChallenge) setChallenge(userChallenge);
      } catch (e) {
        console.error('Error loading user data:', e);
      }
    };
    loadUserData();
    CommitmentEvents.shown();
  }, []);

  const challengeText: Record<string, string> = {
    overwhelmed: 'clear my overwhelmed mind',
    procrastination: 'beat procrastination',
    focus: 'improve my focus',
    anxiety: 'reduce my anxiety',
  };

  const handleComplete = () => {
    setIsComplete(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    CommitmentEvents.completed(2000); // 2 seconds hold time
    
    // Navigate to paywall after a short delay
    setTimeout(() => {
      router.replace({
        pathname: '/(onboarding)/paywall',
        params: {
          transcript: params.transcript || '',
          tasks: params.tasks || '[]',
          mood: params.mood || '',
        },
      });
    }, 800);
  };

  const handlePressIn = () => {
    if (isComplete) return;
    
    setIsHolding(true);
    circleScale.value = withSpring(0.95);
    progress.value = withTiming(1, { duration: 2000 });
    
    // Haptic feedback at start
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    CommitmentEvents.holdStarted();
    
    // Set timer for 2 seconds
    holdTimerRef.current = setTimeout(() => {
      handleComplete();
    }, 2000);
  };

  const handlePressOut = () => {
    if (isComplete) return;
    
    setIsHolding(false);
    circleScale.value = withSpring(1);
    progress.value = withTiming(0, { duration: 300 });
    
    // Clear timer if released early
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, []);

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.3,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.header}>
        <Text style={styles.title}>Make a commitment</Text>
        <Text style={styles.subtitle}>
          Committing to goals boosts motivation and follow-through
        </Text>
      </Animated.View>

      {/* Commitment Card */}
      <Animated.View entering={FadeIn.delay(300).duration(500)} style={styles.commitCard}>
        <Text style={styles.commitText}>
          I, <Text style={styles.commitName}>{userName}</Text>, will use Unbind to{' '}
          <Text style={styles.commitGoal}>{challengeText[challenge] || 'clear my mind'}</Text> and take control of my day.
        </Text>
      </Animated.View>

      {/* Hold to Commit Circle */}
      <Animated.View entering={FadeIn.delay(500).duration(500)} style={styles.circleContainer}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isComplete}
        >
          <Animated.View style={[styles.commitCircle, animatedCircleStyle]}>
            {/* Progress ring */}
            <Animated.View style={[styles.progressRing, animatedProgressStyle]} />
            
            {/* Center content */}
            <View style={styles.circleContent}>
              {isComplete ? (
                <>
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                  <Text style={styles.circleText}>Committed!</Text>
                </>
              ) : (
                <>
                  <Ionicons 
                    name={isHolding ? "finger-print" : "finger-print-outline"} 
                    size={48} 
                    color={isHolding ? COLORS.primary : '#6B7280'} 
                  />
                  <Text style={[styles.circleText, isHolding && styles.circleTextActive]}>
                    {isHolding ? 'Keep holding...' : 'Hold to commit'}
                  </Text>
                </>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>

        <Text style={styles.holdHint}>
          {isComplete ? 'Great job!' : 'Press and hold for 2 seconds'}
        </Text>
      </Animated.View>

      {/* Motivation quote */}
      <Animated.View entering={FadeInUp.delay(700).duration(500)} style={styles.quoteContainer}>
        <Ionicons name="sparkles" size={20} color="#F59E0B" />
        <Text style={styles.quoteText}>
          "The secret of getting ahead is getting started."
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  commitCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commitText: {
    fontSize: 20,
    color: '#374151',
    lineHeight: 32,
    textAlign: 'center',
  },
  commitName: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  commitGoal: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  circleContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  commitCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#E5E7EB',
    position: 'relative',
    overflow: 'hidden',
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 90,
  },
  circleContent: {
    alignItems: 'center',
    gap: 8,
  },
  circleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  circleTextActive: {
    color: COLORS.primary,
  },
  holdHint: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 16,
  },
  quoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 50,
  },
  quoteText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
