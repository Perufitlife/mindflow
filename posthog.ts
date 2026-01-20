// posthog.ts
import { PostHog } from 'posthog-react-native';

const client = new PostHog(
  'phc_fMkL0j3UaXOfF72bz6VdNO0Aqn33niHtGIrWt02p7Lh',
  {
    host: 'https://us.posthog.com',
    captureAppLifecycleEvents: true,
    flushAt: 1,
    flushInterval: 0,
  }
);

export default client;
