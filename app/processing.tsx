// app/processing.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import * as Sentry from 'sentry-expo';
import UnbindLogo from '../components/UnbindLogo';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { parseLimitError, processJournalEntry } from '../services/openai';
import posthog from '../posthog';

type ProcessingStep = 'transcribing' | 'analyzing' | 'done' | 'error' | 'limit_reached' | 'trial_expired';

export default function ProcessingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { audioUri } = useLocalSearchParams<{ audioUri: string }>();
  const [step, setStep] = useState<ProcessingStep>('transcribing');
  const [error, setError] = useState<string | null>(null);
  const [limitInfo, setLimitInfo] = useState<{ sessionsToday: number; maxSessions: number } | null>(null);

  // Animation for the pulsing dot
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.2, { duration: 800 }), -1, true);
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  useEffect(() => {
    if (!audioUri) {
      setError('No audio file provided');
      setStep('error');
      return;
    }

    processAudio();
  }, [audioUri]);

  async function processAudio() {
    try {
      setStep('transcribing');
      posthog.capture('session_processing_started');

      const result = await processJournalEntry(audioUri);

      setStep('analyzing');

      // Small delay to show the analyzing state
      await new Promise((resolve) => setTimeout(resolve, 500));

      setStep('done');

      posthog.capture('session_completed', {
        mood: result.analysis.mood,
        taskCount: result.analysis.tasks.length,
        sessionsToday: result.sessionsToday,
      });

      Sentry.Native.addBreadcrumb({
        message: 'Journal processed successfully',
        level: 'info',
        data: { mood: result.analysis.mood, taskCount: result.analysis.tasks.length },
      });

      // Navigate to output with real data
      router.replace({
        pathname: '/output',
        params: {
          transcript: result.transcript,
          summary: result.analysis.summary,
          blocker: result.analysis.blocker,
          mood: result.analysis.mood,
          tasks: JSON.stringify(result.analysis.tasks),
          sessionId: result.sessionId || '',
        },
      });
    } catch (err: any) {
      // Check if it's a limit or trial error (expected behavior, not an error)
      const { isLimitError, isTrialExpired, sessionsToday, maxSessions } = parseLimitError(err);

      if (isTrialExpired) {
        console.log('Trial expired - showing upgrade screen');
        setStep('trial_expired');
        posthog.capture('trial_expired_shown');
      } else if (isLimitError) {
        console.log('Daily limit reached - showing upgrade screen');
        setStep('limit_reached');
        setLimitInfo({ sessionsToday, maxSessions });
        posthog.capture('daily_limit_reached', { sessionsToday, maxSessions });
      } else {
        // Only log actual errors
        console.error('Processing error:', err);
        Sentry.Native.captureException(err);
        setError(err.message || 'Failed to process your recording');
        setStep('error');
      }
    }
  }

  const getStepText = () => {
    switch (step) {
      case 'transcribing':
        return t('processing.transcribing');
      case 'analyzing':
        return t('processing.analyzing');
      case 'done':
        return t('processing.done');
      case 'trial_expired':
        return 'Your free trial has ended';
      case 'limit_reached':
        return 'Daily limit reached';
      case 'error':
        return t('processing.error');
    }
  };

  const getStepSubtext = () => {
    switch (step) {
      case 'transcribing':
        return t('processing.transcribing_sub');
      case 'analyzing':
        return t('processing.analyzing_sub');
      case 'done':
        return t('processing.done_sub');
      case 'trial_expired':
        return 'Subscribe to continue using Unbind and unlock unlimited productivity.';
      case 'limit_reached':
        return `You've used ${limitInfo?.sessionsToday}/${limitInfo?.maxSessions} sessions today. Come back tomorrow or upgrade.`;
      case 'error':
        return error || 'Please try again';
    }
  };

  const handleUpgrade = () => {
    router.replace('/paywall');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {step === 'limit_reached' || step === 'trial_expired' ? (
          <View style={[styles.limitIcon, { backgroundColor: colors.warning }, step === 'trial_expired' && { backgroundColor: colors.primary }]}>
            <Text style={styles.limitIconText}>{step === 'trial_expired' ? '⏰' : '🔒'}</Text>
          </View>
        ) : step !== 'error' ? (
          <View style={styles.logoContainer}>
            <UnbindLogo size={80} animation="pulse" showGlow />
          </View>
        ) : (
          <View style={[styles.errorIcon, { backgroundColor: colors.error }]}>
            <Text style={styles.errorIconText}>!</Text>
          </View>
        )}

        <Text style={[styles.stepText, { color: colors.text }]}>{getStepText()}</Text>
        <Text style={[styles.subText, { color: colors.textMuted }]}>{getStepSubtext()}</Text>

        {/* Progress indicators */}
        {step !== 'error' && step !== 'limit_reached' && step !== 'trial_expired' && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, { backgroundColor: colors.border }, styles.progressDotActive, { backgroundColor: colors.primary }]} />
            <View
              style={[
                styles.progressDot,
                { backgroundColor: colors.border },
                (step === 'analyzing' || step === 'done') && { backgroundColor: colors.primary },
              ]}
            />
            <View
              style={[
                styles.progressDot,
                { backgroundColor: colors.border },
                step === 'done' && { backgroundColor: colors.primary },
              ]}
            />
          </View>
        )}
      </View>

      {(step === 'limit_reached' || step === 'trial_expired') && (
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.upgradeButton, { backgroundColor: colors.primary }]} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>
              {step === 'trial_expired' ? 'Start Premium' : 'Upgrade to Premium'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={[styles.backButtonText, { color: colors.textMuted }]}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'error' && (
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.text }]} onPress={processAudio}>
            <Text style={[styles.retryButtonText, { color: colors.background }]}>{t('processing.retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)/record')}
          >
            <Text style={[styles.backButtonText, { color: colors.textMuted }]}>{t('processing.record_again')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 32,
  },
  pulsingDot: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    marginBottom: 32,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    marginBottom: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '700',
  },
  limitIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F59E0B',
    marginBottom: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trialExpiredIcon: {
    backgroundColor: '#6366F1',
  },
  limitIconText: {
    fontSize: 36,
  },
  stepText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#6366F1',
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 15,
  },
});
