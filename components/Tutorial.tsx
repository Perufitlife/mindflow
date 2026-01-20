// components/Tutorial.tsx - Interactive Tutorial Overlay
// Shows after first completed session to guide users through the app

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/brand';

const { width, height } = Dimensions.get('window');

const TUTORIAL_KEY = '@tutorial_completed';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  position: 'top' | 'center' | 'bottom';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Unbind! 👋',
    description: 'Let me show you around. It only takes a few seconds.',
    icon: 'sparkles',
    position: 'center',
  },
  {
    id: 'record',
    title: 'Voice Sessions',
    description: 'Tap the mic to start a voice session. Just talk about what\'s on your mind for 1-2 minutes.',
    icon: 'mic',
    position: 'bottom',
  },
  {
    id: 'tasks',
    title: 'Your Micro-Tasks',
    description: 'After each session, you\'ll get 3 actionable tasks you can complete in 10-30 minutes.',
    icon: 'checkbox',
    position: 'center',
  },
  {
    id: 'history',
    title: 'Track Progress',
    description: 'All your sessions and tasks are saved here. Come back daily to build your streak!',
    icon: 'time',
    position: 'top',
  },
  {
    id: 'done',
    title: 'You\'re all set! 🎉',
    description: 'Start your first session whenever you\'re ready. Remember: just 2 minutes can change your day.',
    icon: 'rocket',
    position: 'center',
  },
];

interface TutorialProps {
  onComplete?: () => void;
}

export default function Tutorial({ onComplete }: TutorialProps) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const bounceValue = useSharedValue(0);

  useEffect(() => {
    checkTutorialStatus();
  }, []);

  useEffect(() => {
    // Bounce animation for the icon
    bounceValue.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 500 }),
        withTiming(0, { duration: 500 })
      ),
      -1,
      true
    );
  }, [currentStep]);

  const checkTutorialStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(TUTORIAL_KEY);
      if (!completed) {
        setVisible(true);
      }
    } catch (e) {
      console.error('Error checking tutorial status:', e);
    }
  };

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
    } catch (e) {
      console.error('Error saving tutorial status:', e);
    }
    setVisible(false);
    onComplete?.();
  };

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceValue.value }],
  }));

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Skip button */}
        {!isLastStep && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Content Card */}
        <Animated.View
          entering={SlideInUp.duration(400)}
          style={[
            styles.card,
            step.position === 'top' && styles.cardTop,
            step.position === 'bottom' && styles.cardBottom,
          ]}
        >
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>

          {/* Icon */}
          <Animated.View style={[styles.iconContainer, bounceStyle]}>
            <Ionicons name={step.icon as any} size={48} color={COLORS.primary} />
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>{step.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{step.description}</Text>

          {/* Step indicator */}
          <View style={styles.dots}>
            {TUTORIAL_STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentStep && styles.dotActive,
                  index < currentStep && styles.dotComplete,
                ]}
              />
            ))}
          </View>

          {/* Button */}
          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>
              {isLastStep ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons
              name={isLastStep ? 'rocket' : 'arrow-forward'}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Function to reset tutorial (for testing)
export async function resetTutorial() {
  await AsyncStorage.removeItem(TUTORIAL_KEY);
}

// Function to check if tutorial was completed
export async function hasTutorialCompleted(): Promise<boolean> {
  const completed = await AsyncStorage.getItem(TUTORIAL_KEY);
  return completed === 'true';
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    padding: 8,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  cardTop: {
    marginBottom: 'auto',
    marginTop: 120,
  },
  cardBottom: {
    marginTop: 'auto',
    marginBottom: 120,
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  dotComplete: {
    backgroundColor: '#10B981',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
