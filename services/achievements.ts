// services/achievements.ts - Achievement System
// Gamification for engagement and retention

import AsyncStorage from '@react-native-async-storage/async-storage';
import posthog from '../posthog';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  xp: number;
  condition: AchievementCondition;
  unlockedAt?: string;
}

export interface AchievementCondition {
  type: 'sessions' | 'tasks' | 'streak' | 'time' | 'first';
  value: number;
  comparison?: 'gte' | 'lte' | 'eq';
}

export interface AchievementProgress {
  unlockedAchievements: string[];
  totalXP: number;
  level: number;
}

const ACHIEVEMENTS_KEY = '@achievements_progress';

// Level thresholds
const LEVELS = [
  { level: 1, name: 'Beginner', xpRequired: 0 },
  { level: 2, name: 'Explorer', xpRequired: 500 },
  { level: 3, name: 'Achiever', xpRequired: 1500 },
  { level: 4, name: 'Master', xpRequired: 3500 },
  { level: 5, name: 'Legend', xpRequired: 7000 },
];

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_session',
    name: 'First Flame',
    description: 'Complete your first session',
    icon: 'flame',
    color: '#F59E0B',
    xp: 200,
    condition: { type: 'first', value: 1 },
  },
  {
    id: 'streak_3',
    name: 'Getting Started',
    description: '3-day streak',
    icon: 'calendar',
    color: '#10B981',
    xp: 150,
    condition: { type: 'streak', value: 3, comparison: 'gte' },
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day streak',
    icon: 'trophy',
    color: '#F59E0B',
    xp: 500,
    condition: { type: 'streak', value: 7, comparison: 'gte' },
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: '30-day streak',
    icon: 'medal',
    color: '#8B5CF6',
    xp: 2000,
    condition: { type: 'streak', value: 30, comparison: 'gte' },
  },
  {
    id: 'tasks_10',
    name: 'Task Tackler',
    description: 'Complete 10 tasks',
    icon: 'checkmark-done',
    color: '#10B981',
    xp: 300,
    condition: { type: 'tasks', value: 10, comparison: 'gte' },
  },
  {
    id: 'tasks_50',
    name: 'Productivity Pro',
    description: 'Complete 50 tasks',
    icon: 'rocket',
    color: '#6366F1',
    xp: 800,
    condition: { type: 'tasks', value: 50, comparison: 'gte' },
  },
  {
    id: 'tasks_100',
    name: 'Century Club',
    description: 'Complete 100 tasks',
    icon: 'star',
    color: '#F59E0B',
    xp: 1500,
    condition: { type: 'tasks', value: 100, comparison: 'gte' },
  },
  {
    id: 'sessions_5',
    name: 'Regular',
    description: 'Complete 5 sessions',
    icon: 'mic',
    color: '#6366F1',
    xp: 250,
    condition: { type: 'sessions', value: 5, comparison: 'gte' },
  },
  {
    id: 'sessions_20',
    name: 'Committed',
    description: 'Complete 20 sessions',
    icon: 'heart',
    color: '#EC4899',
    xp: 600,
    condition: { type: 'sessions', value: 20, comparison: 'gte' },
  },
  {
    id: 'sessions_50',
    name: 'Devoted',
    description: 'Complete 50 sessions',
    icon: 'diamond',
    color: '#8B5CF6',
    xp: 1200,
    condition: { type: 'sessions', value: 50, comparison: 'gte' },
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Session before 7am',
    icon: 'sunny',
    color: '#F59E0B',
    xp: 100,
    condition: { type: 'time', value: 7, comparison: 'lte' },
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Session after 10pm',
    icon: 'moon',
    color: '#8B5CF6',
    xp: 100,
    condition: { type: 'time', value: 22, comparison: 'gte' },
  },
];

export async function getAchievementProgress(): Promise<AchievementProgress> {
  try {
    const data = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading achievements:', e);
  }
  return { unlockedAchievements: [], totalXP: 0, level: 1 };
}

export async function saveAchievementProgress(progress: AchievementProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Error saving achievements:', e);
  }
}

export function calculateLevel(xp: number): { level: number; name: string; progress: number } {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];
  
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || LEVELS[i];
      break;
    }
  }
  
  const progressToNext = nextLevel.xpRequired > currentLevel.xpRequired
    ? (xp - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)
    : 1;
  
  return {
    level: currentLevel.level,
    name: currentLevel.name,
    progress: progressToNext,
  };
}

export async function checkAndUnlockAchievements(stats: {
  sessions: number;
  tasksCompleted: number;
  streak: number;
  sessionHour?: number;
}): Promise<Achievement[]> {
  const progress = await getAchievementProgress();
  const newlyUnlocked: Achievement[] = [];
  
  for (const achievement of ACHIEVEMENTS) {
    // Skip if already unlocked
    if (progress.unlockedAchievements.includes(achievement.id)) {
      continue;
    }
    
    let unlocked = false;
    const { type, value, comparison = 'gte' } = achievement.condition;
    
    switch (type) {
      case 'first':
        unlocked = stats.sessions >= 1;
        break;
      case 'sessions':
        unlocked = compareValue(stats.sessions, value, comparison);
        break;
      case 'tasks':
        unlocked = compareValue(stats.tasksCompleted, value, comparison);
        break;
      case 'streak':
        unlocked = compareValue(stats.streak, value, comparison);
        break;
      case 'time':
        if (stats.sessionHour !== undefined) {
          unlocked = compareValue(stats.sessionHour, value, comparison);
        }
        break;
    }
    
    if (unlocked) {
      progress.unlockedAchievements.push(achievement.id);
      progress.totalXP += achievement.xp;
      achievement.unlockedAt = new Date().toISOString();
      newlyUnlocked.push(achievement);
      
      // Track in analytics
      posthog.capture('achievement_unlocked', {
        achievement_id: achievement.id,
        achievement_name: achievement.name,
        xp_gained: achievement.xp,
        total_xp: progress.totalXP,
      });
    }
  }
  
  if (newlyUnlocked.length > 0) {
    progress.level = calculateLevel(progress.totalXP).level;
    await saveAchievementProgress(progress);
  }
  
  return newlyUnlocked;
}

function compareValue(actual: number, target: number, comparison: 'gte' | 'lte' | 'eq'): boolean {
  switch (comparison) {
    case 'gte': return actual >= target;
    case 'lte': return actual <= target;
    case 'eq': return actual === target;
    default: return false;
  }
}

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

export function getUnlockedAchievements(unlockedIds: string[]): Achievement[] {
  return ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id)).map(a => ({
    ...a,
    unlockedAt: new Date().toISOString(),
  }));
}

export function getLockedAchievements(unlockedIds: string[]): Achievement[] {
  return ACHIEVEMENTS.filter(a => !unlockedIds.includes(a.id));
}
