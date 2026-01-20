// app/(onboarding)/notifications-declined.tsx - Reconsideration Screen
// Shown when user declines notifications - one more chance to convert

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/brand';
import { requestPermissions, enableNotifications, checkPermissions } from '../../services/notifications';
import posthog from '../../posthog';

export default function NotificationsDeclinedScreen() {
  const router = useRouter();
  
  // Sad animation
  const iconY = useSharedValue(0);

  useEffect(() => {
    posthog.capture('notification_declined_screen_shown');
    
    // Gentle bounce animation
    iconY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconY.value }],
  }));

  const handleEnableNotifications = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const hasPermission = await checkPermissions();
      
      if (hasPermission) {
        await enableNotifications();
        posthog.capture('notification_declined_reconsidered');
        router.replace('/(onboarding)/commitment');
        return;
      }
      
      // Try requesting again or open settings
      const granted = await requestPermissions();
      
      if (granted) {
        await enableNotifications();
        posthog.capture('notification_declined_reconsidered');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(onboarding)/commitment');
      } else {
        // Permission still denied, offer to open settings
        Alert.alert(
          'Enable in Settings',
          'To receive reminders, please enable notifications in your device settings.',
          [
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings();
              },
            },
            {
              text: 'Continue without',
              style: 'cancel',
              onPress: () => {
                router.replace('/(onboarding)/commitment');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error:', error);
      router.replace('/(onboarding)/commitment');
    }
  };

  const handleContinueWithout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    posthog.capture('notification_declined_confirmed');
    router.replace('/(onboarding)/commitment');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(500)} 
          style={styles.iconContainer}
        >
          <Animated.View style={[styles.iconCircle, iconStyle]}>
            <Ionicons name="notifications-off" size={56} color="#9CA3AF" />
          </Animated.View>
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.header}>
          <Text style={styles.title}>Are you sure?</Text>
          <Text style={styles.subtitle}>
            Without reminders, it's easy to forget to check in and lose your progress.
          </Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeIn.delay(400).duration(500)} style={styles.statsCard}>
          <View style={styles.statRow}>
            <Ionicons name="trending-down" size={24} color="#EF4444" />
            <Text style={styles.statText}>
              <Text style={styles.statHighlight}>73%</Text> of users without notifications forget to use the app
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <Ionicons name="flame-outline" size={24} color="#F59E0B" />
            <Text style={styles.statText}>
              Average streak without reminders: <Text style={styles.statHighlight}>2 days</Text>
            </Text>
          </View>
        </Animated.View>

        {/* What you'll miss */}
        <Animated.View entering={FadeIn.delay(600).duration(500)} style={styles.missContainer}>
          <Text style={styles.missTitle}>What you'll miss:</Text>
          <View style={styles.missItem}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={styles.missText}>Streak protection reminders</Text>
          </View>
          <View style={styles.missItem}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={styles.missText}>Daily clarity prompts</Text>
          </View>
          <View style={styles.missItem}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={styles.missText}>Progress celebrations</Text>
          </View>
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View entering={FadeInUp.delay(800).duration(500)} style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleEnableNotifications}
        >
          <Ionicons name="notifications" size={22} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Enable notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleContinueWithout}
        >
          <Text style={styles.secondaryButtonText}>Continue without notifications</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  statsCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  statHighlight: {
    fontWeight: '700',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#FECACA',
    marginVertical: 16,
  },
  missContainer: {
    gap: 12,
  },
  missTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  missItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  missText: {
    fontSize: 15,
    color: '#6B7280',
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
