// components/UnbindLogo.tsx - Animated Unbind Logo
// Brand presence with dopamine-inducing animations

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';

type AnimationType = 'breathing' | 'success' | 'pulse' | 'bounce' | 'none';

interface UnbindLogoProps {
  size?: number;
  animation?: AnimationType;
  showGlow?: boolean;
}

export default function UnbindLogo({
  size = 40,
  animation = 'breathing',
  showGlow = false,
}: UnbindLogoProps) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const sparkle = useSharedValue(0);

  useEffect(() => {
    // Reset values
    scale.value = 1;
    rotation.value = 0;
    
    switch (animation) {
      case 'breathing':
        // Smooth breathing with subtle rotation
        scale.value = withRepeat(
          withSequence(
            withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        );
        // Very subtle rotation for life-like feel
        rotation.value = withRepeat(
          withSequence(
            withTiming(2, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
            withTiming(-2, { duration: 3000, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        );
        break;

      case 'success':
        // Satisfying pop with overshoot bounce
        scale.value = withSequence(
          withSpring(1.4, { damping: 4, stiffness: 200 }),
          withSpring(0.9, { damping: 6 }),
          withSpring(1.1, { damping: 8 }),
          withSpring(1, { damping: 10 })
        );
        // Celebratory rotation
        rotation.value = withSequence(
          withTiming(15, { duration: 150 }),
          withTiming(-10, { duration: 150 }),
          withTiming(5, { duration: 100 }),
          withTiming(0, { duration: 100 })
        );
        // Glow burst
        glowOpacity.value = withSequence(
          withTiming(0.8, { duration: 100 }),
          withTiming(0, { duration: 500 })
        );
        glowScale.value = withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(2, { duration: 400, easing: Easing.out(Easing.ease) })
        );
        // Sparkle effect
        sparkle.value = withSequence(
          withTiming(1, { duration: 200 }),
          withDelay(300, withTiming(0, { duration: 300 }))
        );
        break;

      case 'pulse':
        // Energetic pulse for processing
        scale.value = withRepeat(
          withSequence(
            withSpring(1.15, { damping: 8, stiffness: 300 }),
            withSpring(1, { damping: 8, stiffness: 300 })
          ),
          -1,
          false
        );
        // Slight wiggle
        rotation.value = withRepeat(
          withSequence(
            withTiming(3, { duration: 200 }),
            withTiming(-3, { duration: 200 })
          ),
          -1,
          false
        );
        break;

      case 'bounce':
        // Playful bounce for attention
        scale.value = withRepeat(
          withSequence(
            withSpring(1.2, { damping: 3, stiffness: 400 }),
            withSpring(0.95, { damping: 5 }),
            withSpring(1.05, { damping: 6 }),
            withSpring(1, { damping: 8 })
          ),
          -1,
          false
        );
        break;

      case 'none':
      default:
        scale.value = 1;
        rotation.value = 0;
        break;
    }
  }, [animation]);

  // Glow effect when requested
  useEffect(() => {
    if (showGlow && animation !== 'success') {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.15, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1000 }),
          withTiming(1.1, { duration: 1000 })
        ),
        -1,
        false
      );
    }
  }, [showGlow]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const sparkleStyle = useAnimatedStyle(() => {
    const sparkleOpacity = interpolate(sparkle.value, [0, 0.5, 1], [0, 1, 0]);
    const sparkleScale = interpolate(sparkle.value, [0, 1], [0.5, 1.5]);
    return {
      opacity: sparkleOpacity,
      transform: [{ scale: sparkleScale }],
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          { 
            width: size * 1.5, 
            height: size * 1.5, 
            borderRadius: size * 0.75,
          },
          glowStyle,
        ]}
      />
      
      {/* Sparkle particles (for success) */}
      <Animated.View style={[styles.sparkleContainer, sparkleStyle]}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <View
            key={i}
            style={[
              styles.sparkle,
              {
                transform: [
                  { rotate: `${angle}deg` },
                  { translateY: -size * 0.6 },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>
      
      {/* Logo Image */}
      <Animated.Image
        source={require('../assets/images/unbind-logo.png')}
        style={[
          { width: size, height: size },
          logoStyle,
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: '#6366F1',
  },
  sparkleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FCD34D', // Gold sparkles
  },
});
