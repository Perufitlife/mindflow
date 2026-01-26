// app/output.tsx - Output Screen with Task Management & Preview Mode
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import * as Sentry from '../sentry-stub';
import Confetti from '../components/Confetti';
import TaskChecklist from '../components/TaskChecklist';
import UnbindLogo from '../components/UnbindLogo';
import { BlurredCard, UnlockCTA } from '../components/BlurredCard';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { trackTaskCompleted, trackTaskAdded, trackTaskRemoved, trackOutputPreviewShown, trackBlurTapped, trackUnlockCTATapped } from '../services/analytics';
import { MicroTask } from '../services/openai';
import { saveEntry, updateEntry } from '../services/storage';
import { incrementSessionCount, shouldShowPaywall, hasCompletedOnboarding } from '../services/user';
import { getChallengeCopy } from '../config/challenge-copy';
import posthog from '../posthog';

export default function OutputScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    transcript?: string;
    summary?: string;
    blocker?: string;
    mood?: string;
    tasks?: string;
    insight?: string;
  }>();

  const [saved, setSaved] = useState(false);
  const [tasks, setTasks] = useState<MicroTask[]>([]);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFirstTaskCTA, setShowFirstTaskCTA] = useState(true);
  
  // Preview mode state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [userChallenge, setUserChallenge] = useState<string | null>(null);
  
  // Animation values
  const celebrationScale = useSharedValue(0.5);
  const celebrationOpacity = useSharedValue(0);

  // Load user name and check preview mode
  useEffect(() => {
    async function loadUserData() {
      try {
        const [name, challenge, onboardingDone] = await Promise.all([
          AsyncStorage.getItem('@user_name'),
          AsyncStorage.getItem('@user_challenge'),
          hasCompletedOnboarding(),
        ]);
        
        if (name) setUserName(name);
        if (challenge) setUserChallenge(challenge);
        
        // Preview mode for first-time users (onboarding not completed)
        const shouldShowPreview = !onboardingDone;
        setIsPreviewMode(shouldShowPreview);
        
        if (shouldShowPreview) {
          trackOutputPreviewShown(tasks.length, challenge || 'unknown');
        }
      } catch (e) {
        console.error('Error loading user data:', e);
      }
    }
    loadUserData();
  }, []);

  // Parse tasks from params
  useEffect(() => {
    if (params.tasks) {
      try {
        const parsedTasks = JSON.parse(params.tasks);
        setTasks(parsedTasks);
      } catch (error) {
        console.error('Error parsing tasks:', error);
      }
    }
  }, [params.tasks]);

  // Save entry on mount
  useEffect(() => {
    if (!saved && tasks.length > 0) {
      saveJournalEntry();
    }
  }, [tasks]);

  async function saveJournalEntry() {
    if (saved) return;

    try {
      const entry = await saveEntry({
        audioUri: '',
        transcript: params.transcript || '',
        summary: params.summary || '',
        blocker: params.blocker || '',
        mood: params.mood || '',
        tasks: tasks,
      });

      setEntryId(entry.id);
      await incrementSessionCount();
      setSaved(true);

      // Trigger celebration
      setShowConfetti(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      celebrationScale.value = withSequence(
        withSpring(1.2, { damping: 4 }),
        withSpring(1, { damping: 6 })
      );
      celebrationOpacity.value = withTiming(1, { duration: 300 });
      
      posthog.capture('output_celebration_shown');

      Sentry.Native.addBreadcrumb({
        message: 'Journal entry saved',
        level: 'info',
      });
    } catch (error) {
      console.error('Error saving entry:', error);
      Sentry.Native.captureException(error);
    }
  }

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          const newCompleted = !task.completed;
          if (newCompleted) {
            trackTaskCompleted({ taskId, duration: task.duration, sessionId: entryId || undefined });
          }
          return {
            ...task,
            completed: newCompleted,
            completedAt: newCompleted ? new Date().toISOString() : undefined,
          };
        }
        return task;
      })
    );
  };

  const handleAddTask = (newTask: Omit<MicroTask, 'id'>) => {
    const task: MicroTask = {
      ...newTask,
      id: Date.now().toString(36),
    };
    setTasks((prev) => [...prev, task]);
    trackTaskAdded(newTask.duration);
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    trackTaskRemoved();
  };

  // Navigate to paywall
  const goToPaywall = () => {
    trackUnlockCTATapped(userChallenge || 'unknown');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    router.replace({
      pathname: '/(onboarding)/paywall',
      params: {
        transcript: params.transcript || '',
        tasks: params.tasks || '[]',
        mood: params.mood || '',
        taskCount: String(tasks.length),
      },
    });
  };

  // Handle blur tap
  const handleBlurTap = (section: string) => {
    trackBlurTapped(section);
    goToPaywall();
  };

  async function handleContinue() {
    try {
      if (entryId) {
        await updateEntry(entryId, { tasks });
      }

      const onboardingDone = await hasCompletedOnboarding();
      
      if (!onboardingDone) {
        router.replace({
          pathname: '/(onboarding)/paywall',
          params: {
            transcript: params.transcript || '',
            tasks: params.tasks || '[]',
            mood: params.mood || '',
            taskCount: String(tasks.length),
          },
        });
        return;
      }

      const paywallResult = await shouldShowPaywall();

      if (paywallResult.show) {
        router.replace({
          pathname: '/paywall',
          params: {
            trigger: paywallResult.trigger,
            sessionsToday: String(paywallResult.sessionsToday),
            maxSessions: String(paywallResult.maxSessions),
          },
        });
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error in handleContinue:', error);
      Sentry.Native.captureException(error);
      router.replace('/(tabs)');
    }
  }

  const getMoodEmoji = (moodText: string) => {
    const moodLower = moodText?.toLowerCase() || '';
    if (moodLower.includes('stress') || moodLower.includes('anxious')) return '😰';
    if (moodLower.includes('happy') || moodLower.includes('joy')) return '😊';
    if (moodLower.includes('sad') || moodLower.includes('down')) return '😔';
    if (moodLower.includes('calm') || moodLower.includes('peace')) return '😌';
    if (moodLower.includes('overwhelm')) return '🤯';
    if (moodLower.includes('motivat') || moodLower.includes('excited')) return '🔥';
    if (moodLower.includes('tired') || moodLower.includes('exhaust')) return '😴';
    if (moodLower.includes('focus')) return '🎯';
    return '💭';
  };

  const totalTime = tasks.reduce((sum, t) => sum + t.duration, 0);
  const challengeCopy = getChallengeCopy(userChallenge);
  
  // In preview mode, only show first 2 tasks
  const visibleTasks = isPreviewMode ? tasks.slice(0, 2) : tasks;
  const hiddenTasksCount = isPreviewMode ? Math.max(0, tasks.length - 2) : 0;

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationOpacity.value,
  }));

  const handleStartFirstTask = () => {
    if (tasks.length > 0) {
      const firstTask = tasks[0];
      posthog.capture('first_task_started', { 
        task_id: firstTask.id,
        duration: firstTask.duration,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowFirstTaskCTA(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Confetti isActive={showConfetti} count={60} duration={3500} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - Always Visible */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {userName ? `Great work, ${userName}!` : t('output.your_session')}
            </Text>
            <Text style={[styles.headerDate, { color: colors.textMuted }]}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          <UnbindLogo size={40} animation="success" showGlow />
        </Animated.View>

        {/* Celebration Card - Always Visible (AHA moment) */}
        {saved && (
          <Animated.View style={[styles.celebrationCard, celebrationStyle]}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.celebrationText}>
              In just 2 minutes, you created {tasks.length} actionable tasks!
            </Text>
            <Text style={styles.celebrationSubtext}>
              That's what usually takes 30 minutes of planning
            </Text>
          </Animated.View>
        )}

        {/* Blocker Card - FIRST BLURRED ELEMENT (generates curiosity) */}
        {params.blocker && (
          <Animated.View entering={FadeIn.delay(250).duration(500)}>
            <BlurredCard
              isLocked={isPreviewMode}
              onUnlock={() => handleBlurTap('blocker')}
              unlockText="See what's blocking you"
            >
              <View style={[styles.blockerCard, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}>
                <View style={styles.blockerHeader}>
                  <Ionicons name="warning-outline" size={20} color={colors.error} />
                  <Text style={[styles.blockerTitle, { color: colors.error }]}>{t('output.blocker')}</Text>
                </View>
                <Text style={[styles.blockerText, { color: colors.error }]}>{params.blocker}</Text>
              </View>
            </BlurredCard>
          </Animated.View>
        )}

        {/* Mood Card - Always Visible */}
        <Animated.View entering={FadeIn.delay(200).duration(500)}>
          <View style={[styles.moodCard, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.moodEmoji}>{getMoodEmoji(params.mood || '')}</Text>
            <View style={styles.moodTextContainer}>
              <Text style={[styles.moodText, { color: colors.text }]}>{params.mood || 'Processing...'}</Text>
            </View>
          </View>
        </Animated.View>

        {/* First 2 Tasks - Always Visible */}
        {!isPreviewMode && showFirstTaskCTA && tasks.length > 0 && !tasks[0].completed && (
          <Animated.View entering={FadeIn.delay(800).duration(500)} style={styles.firstTaskCTA}>
            <View style={styles.firstTaskHeader}>
              <Ionicons name="rocket" size={24} color="#10B981" />
              <Text style={styles.firstTaskTitle}>Ready to start?</Text>
            </View>
            <Text style={styles.firstTaskDescription}>
              Your first task only takes {tasks[0].duration} minutes
            </Text>
            <TouchableOpacity style={styles.firstTaskButton} onPress={handleStartFirstTask}>
              <Ionicons name="play" size={18} color="#FFFFFF" />
              <Text style={styles.firstTaskButtonText}>Start now</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Preview Mode: Personalized hint before blurred content */}
        {isPreviewMode && userChallenge && (
          <Animated.View entering={FadeIn.delay(400).duration(500)} style={styles.personalizedHint}>
            <Text style={styles.hintText}>{challengeCopy.insight_prefix}</Text>
          </Animated.View>
        )}

        {/* Coach Insight - BLURRED in preview mode */}
        {params.insight && (
          <Animated.View entering={FadeIn.delay(300).duration(500)}>
            <BlurredCard
              isLocked={isPreviewMode}
              onUnlock={() => handleBlurTap('insight')}
              unlockText="Unlock coach insight"
            >
              <View style={[styles.insightCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                <View style={styles.insightHeader}>
                  <View style={styles.insightIconContainer}>
                    <Ionicons name="sparkles" size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.insightLabel, { color: colors.primary }]}>Coach Insight</Text>
                </View>
                <Text style={[styles.insightText, { color: colors.text }]}>"{params.insight}"</Text>
              </View>
            </BlurredCard>
          </Animated.View>
        )}

        {/* Micro-actions Card - Partially visible in preview */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="flash" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('output.micro_actions')}</Text>
            </View>
            <Text style={[styles.totalTime, { color: colors.primary }]}>
              {t('output.total_time')}: {totalTime} {t('output.duration')}
            </Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{t('output.micro_actions_sub')}</Text>

          {/* Show only first 2 tasks in preview mode */}
          <TaskChecklist
            tasks={visibleTasks}
            onToggleTask={isPreviewMode ? () => handleBlurTap('tasks') : handleToggleTask}
            onAddTask={handleAddTask}
            onRemoveTask={handleRemoveTask}
            editable={!isPreviewMode}
            showProgress={!isPreviewMode}
          />
          
          {/* Hidden tasks indicator in preview mode */}
          {isPreviewMode && hiddenTasksCount > 0 && (
            <TouchableOpacity 
              style={styles.hiddenTasksIndicator}
              onPress={() => handleBlurTap('tasks')}
            >
              <Ionicons name="lock-closed" size={16} color="#6366F1" />
              <Text style={styles.hiddenTasksText}>
                +{hiddenTasksCount} more task{hiddenTasksCount > 1 ? 's' : ''} locked
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#6366F1" />
            </TouchableOpacity>
          )}
        </View>

        {/* Summary Card - BLURRED in preview mode */}
        <BlurredCard
          isLocked={isPreviewMode}
          onUnlock={() => handleBlurTap('summary')}
          unlockText="Read full summary"
        >
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('output.summary')}</Text>
            </View>
            <Text style={[styles.cardContent, { color: colors.textSecondary }]}>{params.summary}</Text>
          </View>
        </BlurredCard>

        {/* Unlock CTA - Only in preview mode */}
        {isPreviewMode && (
          <Animated.View entering={FadeIn.delay(600).duration(500)}>
            <UnlockCTA
              onPress={goToPaywall}
              text="See Your Complete Action Plan"
              userName={userName}
            />
          </Animated.View>
        )}

        {/* Transcript - HIDDEN in preview mode */}
        {!isPreviewMode && params.transcript && (
          <View style={[styles.transcriptCard, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="mic-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('output.transcript')}</Text>
            </View>
            <Text style={[styles.transcriptText, { color: colors.textMuted }]}>{params.transcript}</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.primaryButton, { backgroundColor: isPreviewMode ? colors.primary : colors.text }]} 
          onPress={isPreviewMode ? goToPaywall : handleContinue}
        >
          <Text style={[styles.primaryButtonText, { color: '#FFFFFF' }]}>
            {isPreviewMode ? challengeCopy.cta : t('output.save_continue')}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  headerDate: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },
  moodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  moodEmoji: {
    fontSize: 36,
    marginRight: 14,
  },
  moodTextContainer: {
    flex: 1,
  },
  moodText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  // Personalized hint for preview mode
  personalizedHint: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  hintText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#92400E',
    fontStyle: 'italic',
  },
  insightCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  insightIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightText: {
    fontSize: 16,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 24,
    color: '#374151',
  },
  blockerCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  blockerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  blockerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#991B1B',
  },
  blockerText: {
    fontSize: 15,
    color: '#7F1D1D',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  totalTime: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
  },
  cardContent: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  transcriptCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  transcriptText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 34,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  celebrationCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  celebrationText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
    textAlign: 'center',
    marginBottom: 4,
  },
  celebrationSubtext: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'center',
  },
  firstTaskCTA: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
  },
  firstTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  firstTaskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
  },
  firstTaskDescription: {
    fontSize: 15,
    color: '#047857',
    marginBottom: 16,
  },
  firstTaskButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  firstTaskButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Hidden tasks indicator
  hiddenTasksIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
  },
  hiddenTasksText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
});
