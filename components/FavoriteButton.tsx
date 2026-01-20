// components/FavoriteButton.tsx - Favorite Toggle Button
// Used in history and output screens to mark entries as favorites

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { COLORS } from '../constants/brand';
import { toggleFavorite } from '../services/storage';

interface FavoriteButtonProps {
  entryId: string;
  isFavorite?: boolean;
  size?: number;
  onToggle?: (isFavorite: boolean) => void;
}

export default function FavoriteButton({
  entryId,
  isFavorite: initialFavorite = false,
  size = 24,
  onToggle,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const scale = useSharedValue(1);

  useEffect(() => {
    setIsFavorite(initialFavorite);
  }, [initialFavorite]);

  const handlePress = async () => {
    // Bounce animation
    scale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );

    try {
      const updatedEntry = await toggleFavorite(entryId);
      if (updatedEntry) {
        const newValue = updatedEntry.isFavorite ?? false;
        setIsFavorite(newValue);
        onToggle?.(newValue);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity onPress={handlePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={size}
          color={isFavorite ? '#EF4444' : '#9CA3AF'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // No additional styles needed
});
