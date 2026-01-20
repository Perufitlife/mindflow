// app/(onboarding)/problem.tsx - "Does this sound familiar?" Screen
// Storytelling: Connect emotionally with the user's problem

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/brand';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { OnboardingEvents } from '../../services/analytics';

const PAIN_POINTS = [
  {
    id: 'overwhelmed',
    icon: 'cloud-outline',
    text: 'You have a million things to do, but can\'t start any',
  },
  {
    id: 'cluttered',
    icon: 'apps-outline',
    text: 'Your mind feels cluttered and overwhelmed',
  },
  {
    id: 'procrastinate',
    icon: 'time-outline',
    text: 'You know what you should do, but keep putting it off',
  },
];

export default function ProblemScreen() {
  const router = useRouter();
  
  // Animated thought bubbles with staggered floating effect
  const bubble1Y = useSharedValue(0);
  const bubble2Y = useSharedValue(0);
  const bubble3Y = useSharedValue(0);
  const headScale = useSharedValue(1);
  
  React.useEffect(() => {
    // Track onboarding start
    OnboardingEvents.started();
    OnboardingEvents.problemScreenViewed();
    
    // Gentle breathing animation for head
    headScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    // Floating bubbles with different timings
    bubble1Y.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    bubble2Y.value = withDelay(400, withRepeat(
      withSequence(
        withTiming(-4, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    ));
    
    bubble3Y.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(-3, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    ));
  }, []);

  const animatedHeadStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headScale.value }],
  }));
  
  const bubble1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: bubble1Y.value }],
  }));
  
  const bubble2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: bubble2Y.value }],
  }));
  
  const bubble3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: bubble3Y.value }],
  }));

  const handleContinue = () => {
    OnboardingEvents.stepCompleted(1, 'problem');
    router.push('/(onboarding)/solution');
  };

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <OnboardingProgressBar currentStep={1} totalSteps={6} />

      {/* Animated Head Icon with floating thought bubbles */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(600)}
        style={styles.iconContainer}
      >
        <Animated.View style={[styles.headCircle, animatedHeadStyle]}>
          <View style={styles.thoughtBubbles}>
            <Animated.View style={[styles.bubble, styles.bubble1, bubble1Style]} />
            <Animated.View style={[styles.bubble, styles.bubble2, bubble2Style]} />
            <Animated.View style={[styles.bubble, styles.bubble3, bubble3Style]} />
          </View>
          <Ionicons name="person" size={48} color={COLORS.primary} />
        </Animated.View>
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        <Animated.Text
          entering={FadeInUp.delay(300).duration(500)}
          style={styles.title}
        >
          Does this sound{'\n'}familiar?
        </Animated.Text>

        {/* Pain Points */}
        <View style={styles.painPoints}>
          {PAIN_POINTS.map((point, index) => (
            <Animated.View
              key={point.id}
              entering={FadeIn.delay(500 + index * 150).duration(400)}
            >
              <TouchableOpacity
                style={styles.painPointCard}
                activeOpacity={0.8}
              >
                <View style={styles.painPointIcon}>
                  <Ionicons
                    name={point.icon as any}
                    size={24}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.painPointText}>{point.text}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <Animated.View
        entering={FadeInUp.delay(1000).duration(500)}
        style={styles.footer}
      >
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>That's me</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEF3C7', // Warm yellow for "overwhelmed" feeling
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  thoughtBubbles: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 60,
    height: 60,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: '#FDE68A',
    borderRadius: 50,
  },
  bubble1: {
    width: 20,
    height: 20,
    top: 0,
    right: 0,
  },
  bubble2: {
    width: 14,
    height: 14,
    top: 20,
    right: 25,
  },
  bubble3: {
    width: 10,
    height: 10,
    top: 35,
    right: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 32,
  },
  painPoints: {
    gap: 12,
  },
  painPointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  painPointIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  painPointText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 20,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
