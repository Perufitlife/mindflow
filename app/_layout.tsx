// app/_layout.tsx - Root Layout
import { Stack } from 'expo-router';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ThemeProvider } from '../contexts/ThemeContext';
// Sentry temporarily disabled for build compatibility
// import '../sentry-init';

// Lazy imports to catch initialization errors
let supabase: any = null;
let posthog: any = null;
let initializeRevenueCat: any = null;
let syncUserWithRevenueCat: any = null;

try {
  supabase = require('../config/supabase').supabase;
} catch (e) {
  console.error('[LAYOUT] Failed to import supabase:', e);
}

try {
  posthog = require('../posthog').default;
} catch (e) {
  console.error('[LAYOUT] Failed to import posthog:', e);
}

try {
  const subscriptions = require('../services/subscriptions');
  initializeRevenueCat = subscriptions.initializeRevenueCat;
  syncUserWithRevenueCat = subscriptions.syncUserWithRevenueCat;
} catch (e) {
  console.error('[LAYOUT] Failed to import subscriptions:', e);
}

let trackReturnDay: any = null;
let RetentionEvents: any = null;
try {
  const analytics = require('../services/analytics');
  trackReturnDay = analytics.trackReturnDay;
  RetentionEvents = analytics.RetentionEvents;
} catch (e) {
  console.error('[LAYOUT] Failed to import analytics:', e);
}

// User state imports
let getSessionCount: any = null;
let hasCompletedOnboarding: any = null;
let getDaysSinceInstall: any = null;
try {
  const user = require('../services/user');
  getSessionCount = user.getSessionCount;
  hasCompletedOnboarding = user.hasCompletedOnboarding;
  getDaysSinceInstall = user.getDaysSinceInstall;
} catch (e) {
  console.error('[LAYOUT] Failed to import user:', e);
}

// Environment config
let getEnvironment: any = null;
let getDeviceCountry: any = null;
let getDeviceLocale: any = null;
try {
  const envConfig = require('../config/env');
  getEnvironment = envConfig.getEnvironment;
  getDeviceCountry = envConfig.getDeviceCountry;
  getDeviceLocale = envConfig.getDeviceLocale;
} catch (e) {
  console.error('[LAYOUT] Failed to import env config:', e);
}

// Subscription status
let getCurrentSubscriptionStatus: any = null;
try {
  getCurrentSubscriptionStatus = require('../services/subscriptions').getCurrentSubscriptionStatus;
} catch (e) {
  console.error('[LAYOUT] Failed to import getCurrentSubscriptionStatus:', e);
}

