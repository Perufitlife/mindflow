// services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MicroTask } from './openai';

const ENTRIES_KEY = '@unbind_entries';

export interface JournalEntry {
  id: string;
  date: string;
  audioUri: string;
  transcript: string;
  summary: string;
  blocker: string;
  mood: string;
  tasks: MicroTask[];
  isFavorite?: boolean;
  // Legacy fields for backwards compatibility
  insights?: string[];
  actions?: string[];
}

/**
 * Generate a unique ID for entries
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Save a new journal entry
 */
export async function saveEntry(
  entry: Omit<JournalEntry, 'id' | 'date'>
): Promise<JournalEntry> {
  const entries = await getEntries();

  const newEntry: JournalEntry = {
    ...entry,
    id: generateId(),
    date: new Date().toISOString(),
  };

  entries.unshift(newEntry);

  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));

  return newEntry;
}

/**
 * Update an existing entry
 */
export async function updateEntry(
  id: string,
  updates: Partial<JournalEntry>
): Promise<JournalEntry | null> {
  const entries = await getEntries();
  const index = entries.findIndex((e) => e.id === id);

  if (index === -1) return null;

  entries[index] = { ...entries[index], ...updates };
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));

  return entries[index];
}

/**
 * Get all journal entries (newest first)
 */
export async function getEntries(): Promise<JournalEntry[]> {
  try {
    const data = await AsyncStorage.getItem(ENTRIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading entries:', error);
    return [];
  }
}

/**
 * Get a single entry by ID
 */
export async function getEntry(id: string): Promise<JournalEntry | null> {
  const entries = await getEntries();
  return entries.find((e) => e.id === id) || null;
}

/**
 * Delete an entry by ID
 */
export async function deleteEntry(id: string): Promise<void> {
  const entries = await getEntries();
  const filtered = entries.filter((e) => e.id !== id);
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(filtered));
}

/**
 * Get the count of entries
 */
export async function getEntryCount(): Promise<number> {
  const entries = await getEntries();
  return entries.length;
}

/**
 * Clear all entries (use with caution)
 */
export async function clearAllEntries(): Promise<void> {
  await AsyncStorage.removeItem(ENTRIES_KEY);
}

/**
 * Toggle task completion status
 */
export async function toggleTaskComplete(
  entryId: string,
  taskId: string
): Promise<JournalEntry | null> {
  const entries = await getEntries();
  const entryIndex = entries.findIndex((e) => e.id === entryId);

  if (entryIndex === -1) return null;

  const entry = entries[entryIndex];
  const taskIndex = entry.tasks.findIndex((t) => t.id === taskId);

  if (taskIndex === -1) return null;

  // Toggle completion
  entry.tasks[taskIndex].completed = !entry.tasks[taskIndex].completed;
  entry.tasks[taskIndex].completedAt = entry.tasks[taskIndex].completed
    ? new Date().toISOString()
    : undefined;

  entries[entryIndex] = entry;
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));

  return entry;
}

/**
 * Add a task to an entry
 */
export async function addTaskToEntry(
  entryId: string,
  task: Omit<MicroTask, 'id'>
): Promise<JournalEntry | null> {
  const entries = await getEntries();
  const entryIndex = entries.findIndex((e) => e.id === entryId);

  if (entryIndex === -1) return null;

  const newTask: MicroTask = {
    ...task,
    id: generateId(),
  };

  entries[entryIndex].tasks.push(newTask);
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));

  return entries[entryIndex];
}

/**
 * Remove a task from an entry
 */
export async function removeTaskFromEntry(
  entryId: string,
  taskId: string
): Promise<JournalEntry | null> {
  const entries = await getEntries();
  const entryIndex = entries.findIndex((e) => e.id === entryId);

  if (entryIndex === -1) return null;

  entries[entryIndex].tasks = entries[entryIndex].tasks.filter(
    (t) => t.id !== taskId
  );
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));

  return entries[entryIndex];
}

/**
 * Update a task in an entry
 */
export async function updateTask(
  entryId: string,
  taskId: string,
  updates: Partial<MicroTask>
): Promise<JournalEntry | null> {
  const entries = await getEntries();
  const entryIndex = entries.findIndex((e) => e.id === entryId);

  if (entryIndex === -1) return null;

  const taskIndex = entries[entryIndex].tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) return null;

  entries[entryIndex].tasks[taskIndex] = {
    ...entries[entryIndex].tasks[taskIndex],
    ...updates,
  };

  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  return entries[entryIndex];
}

/**
 * Get all pending tasks from all entries
 */
export async function getAllPendingTasks(): Promise<
  { task: MicroTask; entryId: string; entryDate: string }[]
> {
  const entries = await getEntries();
  const pendingTasks: { task: MicroTask; entryId: string; entryDate: string }[] = [];

  entries.forEach((entry) => {
    // Handle entries that don't have tasks array (legacy entries)
    const tasks = entry.tasks || [];
    tasks
      .filter((task) => !task.completed)
      .forEach((task) => {
        pendingTasks.push({
          task,
          entryId: entry.id,
          entryDate: entry.date,
        });
      });
  });

  return pendingTasks;
}

/**
 * Get task statistics
 */
export async function getTaskStats(): Promise<{
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completedToday: number;
}> {
  const entries = await getEntries();
  const today = new Date().toDateString();

  let totalTasks = 0;
  let completedTasks = 0;
  let completedToday = 0;

  entries.forEach((entry) => {
    // Handle entries that don't have tasks array (legacy entries)
    const tasks = entry.tasks || [];
    tasks.forEach((task) => {
      totalTasks++;
      if (task.completed) {
        completedTasks++;
        if (task.completedAt) {
          const completedDate = new Date(task.completedAt).toDateString();
          if (completedDate === today) {
            completedToday++;
          }
        }
      }
    });
  });

  return {
    totalTasks,
    completedTasks,
    pendingTasks: totalTasks - completedTasks,
    completedToday,
  };
}

/**
 * Get the most recent entry
 */
export async function getLatestEntry(): Promise<JournalEntry | null> {
  const entries = await getEntries();
  return entries.length > 0 ? entries[0] : null;
}

/**
 * Calculate streak (consecutive days with entries)
 */
export async function calculateStreak(): Promise<number> {
  const entries = await getEntries();
  if (entries.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entryDates = new Set<string>();
  entries.forEach((entry) => {
    const date = new Date(entry.date);
    date.setHours(0, 0, 0, 0);
    entryDates.add(date.toISOString());
  });

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    checkDate.setHours(0, 0, 0, 0);

    if (entryDates.has(checkDate.toISOString())) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}

/**
 * Toggle favorite status for an entry
 */
export async function toggleFavorite(entryId: string): Promise<JournalEntry | null> {
  const entries = await getEntries();
  const index = entries.findIndex((e) => e.id === entryId);

  if (index === -1) return null;

  entries[index].isFavorite = !entries[index].isFavorite;
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));

  return entries[index];
}

/**
 * Get all favorite entries
 */
export async function getFavoriteEntries(): Promise<JournalEntry[]> {
  const entries = await getEntries();
  return entries.filter((e) => e.isFavorite === true);
}

/**
 * Get count of favorite entries
 */
export async function getFavoriteCount(): Promise<number> {
  const favorites = await getFavoriteEntries();
  return favorites.length;
}
