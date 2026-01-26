// components/SessionJourneyList.tsx
// Shows recent sessions in a compact list format to reinforce habit building
// "This isn't a one-time app. This scales over time."

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { JournalEntry } from '../services/storage';

interface SessionJourneyListProps {
  entries: JournalEntry[];
  maxItems?: number;
}

export default function SessionJourneyList({ 
  entries, 
  maxItems = 7 
}: SessionJourneyListProps) {
  const { colors } = useTheme();

  // Get display entries (most recent first, limited to maxItems)
  const displayEntries = entries.slice(0, maxItems);

  // Format day of week from date string
  const formatDay = (dateString: string): string => {
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
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Get snippet from mood, blocker, or summary
  const getSnippet = (entry: JournalEntry): string => {
    const text = entry.mood || entry.blocker || entry.summary || 'Session completed';
    // Truncate to 28 characters
    if (text.length > 28) {
      return text.substring(0, 25) + '...';
    }
    return text;
  };

  // Check if entry is from today
  const isToday = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (displayEntries.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <Ionicons name="book-outline" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Your Journey</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="leaf-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Your journey starts with your first session
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="book-outline" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Your Journey</Text>
        <Text style={[styles.countBadge, { backgroundColor: colors.primaryLight, color: colors.primary }]}>
          {entries.length} sessions
        </Text>
      </View>

      {/* Session List */}
      <View style={styles.list}>
        {displayEntries.map((entry, index) => (
          <Animated.View 
            key={entry.id}
            entering={FadeInRight.delay(index * 50).duration(300)}
            style={[
              styles.sessionItem,
              index < displayEntries.length - 1 && { 
                borderBottomWidth: 1, 
                borderBottomColor: colors.borderLight 
              }
            ]}
          >
            {/* Day */}
            <Text style={[
              styles.dayText, 
              { color: colors.textMuted },
              isToday(entry.date) && { color: colors.primary, fontWeight: '600' }
            ]}>
              {formatDay(entry.date)}
            </Text>

            {/* Indicator dot */}
            <View style={[
              styles.dot,
              { backgroundColor: colors.success },
              isToday(entry.date) && { backgroundColor: colors.primary }
            ]} />

            {/* Snippet */}
            <Text 
              style={[styles.snippetText, { color: colors.text }]}
              numberOfLines={1}
            >
              "{getSnippet(entry)}"
            </Text>
          </Animated.View>
        ))}
      </View>

      {/* Motivation footer */}
      <View style={styles.footer}>
        {entries.length < 7 ? (
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            {7 - entries.length} more to complete your first week!
          </Text>
        ) : entries.length < 30 ? (
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            {30 - entries.length} more for a full month streak!
          </Text>
        ) : (
          <Text style={[styles.footerText, { color: colors.success }]}>
            Amazing commitment! Keep it up!
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  list: {
    gap: 0,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    width: 60,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  snippetText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
