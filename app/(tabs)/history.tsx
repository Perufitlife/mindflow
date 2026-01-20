// app/(tabs)/history.tsx - History Screen
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import UnbindLogo from '../../components/UnbindLogo';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';
import { getEntries, JournalEntry } from '../../services/storage';

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  async function loadEntries() {
    try {
      const data = await getEntries();
      setEntries(data);
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  }

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
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  const getMoodEmoji = (mood: string) => {
    const moodLower = mood?.toLowerCase() || '';
    if (moodLower.includes('stress') || moodLower.includes('anxious')) return '😰';
    if (moodLower.includes('happy') || moodLower.includes('joy')) return '😊';
    if (moodLower.includes('sad') || moodLower.includes('down')) return '😔';
    if (moodLower.includes('calm') || moodLower.includes('peace')) return '😌';
    if (moodLower.includes('angry') || moodLower.includes('frustrat')) return '😤';
    if (moodLower.includes('excited') || moodLower.includes('energi')) return '🤩';
    if (moodLower.includes('tired') || moodLower.includes('exhaust')) return '😴';
    if (moodLower.includes('overwhelm')) return '🤯';
    if (moodLower.includes('focus')) return '🎯';
    return '💭';
  };

  const getTaskProgress = (entry: JournalEntry) => {
    if (!entry.tasks || entry.tasks.length === 0) return null;
    const completed = entry.tasks.filter((t) => t.completed).length;
    return { completed, total: entry.tasks.length };
  };

  const renderEntry = ({ item, index }: { item: JournalEntry; index: number }) => {
    const taskProgress = getTaskProgress(item);

    return (
      <Animated.View entering={FadeInUp.delay(index * 50).duration(300)}>
        <TouchableOpacity
          style={[styles.entryCard, { backgroundColor: colors.card }]}
          onPress={() => setSelectedEntry(selectedEntry?.id === item.id ? null : item)}
          activeOpacity={0.7}
        >
          <View style={styles.entryHeader}>
            <Text style={styles.entryMood}>{getMoodEmoji(item.mood)}</Text>
            <View style={styles.entryMeta}>
              <Text style={[styles.entryDate, { color: colors.text }]}>{formatDate(item.date)}</Text>
              <Text style={[styles.entryTime, { color: colors.textMuted }]}>{formatTime(item.date)}</Text>
            </View>
            {taskProgress && (
              <View style={[styles.taskBadge, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="checkbox-outline" size={14} color={colors.success} />
                <Text style={[styles.taskBadgeText, { color: colors.success }]}>
                  {taskProgress.completed}/{taskProgress.total}
                </Text>
              </View>
            )}
          </View>

          {item.blocker && (
            <View style={[styles.blockerRow, { backgroundColor: colors.error + '15' }]}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={[styles.blockerText, { color: colors.error }]} numberOfLines={1}>
                {item.blocker}
              </Text>
            </View>
          )}

          <Text
            style={[styles.entrySummary, { color: colors.textSecondary }]}
            numberOfLines={selectedEntry?.id === item.id ? undefined : 2}
          >
            {item.summary}
          </Text>

          <View style={styles.entryMoodRow}>
            <Text style={[styles.entryMoodText, { color: colors.primary, backgroundColor: colors.primaryLight }]}>{item.mood}</Text>
          </View>

          {selectedEntry?.id === item.id && (
            <View style={[styles.expandedContent, { borderTopColor: colors.borderLight }]}>
              {/* Tasks */}
              {item.tasks && item.tasks.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="flash" size={16} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Micro-actions</Text>
                  </View>
                  {item.tasks.map((task) => (
                    <View key={task.id} style={styles.taskItem}>
                      <View
                        style={[
                          styles.taskCheckbox,
                          { borderColor: colors.border },
                          task.completed && { backgroundColor: colors.success, borderColor: colors.success },
                        ]}
                      >
                        {task.completed && (
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.taskTitle,
                          { color: colors.textSecondary },
                          task.completed && { color: colors.textMuted, textDecorationLine: 'line-through' },
                        ]}
                      >
                        {task.title}
                      </Text>
                      <Text style={[styles.taskDuration, { color: colors.textMuted }]}>{task.duration}m</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Legacy insights */}
              {item.insights && item.insights.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="bulb-outline" size={16} color={colors.warning} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('history.insights')}</Text>
                  </View>
                  {item.insights.map((insight, i) => (
                    <Text key={i} style={[styles.sectionItem, { color: colors.textMuted }]}>
                      • {insight}
                    </Text>
                  ))}
                </View>
              )}

              {/* Legacy actions */}
              {item.actions && item.actions.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('history.actions')}</Text>
                  </View>
                  {item.actions.map((action, i) => (
                    <Text key={i} style={[styles.sectionItem, { color: colors.textMuted }]}>
                      • {action}
                    </Text>
                  ))}
                </View>
              )}

              {item.transcript && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="document-text-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Transcript</Text>
                  </View>
                  <Text style={[styles.transcript, { color: colors.textMuted }]}>{item.transcript}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.expandIndicator}>
            <Ionicons
              name={selectedEntry?.id === item.id ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.borderLight }]}>
        <Ionicons name="journal-outline" size={48} color={colors.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('history.no_entries')}</Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('history.no_entries_sub')}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('history.title')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {entries.length} {entries.length === 1 ? t('history.entry') : t('history.entries')}
          </Text>
        </View>
        <UnbindLogo size={40} animation="breathing" />
      </View>

      {/* Entries List */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
      />
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
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#F9FAFB',
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  entryCard: {
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
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryMood: {
    fontSize: 28,
    marginRight: 12,
  },
  entryMeta: {
    flex: 1,
  },
  entryDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  entryTime: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  taskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  taskBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  blockerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  blockerText: {
    fontSize: 13,
    color: '#991B1B',
    flex: 1,
  },
  entrySummary: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  entryMoodRow: {
    flexDirection: 'row',
  },
  entryMoodText: {
    fontSize: 13,
    color: '#6366F1',
    textTransform: 'capitalize',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sectionItem: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginLeft: 22,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  taskCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckboxCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  taskTitleCompleted: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  taskDuration: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  transcript: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  expandIndicator: {
    alignItems: 'center',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
