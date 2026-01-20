// app/index.tsx - Initial Route Handler
// This screen checks onboarding status and redirects accordingly
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { getCurrentSession, signInAnonymously } from '../services/auth';
import { hasCompletedOnboarding } from '../services/user';
import posthog from '../posthog';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        // Check onboarding status
        const completed = await hasCompletedOnboarding();
        console.log('Index: Onboarding completed?', completed);
        setShouldShowOnboarding(!completed);

        // Check for existing session
        let session = await getCurrentSession();
        
        // If onboarding completed but no session, create anonymous user
        if (completed && !session) {
          console.log('Index: Creating anonymous session...');
          const { error } = await signInAnonymously();
          if (error) {
            console.error('Failed to create anonymous session:', error);
          } else {
            session = await getCurrentSession();
          }
        }

        // Identify user if authenticated
        if (session?.user) {
          posthog.identify(session.user.id, { email: session.user.email });
        }
      } catch (error) {
        console.error('Error checking status:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkStatus();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  // Use Redirect component for clean navigation
  if (shouldShowOnboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
