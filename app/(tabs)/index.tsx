// app/(tabs)/index.tsx - Home Dashboard
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import SessionJourneyList from '../../components/SessionJourneyList';
import StreakCard from '../../components/StreakCard';
import TaskChecklist from '../../components/TaskChecklist';
import Tutorial from '../../components/Tutorial';
import UnbindLogo from '../../components/UnbindLogo';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';
import { canRecordSession, getCurrentUser } from '../../services/auth';
import { MicroTask } from '../../services/openai';
import {
  calculateStreak,
  getAllPendingTasks,
  getEntries,
  getLatestEntry,
  JournalEntry,
  toggleTaskComplete,
} from '../../services/storage';
import { getSessionCount } from '../../services/user';

interface PendingTaskWithMeta {
  task: MicroTask;
  entryId: string;
  entryDate: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('');
  const [lastEntry, setLastEntry] = useState<JournalEntry | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [pendingTasks, setPendingTasks] = useState<PendingTaskWithMeta[]>([]);
  const [dailyUsage, setDailyUsage] = useState({ used: 0, max: 1 }); // Free: 1/day, Premium: 10/day
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      updateGreeting();
      loadUserName();
    }, [language])
  );

  async function loadUserName() {
    try {
      const name = await AsyncStorage.getItem('@user_name');
      if (name) setUserName(name);
    } catch (e) {
      console.error('Error loading user name:', e);
    }
  }

  function updateGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting(t('home.greeting_morning'));
    } else if (hour < 18) {
      setGreeting(t('home.greeting_afternoon'));
    } else {
      setGreeting(t('home.greeting_evening'));
    }
  }

  async function loadData() {
    try {
      const [entry, count, streakCount, pending, entries] = await Promise.all([
        getLatestEntry(),
        getSessionCount(),
        calculateStreak(),
        getAllPendingTasks(),
        getEntries(),
      ]);

      setLastEntry(entry);
      setSessionCount(count);
      setStreak(streakCount);
      setPendingTasks(pending.slice(0, 3)); // Show only first 3 pending tasks
      setRecentEntries(entries.slice(0, 7)); // Last 7 sessions for journey list

      // Load daily usage from Supabase
      const user = await getCurrentUser();
      if (user) {
        const usage = await canRecordSession(user.id);
        setDailyUsage({ used: usage.sessionsToday, max: usage.maxSessions });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  const handleToggleTask = async (taskId: string) => {
    const taskMeta = pendingTasks.find((p) => p.task.id === taskId);
    if (taskMeta) {
      await toggleTaskComplete(taskMeta.entryId, taskId);
      loadData();
    }
  };

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const getMoodEmoji = (mood: string) => {
    const moodLower = mood?.toLowerCase() || '';
    if (moodLower.includes('stress') || moodLower.includes('anxious')) return '😰';
    if (moodLower.includes('happy') || moodLower.includes('joy')) return '😊';
    if (moodLower.includes('sad') || moodLower.includes('down')) return '😔';
    if (moodLower.includes('calm') || moodLower.includes('peace')) return '😌';
    if (moodLower.includes('overwhelm')) return '🤯';
    if (moodLower.includes('focus')) return '🎯';
    return '💭';
  };

  const tasksForChecklist = pendingTasks.map((p) => p.task);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tutorial Overlay - shows once after onboarding */}
      <Tutorial />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Logo */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>
              {userName ? `${greeting}, ${userName}` : greeting}
            </Text>
            <Text style={[styles.prompt, { color: colors.text }]}>{t('home.ready_prompt')}</Text>
          </View>
          <UnbindLogo size={40} animation="breathing" />
        </Animated.View>

        {/* Quick Record Card */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <TouchableOpacity
            style={styles.recordCard}
            onPress={() => router.push('/(tabs)/record')}
            activeOpacity={0.9}
          >
            <View style={styles.recordIconContainer}>
              <View style={styles.recordIcon}>
                <Ionicons name="mic" size={32} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.recordTitle}>{t('home.start_session')}</Text>
            <Text style={styles.recordSubtitle}>{t('home.start_session_sub')}</Text>
            
            {/* Daily usage indicator */}
            <View style={styles.usageContainer}>
              <View style={styles.usageBar}>
                <View 
                  style={[
                    styles.usageFill, 
                    { width: `${Math.min((dailyUsage.used / dailyUsage.max) * 100, 100)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.usageText}>
                {dailyUsage.used}/{dailyUsage.max} today
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Streak Card - Duolingo style */}
        {sessionCount > 0 && (
          <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.streakSection}>
            <StreakCard streak={streak} lastSessionDate={lastEntry?.date} />
          </Animated.View>
        )}

        {/* Session Journey List - Shows progress over time */}
        {recentEntries.length > 0 && (
          <Animated.View entering={FadeInUp.delay(350).duration(500)} style={styles.journeySection}>
            <SessionJourneyList entries={recentEntries} maxItems={5} />
          </Animated.View>
        )}

        {/* Stats - Compact */}
        <Animated.View
          entering={FadeInUp.delay(350).duration(500)}
          style={styles.statsContainer}
        >
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{sessionCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('home.sessions')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <StreakCard streak={streak} compact />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('home.streak')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {sessionCount > 0 ? Math.round(sessionCount * 2.5) : 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('home.minutes')}</Text>
          </View>
        </Animated.View>

        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <Animated.View entering={FadeInUp.delay(350).duration(500)}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.pending_tasks')}</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
                <Text style={[styles.viewAllLink, { color: colors.primary }]}>{t('home.view_all')}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.tasksCard, { backgroundColor: colors.card }]}>
              <TaskChecklist
                tasks={tasksForChecklist}
                onToggleTask={handleToggleTask}
                editable={false}
                showProgress={false}
                compact={true}
              />
            </View>
          </Animated.View>
        )}

        {/* Last Entry */}
        {lastEntry && pendingTasks.length === 0 && (
          <Animated.View entering={FadeInUp.delay(400).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.last_session')}</Text>
            <TouchableOpacity
              style={[styles.entryCard, { backgroundColor: colors.card }]}
              onPress={() => router.push('/(tabs)/history')}
            >
              <View style={styles.entryHeader}>
                <Text style={styles.entryMood}>{getMoodEmoji(lastEntry.mood)}</Text>
                <Text style={[styles.entryDate, { color: colors.textMuted }]}>{formatDate(lastEntry.date)}</Text>
              </View>
              <Text style={[styles.entrySummary, { color: colors.textSecondary }]} numberOfLines={2}>
                {lastEntry.summary}
              </Text>
              <View style={styles.entryFooter}>
                <Text style={[styles.entryMoodText, { color: colors.textMuted }]}>{lastEntry.mood}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Welcome state - Show when no sessions yet */}
        {sessionCount === 0 && pendingTasks.length === 0 && (
          <Animated.View entering={FadeInUp.delay(400).duration(500)}>
            <View style={[styles.welcomeCard, { backgroundColor: colors.card }]}>
              <UnbindLogo size={64} animation="pulse" showGlow />
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>
                Welcome to Unbind
              </Text>
              <Text style={[styles.welcomeText, { color: colors.textMuted }]}>
                {t('home.tip_text')}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Empty state for tasks */}
        {sessionCount > 0 && pendingTasks.length === 0 && !lastEntry && (
          <Animated.View entering={FadeInUp.delay(400).duration(500)}>
            <View style={[styles.emptyTasksCard, { backgroundColor: colors.success + '15' }]}>
              <Ionicons name="checkmark-done" size={32} color={colors.success} />
              <Text style={[styles.emptyTasksText, { color: colors.success }]}>{t('home.no_tasks')}</Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  prompt: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  recordCard: {
    backgroundColor: '#6366F1',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  recordIconContainer: {
    marginBottom: 16,
  },
  recordIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  recordSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  usageContainer: {
    width: '100%',
    marginTop: 16,
    alignItems: 'center',
  },
  usageBar: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 2,
  },
  usageText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 6,
  },
  streakSection: {
    marginBottom: 16,
  },
  journeySection: {
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  tasksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryMood: {
    fontSize: 24,
  },
  entryDate: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  entrySummary: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryMoodText: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyTasksCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTasksText: {
    fontSize: 15,
    color: '#166534',
    textAlign: 'center',
  },
});
