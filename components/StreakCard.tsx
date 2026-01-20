// components/StreakCard.tsx - Streak Tracker like Duolingo
// Shows current streak with fire animation and weekly calendar

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

interface StreakCardProps {
  streak: number;
  lastSessionDate?: string;
  compact?: boolean;
}

export default function StreakCard({ streak, lastSessionDate, compact = false }: StreakCardProps) {
  const { colors } = useTheme();
  const [weekDays, setWeekDays] = useState<{ day: string; completed: boolean; isToday: boolean }[]>([]);
  
  const fireScale = useSharedValue(1);
  const fireGlow = useSharedValue(0);

  useEffect(() => {
    // Calculate week days
    const today = new Date();
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
      const isToday = i === 0;
      
      // Check if this day had a session (simplified - in real app, check actual data)
      const dateStr = date.toISOString().split('T')[0];
      const lastDate = lastSessionDate ? new Date(lastSessionDate).toISOString().split('T')[0] : null;
      const completed = lastDate === dateStr || (streak > i && i < streak);
      
      days.push({ day: dayName, completed, isToday });
    }
    
    setWeekDays(days);
  }, [streak, lastSessionDate]);

  useEffect(() => {
    if (streak > 0) {
      // Fire animation
      fireScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      
      // Glow animation
      fireGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.5, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [streak]);

  const fireStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fireScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: fireGlow.value,
  }));

  // Fire color based on streak
  const fireColor = streak > 0 ? '#F97316' : colors.textMuted;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactFireContainer}>
          {streak > 0 ? (
            <Animated.View style={fireStyle}>
              <Ionicons name="flame" size={24} color="#F97316" />
            </Animated.View>
          ) : (
            <Ionicons name="flame-outline" size={24} color={colors.textMuted} />
          )}
        </View>
        <Text style={[styles.compactNumber, { color: streak > 0 ? '#F97316' : colors.textMuted }]}>
          {streak}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.fireContainer}>
          {streak > 0 && (
            <Animated.View style={[styles.fireGlow, glowStyle]} />
          )}
          <Animated.View style={fireStyle}>
            <Ionicons 
              name={streak > 0 ? "flame" : "flame-outline"} 
              size={48} 
              color={fireColor} 
            />
          </Animated.View>
        </View>
        
        <View style={styles.streakInfo}>
          <Text style={[styles.streakNumber, { color: colors.text }]}>{streak}</Text>
          <Text style={[styles.streakLabel, { color: colors.textMuted }]}>day streak</Text>
        </View>
      </View>

      {/* Weekly calendar */}
      <View style={[styles.weekContainer, { borderTopColor: colors.borderLight }]}>
        {weekDays.map((day, index) => (
          <View key={index} style={styles.dayColumn}>
            <Text style={[
              styles.dayLabel, 
              { color: colors.textMuted },
              day.isToday && { color: colors.primary, fontWeight: '600' }
            ]}>
              {day.day}
            </Text>
            <View
              style={[
                styles.dayCircle,
                { backgroundColor: colors.borderLight },
                day.completed && styles.dayCircleCompleted,
                day.isToday && { borderWidth: 2, borderColor: colors.primary },
              ]}
            >
              {day.completed && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Motivation */}
      {streak === 0 && (
        <Text style={[styles.motivation, { color: colors.textMuted }]}>
          Start your streak today!
        </Text>
      )}
      {streak > 0 && streak < 7 && (
        <Text style={[styles.motivation, { color: colors.textMuted }]}>
          Keep it going! {7 - streak} more days to a week streak
        </Text>
      )}
      {streak >= 7 && (
        <Text style={[styles.motivation, { color: colors.textMuted }]}>
          Amazing! You're on fire!
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  fireContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fireGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FED7AA',
  },
  streakInfo: {
    marginLeft: 16,
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
  },
  streakLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: -2,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleCompleted: {
    backgroundColor: '#10B981',
  },
  motivation: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactFireContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F97316',
  },
});