export default function RootLayout() {
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: any = null;
    
    const checkForUpdates = async () => {
      try {
        // Check if Updates module is properly available
        if (!Updates || typeof Updates.checkForUpdateAsync !== 'function') {
          console.log('[UPDATES] Updates module not available');
          return;
        }
        
        // In development, Updates.isEnabled might be false
        if (__DEV__ || !Updates.isEnabled) {
          console.log('[UPDATES] Updates not enabled (dev mode)');
          return;
        }
        
        console.log('[UPDATES] Checking for updates...');
        const update = await Updates.checkForUpdateAsync();
        
        if (update && update.isAvailable) {
          console.log('[UPDATES] Update available, downloading...');
          await Updates.fetchUpdateAsync();
          
          // Ask user to restart
          Alert.alert(
            'Update Available',
            'A new version has been downloaded. Restart to apply changes?',
            [
              { text: 'Later', style: 'cancel' },
              { 
                text: 'Restart Now', 
                onPress: async () => {
                  if (typeof Updates.reloadAsync === 'function') {
                    await Updates.reloadAsync();
                  }
                }
              },
            ]
          );
        } else {
          console.log('[UPDATES] App is up to date');
        }
      } catch (error) {
        console.log('[UPDATES] Error checking for updates:', error);
        // Don't crash the app if updates check fails
      }
    };

    const initializeApp = async () => {
      try {
        console.log('[LAYOUT] Starting app initialization...');
        
        // Check for OTA updates
        checkForUpdates();
        
        // Initialize RevenueCat (safely)
        if (initializeRevenueCat && typeof initializeRevenueCat === 'function') {
          try {
            console.log('[LAYOUT] Initializing RevenueCat...');
            await initializeRevenueCat();
            console.log('[LAYOUT] RevenueCat initialized');
          } catch (rcError) {
            console.error('[LAYOUT] RevenueCat init error:', rcError);
            // Don't crash, continue without RevenueCat
          }
        } else {
          console.warn('[LAYOUT] RevenueCat not available');
        }

        // Track retention day (D1, D3, D7, etc.)
        if (trackReturnDay && typeof trackReturnDay === 'function') {
          try {
            await trackReturnDay();
          } catch (retentionError) {
            console.warn('[LAYOUT] Retention tracking error:', retentionError);
          }
        }

        // Track app_opened with all critical properties for analytics
        try {
          if (RetentionEvents && typeof RetentionEvents.appOpened === 'function') {
            const sessionCount = getSessionCount ? await getSessionCount() : 0;
            const onboardingDone = hasCompletedOnboarding ? await hasCompletedOnboarding() : false;
            const daysSinceInstall = getDaysSinceInstall ? await getDaysSinceInstall() : 0;
            const subscriptionStatus = getCurrentSubscriptionStatus 
              ? await getCurrentSubscriptionStatus() 
              : 'free';
            const env = getEnvironment ? getEnvironment() : 'dev';
            const deviceCountry = getDeviceCountry ? getDeviceCountry() : 'XX';
            const deviceLocale = getDeviceLocale ? getDeviceLocale() : 'en';

            RetentionEvents.appOpened({
              sessionNumber: sessionCount,
              daysSinceInstall,
              env,
              deviceCountry,
              deviceLocale,
              subscriptionStatus,
              onboardingCompleted: onboardingDone,
            });
            
            console.log('[LAYOUT] app_opened tracked:', {
              sessionNumber: sessionCount,
              daysSinceInstall,
              env,
              deviceCountry,
              deviceLocale,
              subscriptionStatus,
              onboardingCompleted: onboardingDone,
            });
          }
        } catch (appOpenedError) {
          console.warn('[LAYOUT] app_opened tracking error:', appOpenedError);
        }

        // Listen for auth state changes (safely)
        if (supabase && supabase.auth && typeof supabase.auth.onAuthStateChange === 'function') {
          try {
            console.log('[LAYOUT] Setting up auth listener...');
            const result = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
              console.log('[LAYOUT] Auth state changed:', event);
              
              try {
                if (event === 'SIGNED_IN' && session?.user) {
                  if (posthog && typeof posthog.identify === 'function') {
                    posthog.identify(session.user.id, { email: session.user.email || '' });
                  }
                  if (syncUserWithRevenueCat && typeof syncUserWithRevenueCat === 'function') {
                    await syncUserWithRevenueCat(session.user.id);
                  }
                } else if (event === 'SIGNED_OUT') {
                  if (posthog && typeof posthog.reset === 'function') {
                    posthog.reset();
                  }
                }
              } catch (authCallbackError) {
                console.error('[LAYOUT] Auth callback error:', authCallbackError);
              }
            });
            
            subscription = result?.data?.subscription;
            console.log('[LAYOUT] Auth listener set up');
          } catch (authError) {
            console.error('[LAYOUT] Auth listener setup error:', authError);
          }
        } else {
          console.warn('[LAYOUT] Supabase auth not available');
        }
        
        console.log('[LAYOUT] App initialization complete');
      } catch (error: any) {
        console.error('[LAYOUT] FATAL initialization error:', error);
        setInitError(error?.message || 'Unknown initialization error');
      }
    };
    
    initializeApp();

    return () => {
      try {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      } catch (e) {
        console.error('[LAYOUT] Cleanup error:', e);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen
              name="processing"
              options={{
                presentation: 'fullScreenModal',
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="output"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="paywall"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
                gestureEnabled: false,
              }}
            />
          </Stack>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
