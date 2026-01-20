// app/(tabs)/record.tsx - Record Screen with Dynamic Prompts
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Sentry from 'sentry-expo';
import UnbindLogo from '../../components/UnbindLogo';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';
import { trackRecordingStarted, trackRecordingStopped } from '../../services/analytics';

const MIN_RECORDING_SECONDS = 30;
const SUGGESTED_RECORDING_SECONDS = 120;

// Dynamic prompts based on time of day
const PROMPTS = {
  morning: [
    "What would make today a success?",
    "What's your biggest priority right now?",
    "How are you feeling as you start the day?",
    "What's been on your mind this morning?",
  ],
  afternoon: [
    "What's blocking your progress today?",
    "What have you been avoiding?",
    "How can you make the rest of today count?",
    "What's draining your energy right now?",
  ],
  evening: [
    "What did you accomplish today?",
    "What's carrying over to tomorrow?",
    "How are you feeling about today?",
    "What would help you wind down?",
  ],
};

function getDynamicPrompt(): string {
  const hour = new Date().getHours();
  let prompts: string[];
  
  if (hour < 12) {
    prompts = PROMPTS.morning;
  } else if (hour < 18) {
    prompts = PROMPTS.afternoon;
  } else {
    prompts = PROMPTS.evening;
  }
  
  // Random prompt from the appropriate time period
  return prompts[Math.floor(Math.random() * prompts.length)];
}

export default function RecordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Dynamic prompt - memoized to prevent changing during recording
  const dynamicPrompt = useMemo(() => getDynamicPrompt(), []);

  // Animations
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );

      ringScale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.8, { duration: 1500 })
        ),
        -1,
        false
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 0 }),
          withTiming(0, { duration: 1500 })
        ),
        -1,
        false
      );

      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      scale.value = withSpring(1);
      ringOpacity.value = withTiming(0);
      setSeconds(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  function formatTime(total: number) {
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function getProgressPercentage() {
    return Math.min((seconds / SUGGESTED_RECORDING_SECONDS) * 100, 100);
  }

  function getHelperText() {
    if (!isRecording) {
      return t('record.tap_start');
    }
    if (seconds < MIN_RECORDING_SECONDS) {
      return `${t('record.keep_going')} ${MIN_RECORDING_SECONDS - seconds}${t('record.more_seconds')}`;
    }
    if (seconds < SUGGESTED_RECORDING_SECONDS) {
      return t('record.tap_stop');
    }
    return t('record.tap_stop');
  }

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Sentry.Native.captureMessage('Microphone permission denied', 'warning');
        Alert.alert(
          'Microphone Required',
          'Please enable microphone access in your device settings to record voice journals.',
          [{ text: 'OK' }]
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      trackRecordingStarted();
      Sentry.Native.captureMessage('Recording started', 'info');
    } catch (err) {
      Sentry.Native.captureException(err);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;

      if (seconds < MIN_RECORDING_SECONDS) {
        Alert.alert(
          'Recording too short',
          `Please record for at least ${MIN_RECORDING_SECONDS} seconds so we can analyze your thoughts properly.`,
          [
            { text: 'Keep Recording', style: 'cancel' },
            {
              text: 'Stop Anyway',
              style: 'destructive',
              onPress: () => finishRecording(),
            },
          ]
        );
        return;
      }

      await finishRecording();
    } catch (err) {
      Sentry.Native.captureException(err);
      Alert.alert('Error', 'Could not stop recording.');
    }
  }

  async function finishRecording() {
    if (!recording) return;

    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    trackRecordingStopped(seconds);
    Sentry.Native.addBreadcrumb({
      message: `Recording completed: ${seconds}s`,
      level: 'info',
    });

    router.push({
      pathname: '/processing',
      params: { audioUri: uri || '' },
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('record.title')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {isRecording ? t('record.subtitle_recording') : t('record.subtitle_ready')}
          </Text>
        </View>
        <UnbindLogo size={40} animation={isRecording ? 'pulse' : 'breathing'} />
      </View>

      {/* Dynamic Prompt Card */}
      {!isRecording && (
        <Animated.View entering={FadeIn.duration(500)} style={[styles.promptCard, { backgroundColor: colors.primaryLight + '30' }]}>
          <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
          <Text style={[styles.promptText, { color: colors.text }]}>
            "{dynamicPrompt}"
          </Text>
        </Animated.View>
      )}

      {/* Main content */}
      <View style={styles.content}>
        <Text style={[styles.timer, { color: colors.text }]}>{formatTime(seconds)}</Text>

        {isRecording && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[styles.progressFill, { width: `${getProgressPercentage()}%`, backgroundColor: colors.primary }]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {seconds < SUGGESTED_RECORDING_SECONDS
                ? `${Math.floor((SUGGESTED_RECORDING_SECONDS - seconds) / 60)}:${((SUGGESTED_RECORDING_SECONDS - seconds) % 60).toString().padStart(2, '0')} suggested`
                : 'Great session!'}
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {isRecording && (
            <Animated.View style={[styles.pulsingRing, ringStyle, { backgroundColor: colors.error }]} />
          )}

          <Animated.View style={buttonStyle}>
            <TouchableOpacity
              style={[
                styles.recordButton, 
                { backgroundColor: colors.primary },
                isRecording && { backgroundColor: colors.error }
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.8}
            >
              {isRecording ? (
                <View style={styles.stopIcon} />
              ) : (
                <Ionicons name="mic" size={48} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Text style={[styles.helperText, { color: colors.textMuted }]}>{getHelperText()}</Text>
      </View>

      {!isRecording && (
        <View style={styles.tipsContainer}>
          <Text style={[styles.tipsTitle, { color: colors.text }]}>{t('record.tips_title')}</Text>
          <Text style={[styles.tipItem, { color: colors.textMuted }]}>• {t('record.tip1')}</Text>
          <Text style={[styles.tipItem, { color: colors.textMuted }]}>• {t('record.tip2')}</Text>
          <Text style={[styles.tipItem, { color: colors.textMuted }]}>• {t('record.tip3')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  timer: {
    fontSize: 48,
    fontWeight: '300',
    color: '#111827',
    fontVariant: ['tabular-nums'],
    marginBottom: 24,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pulsingRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#EF4444',
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: '#EF4444',
  },
  stopIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  helperText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  tipsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 20,
  },
  // Dynamic Prompt Styles
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  promptText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 24,
  },
});
