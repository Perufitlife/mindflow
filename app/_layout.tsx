// app/_layout.tsx - Root Layout
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
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

export default function RootLayout() {
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: any = null;
    
    const initializeApp = async () => {
      try {
        console.log('[LAYOUT] Starting app initialization...');
        
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
              }}
            />
            <Stack.Screen
              name="paywall"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
          </Stack>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
