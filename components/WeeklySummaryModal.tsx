// components/WeeklySummaryModal.tsx - Weekly Progress Summary Modal
// Duolingo-style weekly recap for retention

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { COLORS } from '../constants/brand';
import { WeeklySummary, markWeeklySummaryShown, saveWeeklySummary } from '../services/weekly-summary';
import UnbindLogo from './UnbindLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WeeklySummaryModalProps {
  visible: boolean;
  summary: WeeklySummary;
  onClose: () => void;
}

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  color: string;
  delay: number;
}

function StatCard({ icon, value, label, color, delay }: StatCardProps) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.statCard, animatedStyle]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

export default function WeeklySummaryModal({ visible, summary, onClose }: WeeklySummaryModalProps) {
  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Save and mark as shown
      markWeeklySummaryShown();
      saveWeeklySummary(summary);
    }
  }, [visible]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const getImprovementText = () => {
    if (summary.improvement > 0) {
      return `${summary.improvement}% more than last week!`;
    } else if (summary.improvement < 0) {
      return `${Math.abs(summary.improvement)}% less than last week`;
    }
    return 'Same as last week';
  };

  const getImprovementColor = () => {
    if (summary.improvement > 0) return '#10B981';
    if (summary.improvement < 0) return '#F59E0B';
    return '#6B7280';
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          entering={SlideInUp.springify().damping(15)}
          style={styles.container}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
            <UnbindLogo size={56} animation="success" showGlow />
            <Text style={styles.title}>Your Week in Review</Text>
            <Text style={styles.subtitle}>
              {new Date(summary.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(summary.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </Animated.View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="mic"
              value={summary.sessions}
              label="Sessions"
              color={COLORS.primary}
              delay={200}
            />
            <StatCard
              icon="checkmark-done"
              value={summary.tasksCompleted}
              label="Tasks Done"
              color="#10B981"
              delay={300}
            />
            <StatCard
              icon="flame"
              value={summary.streak}
              label="Day Streak"
              color="#F59E0B"
              delay={400}
            />
            <StatCard
              icon="time"
              value={`${summary.minutesSaved}m`}
              label="Time Saved"
              color="#8B5CF6"
              delay={500}
            />
          </View>

          {/* Improvement Indicator */}
          <Animated.View 
            entering={FadeIn.delay(600).duration(400)} 
            style={[styles.improvementCard, { borderColor: getImprovementColor() }]}
          >
            <Ionicons 
              name={summary.improvement >= 0 ? 'trending-up' : 'trending-down'} 
              size={24} 
              color={getImprovementColor()} 
            />
            <Text style={[styles.improvementText, { color: getImprovementColor() }]}>
              {getImprovementText()}
            </Text>
          </Animated.View>

          {/* Insights */}
          <Animated.View entering={FadeInUp.delay(700).duration(400)} style={styles.insightsContainer}>
            <Text style={styles.insightsTitle}>Insights</Text>
            {summary.insights.slice(0, 3).map((insight, index) => (
              <View key={index} style={styles.insightRow}>
                <Ionicons name="sparkles" size={16} color={COLORS.primary} />
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </Animated.View>

          {/* CTA */}
          <Animated.View entering={FadeInUp.delay(900).duration(400)} style={styles.footer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleClose}>
              <Text style={styles.primaryButtonText}>Keep Going!</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  improvementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
  },
  improvementText: {
    fontSize: 15,
    fontWeight: '600',
  },
  insightsContainer: {
    marginBottom: 20,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  footer: {
    marginTop: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
