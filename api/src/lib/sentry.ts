import * as Sentry from '@sentry/bun';

export function initSentry(dsn?: string, env?: string, traceRate?: number) {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: traceRate ?? 0.1,
  });
}

export function captureException(err: unknown) {
  Sentry.captureException(err);
}
