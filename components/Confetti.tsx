// components/Confetti.tsx - Celebration Animation
// Shows confetti particles for dopamine moments

import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#6366F1', // Primary
  '#10B981', // Success
  '#F59E0B', // Accent
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5CF6', // Purple
];

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  color: string;
  size: number;
  rotation: number;
}

interface ConfettiProps {
  isActive: boolean;
  count?: number;
  duration?: number;
}

function ConfettiPieceComponent({ piece, duration }: { piece: ConfettiPiece; duration: number }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Fall animation
    translateY.value = withDelay(
      piece.delay,
      withTiming(SCREEN_HEIGHT + 100, {
        duration: duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );

    // Horizontal sway
    const swayAmount = (Math.random() - 0.5) * 100;
    translateX.value = withDelay(
      piece.delay,
      withSequence(
        withTiming(swayAmount, { duration: duration * 0.3 }),
        withTiming(-swayAmount * 0.5, { duration: duration * 0.3 }),
        withTiming(swayAmount * 0.3, { duration: duration * 0.4 })
      )
    );

    // Rotation
    rotate.value = withDelay(
      piece.delay,
      withTiming(piece.rotation + 720, {
        duration: duration,
        easing: Easing.linear,
      })
    );

    // Fade out near end
    opacity.value = withDelay(
      piece.delay + duration * 0.7,
      withTiming(0, { duration: duration * 0.3 })
    );

    // Pop in effect
    scale.value = withDelay(
      piece.delay,
      withSequence(
        withTiming(1.3, { duration: 100 }),
        withTiming(1, { duration: 100 })
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: piece.x,
          backgroundColor: piece.color,
          width: piece.size,
          height: piece.size * 1.5,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function Confetti({ isActive, count = 50, duration = 3000 }: ConfettiProps) {
  const [pieces, setPieces] = React.useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (isActive) {
      const newPieces: ConfettiPiece[] = [];
      for (let i = 0; i < count; i++) {
        newPieces.push({
          id: i,
          x: Math.random() * SCREEN_WIDTH,
          delay: Math.random() * 500,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 8 + Math.random() * 8,
          rotation: Math.random() * 360,
        });
      }
      setPieces(newPieces);

      // Clear after animation
      const timer = setTimeout(() => {
        setPieces([]);
      }, duration + 1000);

      return () => clearTimeout(timer);
    }
  }, [isActive]);

  if (!isActive || pieces.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPieceComponent key={piece.id} piece={piece} duration={duration} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    borderRadius: 2,
  },
});
