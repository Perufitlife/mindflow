// app/output.tsx - Output Screen with Task Management
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
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, useSharedValue, withDelay, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import * as Sentry from '../sentry-stub';
import Confetti from '../components/Confetti';
import TaskChecklist from '../components/TaskChecklist';
import UnbindLogo from '../components/UnbindLogo';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { trackTaskCompleted, trackTaskAdded, trackTaskRemoved } from '../services/analytics';
import { MicroTask } from '../services/openai';
import { saveEntry, updateEntry } from '../services/storage';
import { incrementSessionCount, shouldShowPaywall, hasCompletedOnboarding } from '../services/user';
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
    insight?: string; // NEW: Coach insight
  }>();

  const [saved, setSaved] = useState(false);
  const [tasks, setTasks] = useState<MicroTask[]>([]);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFirstTaskCTA, setShowFirstTaskCTA] = useState(true);
  
  // Animation values
  const celebrationScale = useSharedValue(0.5);
  const celebrationOpacity = useSharedValue(0);

  // Load user name
  useEffect(() => {
    async function loadUserName() {
      try {
        const name = await AsyncStorage.getItem('@user_name');
        if (name) setUserName(name);
      } catch (e) {
        console.error('Error loading user name:', e);
      }
    }
    loadUserName();
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
      
      // Track
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

  async function handleContinue() {
    try {
      // Update saved entry with current tasks
      if (entryId) {
        await updateEntry(entryId, { tasks });
      }

      // Check if this is the first session (onboarding not completed)
      const onboardingDone = await hasCompletedOnboarding();
      
      if (!onboardingDone) {
        // First session - go directly to paywall (commitment was already done in onboarding)
        router.replace({
          pathname: '/(onboarding)/paywall',
          params: {
            transcript: params.transcript || '',
            tasks: params.tasks || '[]',
            mood: params.mood || '',
          },
        });
        return;
      }

      // Regular flow for returning users
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
      // Navigate home even if there's an error
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

  // Celebration animation style
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
      // Could navigate to a focus timer screen if implemented
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Confetti Celebration */}
      <Confetti isActive={showConfetti} count={60} duration={3500} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Success Animation */}
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

        {/* Celebration Card */}
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

        {/* First Task CTA */}
        {showFirstTaskCTA && tasks.length > 0 && !tasks[0].completed && (
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

        {/* Mood Card */}
        <Animated.View entering={FadeIn.delay(200).duration(500)}>
          <View style={[styles.moodCard, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.moodEmoji}>{getMoodEmoji(params.mood || '')}</Text>
            <View style={styles.moodTextContainer}>
              <Text style={[styles.moodText, { color: colors.text }]}>{params.mood || 'Processing...'}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Insight Card - Premium Coach Observation */}
        {params.insight && (
          <Animated.View entering={FadeIn.delay(300).duration(500)}>
            <View style={[styles.insightCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
              <View style={styles.insightHeader}>
                <View style={styles.insightIconContainer}>
                  <Ionicons name="sparkles" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.insightLabel, { color: colors.primary }]}>Coach Insight</Text>
              </View>
              <Text style={[styles.insightText, { color: colors.text }]}>"{params.insight}"</Text>
            </View>
          </Animated.View>
        )}

        {/* Blocker Card */}
        {params.blocker && (
          <View style={[styles.blockerCard, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}>
            <View style={styles.blockerHeader}>
              <Ionicons name="warning-outline" size={20} color={colors.error} />
              <Text style={[styles.blockerTitle, { color: colors.error }]}>{t('output.blocker')}</Text>
            </View>
            <Text style={[styles.blockerText, { color: colors.error }]}>{params.blocker}</Text>
          </View>
        )}

        {/* Micro-actions Card */}
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

          <TaskChecklist
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onRemoveTask={handleRemoveTask}
            editable={true}
            showProgress={true}
          />
        </View>

        {/* Summary Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('output.summary')}</Text>
          </View>
          <Text style={[styles.cardContent, { color: colors.textSecondary }]}>{params.summary}</Text>
        </View>

        {/* Transcript (collapsible) */}
        {params.transcript && (
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
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.text }]} onPress={handleContinue}>
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>{t('output.save_continue')}</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.background} />
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
  // Insight Card Styles (Premium Coach)
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
  // Celebration Card Styles
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
  // First Task CTA Styles
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
});
