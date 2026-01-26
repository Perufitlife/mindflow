// posthog.ts
import { PostHog } from 'posthog-react-native';

let client: PostHog | null = null;

try {
  client = new PostHog(
    'phc_fMkL0j3UaXOfF72bz6VdNO0Aqn33niHtGIrWt02p7Lh',
    {
      host: 'https://us.posthog.com',
      captureAppLifecycleEvents: true,
      flushAt: 1,
      flushInterval: 0,
    }
  );
} catch (error) {
  console.error('[POSTHOG] Failed to initialize PostHog:', error);
  // Create a stub client that has the same interface but does nothing
  client = {
    capture: () => {},
    identify: () => {},
    reset: () => {},
  } as any;
}

// Identify user for cross-platform tracking (syncs with RevenueCat)
export function identifyUser(userId: string, properties?: Record<string, any>) {
  try {
    if (client && typeof client.identify === 'function') {
      client.identify(userId, properties);
      console.log('[POSTHOG] User identified:', userId);
    }
  } catch (error) {
    console.warn('[POSTHOG] Failed to identify user:', error);
  }
}

// Reset user identity (on logout)
export function resetUser() {
  try {
    if (client && typeof client.reset === 'function') {
      client.reset();
      console.log('[POSTHOG] User reset');
    }
  } catch (error) {
    console.warn('[POSTHOG] Failed to reset user:', error);
  }
}

export default client;
