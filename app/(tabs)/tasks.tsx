// app/(tabs)/tasks.tsx - Global Tasks View
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import UnbindLogo from '../../components/UnbindLogo';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';
import { MicroTask } from '../../services/openai';
import {
  getAllPendingTasks,
  getTaskStats,
  toggleTaskComplete,
} from '../../services/storage';

type FilterType = 'today' | 'week' | 'all';

interface TaskWithMeta {
  task: MicroTask;
  entryId: string;
  entryDate: string;
}

export default function TasksScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tasks, setTasks] = useState<TaskWithMeta[]>([]);
  const [stats, setStats] = useState({
    completedToday: 0,
    pendingTasks: 0,
    totalTasks: 0,
  });
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [])
  );

  async function loadTasks() {
    try {
      const [pendingTasks, taskStats] = await Promise.all([
        getAllPendingTasks(),
        getTaskStats(),
      ]);
      setTasks(pendingTasks);
      setStats({
        completedToday: taskStats.completedToday,
        pendingTasks: taskStats.pendingTasks,
        totalTasks: taskStats.totalTasks,
      });
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, []);

  const handleToggleTask = async (entryId: string, taskId: string) => {
    await toggleTaskComplete(entryId, taskId);
    loadTasks();
  };

  const filterTasks = (taskList: TaskWithMeta[]): TaskWithMeta[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    switch (filter) {
      case 'today':
        return taskList.filter((t) => new Date(t.entryDate) >= today);
      case 'week':
        return taskList.filter((t) => new Date(t.entryDate) >= weekAgo);
      default:
        return taskList;
    }
  };

  const filteredTasks = filterTasks(tasks);

  const formatDate = (dateString: string) => {
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
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getDurationColor = (duration: number) => {
    if (duration <= 10) return '#10B981';
    if (duration <= 20) return '#F59E0B';
    return '#6366F1';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>{t('tasks.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {stats.pendingTasks} {t('tasks.pending')}
          </Text>
        </View>
        <UnbindLogo size={40} animation="breathing" />
      </View>

      {/* Stats Card */}
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.completedToday}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('tasks.completed_today')}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.pendingTasks}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('tasks.pending')}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['today', 'week', 'all'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab, 
              { backgroundColor: colors.border },
              filter === f && { backgroundColor: colors.text }
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: colors.textMuted },
                filter === f && { color: colors.background },
              ]}
            >
              {f === 'today'
                ? t('tasks.filter_today')
                : f === 'week'
                ? t('tasks.filter_week')
                : t('tasks.filter_all')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredTasks.length > 0 ? (
          filteredTasks.map((item, index) => (
            <Animated.View
              key={`${item.entryId}-${item.task.id}`}
              entering={FadeInDown.delay(index * 50)}
            >
              <TouchableOpacity
                style={[styles.taskCard, { backgroundColor: colors.card }]}
                onPress={() => handleToggleTask(item.entryId, item.task.id)}
                activeOpacity={0.7}
              >
                {/* Checkbox */}
                <View style={[styles.checkbox, { borderColor: colors.border }]}>
                  <View style={styles.checkboxInner} />
                </View>

                {/* Task Content */}
                <View style={styles.taskContent}>
                  <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.task.title}
                  </Text>
                  <View style={styles.taskMeta}>
                    <View
                      style={[
                        styles.durationBadge,
                        {
                          backgroundColor: `${getDurationColor(item.task.duration)}15`,
                        },
                      ]}
                    >
                      <Ionicons
                        name="time-outline"
                        size={12}
                        color={getDurationColor(item.task.duration)}
                      />
                      <Text
                        style={[
                          styles.durationText,
                          { color: getDurationColor(item.task.duration) },
                        ]}
                      >
                        {item.task.duration} min
                      </Text>
                    </View>
                    <Text style={[styles.taskDate, { color: colors.textMuted }]}>{formatDate(item.entryDate)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="checkmark-done-outline" size={48} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('tasks.no_tasks')}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>{t('tasks.no_tasks_sub')}</Text>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: '#111827',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  taskDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
