// services/weekly-summary.ts - Weekly Summary System
// Calculates and displays weekly progress for retention

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllEntries, calculateStreak } from './storage';
import { getSessionCount } from './user';

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  sessions: number;
  tasksCompleted: number;
  totalTasks: number;
  minutesSaved: number;
  streak: number;
  previousWeekSessions: number;
  improvement: number; // percentage
  topBlocker: string | null;
  insights: string[];
}

const WEEKLY_SUMMARY_KEY = '@weekly_summary_last_shown';
const WEEKLY_DATA_KEY = '@weekly_data';

export async function calculateWeeklySummary(): Promise<WeeklySummary> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  
  const entries = await getAllEntries();
  const streak = await calculateStreak();
  
  // Filter entries from last 7 days
  const weekEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= weekStart && entryDate <= now;
  });
  
  // Calculate stats
  const sessions = weekEntries.length;
  let tasksCompleted = 0;
  let totalTasks = 0;
  const blockerCounts: Record<string, number> = {};
  
  weekEntries.forEach(entry => {
    if (entry.tasks) {
      totalTasks += entry.tasks.length;
      tasksCompleted += entry.tasks.filter(t => t.completed).length;
    }
    if (entry.blocker) {
      // Extract keywords from blockers
      const keywords = entry.blocker.toLowerCase().split(' ').filter(w => w.length > 4);
      keywords.forEach(word => {
        blockerCounts[word] = (blockerCounts[word] || 0) + 1;
      });
    }
  });
  
  // Find top blocker keyword
  let topBlocker: string | null = null;
  let maxCount = 0;
  Object.entries(blockerCounts).forEach(([word, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topBlocker = word;
    }
  });
  
  // Calculate previous week for comparison
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= prevWeekStart && entryDate < weekStart;
  });
  const previousWeekSessions = prevWeekEntries.length;
  
  // Calculate improvement
  let improvement = 0;
  if (previousWeekSessions > 0) {
    improvement = Math.round(((sessions - previousWeekSessions) / previousWeekSessions) * 100);
  } else if (sessions > 0) {
    improvement = 100;
  }
  
  // Estimate minutes saved (2.5 min per task completed vs 30 min traditional planning)
  const minutesSaved = tasksCompleted * 25; // 25 min saved per task
  
  // Generate insights
  const insights: string[] = [];
  
  if (sessions >= 5) {
    insights.push("You're building a strong consistency habit!");
  }
  if (tasksCompleted > totalTasks * 0.7) {
    insights.push("Great job completing most of your tasks!");
  }
  if (streak >= 3) {
    insights.push(`You're on a ${streak}-day streak. Keep it up!`);
  }
  if (improvement > 0) {
    insights.push(`${improvement}% more sessions than last week!`);
  }
  if (topBlocker) {
    insights.push(`"${topBlocker}" came up often. Consider addressing it.`);
  }
  
  // Default insight if none
  if (insights.length === 0) {
    insights.push("Keep journaling to see more personalized insights!");
  }
  
  return {
    weekStart: weekStart.toISOString(),
    weekEnd: now.toISOString(),
    sessions,
    tasksCompleted,
    totalTasks,
    minutesSaved,
    streak,
    previousWeekSessions,
    improvement,
    topBlocker,
    insights,
  };
}

export async function shouldShowWeeklySummary(): Promise<boolean> {
  try {
    const lastShown = await AsyncStorage.getItem(WEEKLY_SUMMARY_KEY);
    
    if (!lastShown) {
      // Never shown, check if it's Sunday/Monday
      const now = new Date();
      const day = now.getDay();
      return day === 0 || day === 1; // Sunday or Monday
    }
    
    const lastShownDate = new Date(lastShown);
    const now = new Date();
    const daysSinceShown = Math.floor((now.getTime() - lastShownDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Show if it's been more than 6 days and it's Sunday or Monday
    if (daysSinceShown >= 6) {
      const day = now.getDay();
      return day === 0 || day === 1;
    }
    
    return false;
  } catch (e) {
    console.error('Error checking weekly summary:', e);
    return false;
  }
}

export async function markWeeklySummaryShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(WEEKLY_SUMMARY_KEY, new Date().toISOString());
  } catch (e) {
    console.error('Error marking weekly summary shown:', e);
  }
}

export async function saveWeeklySummary(summary: WeeklySummary): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(WEEKLY_DATA_KEY);
    const summaries: WeeklySummary[] = existing ? JSON.parse(existing) : [];
    summaries.push(summary);
    // Keep last 12 weeks
    const trimmed = summaries.slice(-12);
    await AsyncStorage.setItem(WEEKLY_DATA_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Error saving weekly summary:', e);
  }
}

export async function getWeeklySummaries(): Promise<WeeklySummary[]> {
  try {
    const data = await AsyncStorage.getItem(WEEKLY_DATA_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error getting weekly summaries:', e);
    return [];
  }
}
