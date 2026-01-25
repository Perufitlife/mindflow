// components/BlurredCard.tsx
// Blurred content overlay for preview mode - shows locked content with blur effect

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../constants/brand';

interface BlurredCardProps {
  children: React.ReactNode;
  isLocked: boolean;
  onUnlock: () => void;
  unlockText?: string;
  showIcon?: boolean;
  blurIntensity?: number;
}

export function BlurredCard({
  children,
  isLocked,
  onUnlock,
  unlockText = 'Tap to unlock',
  showIcon = true,
  blurIntensity = 15,
}: BlurredCardProps) {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onUnlock}
      style={styles.container}
    >
      {/* Content underneath (will be blurred) */}
      <View style={styles.contentWrapper}>
        {children}
      </View>

      {/* Blur overlay */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={blurIntensity}
          tint="light"
          style={styles.blurOverlay}
        >
          <View style={styles.lockContent}>
            {showIcon && (
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed" size={20} color={COLORS.primary} />
              </View>
            )}
            <Text style={styles.unlockText}>{unlockText}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </View>
        </BlurView>
      ) : (
        // Android fallback - semi-transparent overlay
        <View style={[styles.blurOverlay, styles.androidOverlay]}>
          <View style={styles.lockContent}>
            {showIcon && (
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed" size={20} color={COLORS.primary} />
              </View>
            )}
            <Text style={styles.unlockText}>{unlockText}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Unlock CTA Button - prominent call to action
interface UnlockCTAProps {
  onPress: () => void;
  text?: string;
  userName?: string;
}

export function UnlockCTA({
  onPress,
  text = 'Unlock Your Full Insight',
  userName,
}: UnlockCTAProps) {
  const displayText = userName
    ? text.replace('{userName}', userName)
    : text;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.unlockCTAContainer}
    >
      <LinearGradient
        colors={[COLORS.primary, '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.unlockCTAGradient}
      >
        <Ionicons name="lock-open-outline" size={22} color="#FFFFFF" />
        <Text style={styles.unlockCTAText}>{displayText}</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
  },
  contentWrapper: {
    // Content is visible but blurred
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  androidOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  lockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Unlock CTA styles
  unlockCTAContainer: {
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  unlockCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  unlockCTAText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
