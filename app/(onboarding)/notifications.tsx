// app/(onboarding)/notifications.tsx - Notification Benefits Pre-Prompt
// Show benefits BEFORE requesting system permission to increase opt-in rate

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/brand';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import UnbindLogo from '../../components/UnbindLogo';
import { requestPermissions, checkPermissions, enableNotifications } from '../../services/notifications';
import posthog from '../../posthog';

interface Benefit {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
}

const BENEFITS: Benefit[] = [
  {
    id: 'streak',
    icon: 'flame',
    title: 'Keep your streak alive',
    subtitle: "We'll remind you before you lose your progress",
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  {
    id: 'clarity',
    icon: 'sunny',
    title: 'Daily clarity reminders',
    subtitle: 'Start each day focused and intentional',
    color: '#6366F1',
    bgColor: '#EEF2FF',
  },
  {
    id: 'control',
    icon: 'settings',
    title: "You're in control",
    subtitle: 'Customize when and how often',
    color: '#10B981',
    bgColor: '#D1FAE5',
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const [isRequesting, setIsRequesting] = useState(false);
  
  // Animated notification bell
  const bellRotation = useSharedValue(0);
  const bellScale = useSharedValue(1);

  useEffect(() => {
    // Track screen view
    posthog.capture('notification_benefits_shown');
    
    // Bell animation
    bellRotation.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withTiming(-15, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(0, { duration: 100 }),
        withDelay(2000, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );
    
    bellScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 200 }),
        withDelay(2000, withTiming(1, { duration: 0 }))
      ),
      -1,
      false
    );
  }, []);

  const bellStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${bellRotation.value}deg` },
      { scale: bellScale.value },
    ],
  }));

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const hasPermission = await checkPermissions();
      
      if (hasPermission) {
        // Already have permission, enable notifications
        await enableNotifications();
        posthog.capture('notification_accepted');
        router.push('/(onboarding)/commitment');
        return;
      }
      
      // Request system permission
      const granted = await requestPermissions();
      
      if (granted) {
        await enableNotifications();
        posthog.capture('notification_accepted');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push('/(onboarding)/commitment');
      } else {
        // Permission denied, show reconsideration screen
        posthog.capture('notification_declined');
        router.push('/(onboarding)/notifications-declined');
      }
    } catch (error) {
      console.error('Error requesting notifications:', error);
      // Still proceed on error
      router.push('/(onboarding)/commitment');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleMaybeLater = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    posthog.capture('notification_declined');
    router.push('/(onboarding)/notifications-declined');
  };

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <OnboardingProgressBar currentStep={5} totalSteps={6} />

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

        {/* Animated Bell Icon */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(500)} 
          style={styles.iconContainer}
        >
          <Animated.View style={[styles.bellCircle, bellStyle]}>
            <Ionicons name="notifications" size={48} color={COLORS.primary} />
          </Animated.View>
          {/* Notification badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>1</Text>
          </View>
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.header}>
          <Text style={styles.title}>Stay on track</Text>
          <Text style={styles.subtitle}>
            Get gentle reminders to keep your momentum going
          </Text>
        </Animated.View>

        {/* Benefits */}
        <View style={styles.benefitsList}>
          {BENEFITS.map((benefit, index) => (
            <Animated.View
              key={benefit.id}
              entering={FadeIn.delay(500 + index * 100).duration(400)}
            >
              <View style={styles.benefitCard}>
                <View style={[styles.benefitIcon, { backgroundColor: benefit.bgColor }]}>
                  <Ionicons name={benefit.icon as any} size={24} color={benefit.color} />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitSubtitle}>{benefit.subtitle}</Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <Animated.View entering={FadeInUp.delay(900).duration(500)} style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isRequesting && styles.buttonDisabled]}
          onPress={handleEnableNotifications}
          disabled={isRequesting}
        >
          <Ionicons name="notifications" size={22} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>
            {isRequesting ? 'Enabling...' : 'Enable notifications'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleMaybeLater}
          disabled={isRequesting}
        >
          <Text style={styles.secondaryButtonText}>Maybe later</Text>
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  bellCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: '35%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  benefitsList: {
    gap: 12,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  benefitSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 16,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500',
  },
});
