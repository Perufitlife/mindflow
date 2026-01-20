// services/notifications.ts - Push Notifications Service
// Handles permission requests and scheduling local notifications

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const NOTIFICATION_SETTINGS_KEY = '@notification_settings';
const NOTIFICATION_TOKEN_KEY = '@notification_token';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ============================================
// TYPES
// ============================================

export interface NotificationSettings {
  enabled: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderHour: number; // 0-23
  dailyReminderMinute: number; // 0-59
  streakReminderEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  dailyReminderEnabled: true,
  dailyReminderHour: 9, // 9:00 AM
  dailyReminderMinute: 0,
  streakReminderEnabled: true,
};

// ============================================
// PERMISSIONS
// ============================================

/**
 * Request notification permissions from the user
 * Returns true if granted, false otherwise
 */
export async function requestPermissions(): Promise<boolean> {
  // Check if physical device (notifications don't work on simulators)
  if (!Device.isDevice) {
    console.log('Notifications require a physical device');
    return false;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permissions not granted');
    return false;
  }

  // Configure Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      lightColor: '#6366F1',
    });
  }

  console.log('Notification permissions granted');
  return true;
}

/**
 * Check if notifications are currently permitted
 */
export async function checkPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// ============================================
// SETTINGS
// ============================================

/**
 * Get current notification settings
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error loading notification settings:', e);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save notification settings
 */
export async function saveNotificationSettings(
  settings: Partial<NotificationSettings>
): Promise<void> {
  try {
    const current = await getNotificationSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving notification settings:', e);
  }
}

// ============================================
// SCHEDULING
// ============================================

/**
 * Schedule a daily reminder notification
 */
export async function scheduleDailyReminder(
  hour: number,
  minute: number
): Promise<string | null> {
  try {
    // Cancel existing daily reminders first
    await cancelDailyReminders();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for your daily check-in',
        body: 'Take 2 minutes to clear your mind and set your intentions.',
        data: { type: 'daily_reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    console.log('Daily reminder scheduled:', identifier, `at ${hour}:${minute}`);
    return identifier;
  } catch (e) {
    console.error('Error scheduling daily reminder:', e);
    return null;
  }
}

/**
 * Schedule a streak reminder for evening (if user hasn't recorded today)
 */
export async function scheduleStreakReminder(): Promise<string | null> {
  try {
    // Cancel existing streak reminders first
    await cancelStreakReminders();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Don't lose your streak!",
        body: 'You haven\'t recorded today. Keep your momentum going!',
        data: { type: 'streak_reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20, // 8 PM
        minute: 0,
      },
    });

    console.log('Streak reminder scheduled:', identifier);
    return identifier;
  } catch (e) {
    console.error('Error scheduling streak reminder:', e);
    return null;
  }
}

/**
 * Schedule a one-time notification
 */
export async function scheduleNotification(
  title: string,
  body: string,
  secondsFromNow: number,
  data?: Record<string, any>
): Promise<string | null> {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsFromNow,
      },
    });

    console.log('Notification scheduled:', identifier);
    return identifier;
  } catch (e) {
    console.error('Error scheduling notification:', e);
    return null;
  }
}

/**
 * Send an immediate notification (for testing)
 */
export async function sendImmediateNotification(
  title: string,
  body: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null, // null = immediate
  });
}

// ============================================
// CANCELLATION
// ============================================

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('All notifications cancelled');
}

/**
 * Cancel daily reminder notifications
 */
export async function cancelDailyReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  
  for (const notification of scheduled) {
    if (notification.content.data?.type === 'daily_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Cancel streak reminder notifications
 */
export async function cancelStreakReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  
  for (const notification of scheduled) {
    if (notification.content.data?.type === 'streak_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Cancel a specific notification by ID
 */
export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

// ============================================
// UTILITY
// ============================================

/**
 * Get all currently scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Enable notifications with default settings
 */
export async function enableNotifications(): Promise<boolean> {
  const hasPermission = await requestPermissions();
  
  if (!hasPermission) {
    return false;
  }

  const settings = await getNotificationSettings();
  
  // Schedule daily reminder
  if (settings.dailyReminderEnabled) {
    await scheduleDailyReminder(settings.dailyReminderHour, settings.dailyReminderMinute);
  }
  
  // Schedule streak reminder
  if (settings.streakReminderEnabled) {
    await scheduleStreakReminder();
  }

  // Save that notifications are enabled
  await saveNotificationSettings({ enabled: true });
  
  return true;
}

/**
 * Disable all notifications
 */
export async function disableNotifications(): Promise<void> {
  await cancelAllNotifications();
  await saveNotificationSettings({ enabled: false });
}

/**
 * Update daily reminder time
 */
export async function updateDailyReminderTime(hour: number, minute: number): Promise<void> {
  await saveNotificationSettings({ 
    dailyReminderHour: hour, 
    dailyReminderMinute: minute 
  });
  
  const settings = await getNotificationSettings();
  if (settings.enabled && settings.dailyReminderEnabled) {
    await scheduleDailyReminder(hour, minute);
  }
}

// ============================================
// LISTENERS
// ============================================

/**
 * Add listener for when a notification is received while app is foregrounded
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for when user taps on a notification
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
