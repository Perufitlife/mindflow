// components/AchievementToast.tsx - Achievement Unlocked Toast
// Dopamine hit when user unlocks an achievement

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Achievement } from '../services/achievements';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AchievementToastProps {
  achievement: Achievement;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export default function AchievementToast({
  achievement,
  onDismiss,
  autoDismissMs = 4000,
}: AchievementToastProps) {
  const iconScale = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const sparkle = useSharedValue(0);

  useEffect(() => {
    // Initial celebration
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Icon pop animation
    iconScale.value = withSequence(
      withSpring(1.3, { damping: 4, stiffness: 200 }),
      withSpring(1, { damping: 6 })
    );
    
    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 500 }),
        withTiming(0.2, { duration: 500 })
      ),
      3,
      true
    );
    
    // Sparkle
    sparkle.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(500, withTiming(0, { duration: 300 }))
    );
    
    // Auto dismiss
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View
      entering={SlideInUp.springify().damping(15)}
      exiting={SlideOutUp.duration(300)}
      style={styles.container}
    >
      <TouchableOpacity 
        style={styles.toast}
        activeOpacity={0.9}
        onPress={onDismiss}
      >
        {/* Glow background */}
        <Animated.View 
          style={[
            styles.glow, 
            { backgroundColor: achievement.color },
            glowStyle
          ]} 
        />

        {/* Icon */}
        <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
          <View style={[styles.iconCircle, { backgroundColor: achievement.color + '20' }]}>
            <Ionicons name={achievement.icon as any} size={32} color={achievement.color} />
          </View>
        </Animated.View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.label}>ACHIEVEMENT UNLOCKED</Text>
            <Text style={styles.xp}>+{achievement.xp} XP</Text>
          </View>
          <Text style={styles.name}>{achievement.name}</Text>
          <Text style={styles.description}>{achievement.description}</Text>
        </View>

        {/* Dismiss hint */}
        <Ionicons name="close" size={20} color="#9CA3AF" style={styles.closeIcon} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  iconContainer: {
    marginRight: 14,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1,
  },
  xp: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
  },
  closeIcon: {
    marginLeft: 8,
  },
});
