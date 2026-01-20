// sentry-init.ts
import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: 'https://2b57cce258af04803c6c993c56678c13@o4510735264776192.ingest.us.sentry.io/4510735267135488',
  enableInExpoDevelopment: true,
  debug: __DEV__, // Solo debug en desarrollo
});

console.log('Sentry initialized');
