// sentry-stub.ts
// Stub file to replace Sentry imports during build
// Sentry will be properly configured after initial App Store submission

export const Native = {
  addBreadcrumb: (_data: any) => {},
  captureException: (_error: any) => {},
  captureMessage: (_message: string, _level?: string) => {},
};

export const init = (_config: any) => {};
