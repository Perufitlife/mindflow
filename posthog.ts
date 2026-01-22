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

export default client;
