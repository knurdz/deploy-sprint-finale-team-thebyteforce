import * as Sentry from '@sentry/react';

// T30 - Sentry frontend monitoring.
//
// The DSN is a public, client-side identifier (it only allows *sending* events),
// so it is safe to read from VITE_SENTRY_DSN and ship in the browser bundle. The
// SENTRY_AUTH_TOKEN is a SERVER-SIDE-only secret used by the release workflow
// (.github/workflows/sentry-release.yml) to create releases and upload source
// maps - it is never imported here and never reaches the browser.
const dsn = import.meta.env.VITE_SENTRY_DSN;
const release = import.meta.env.VITE_RELEASE_ID || import.meta.env.VITE_COMMIT_SHA;

export function initMonitoring() {
  if (!dsn) {
    console.info('T30 Sentry monitoring: no VITE_SENTRY_DSN set, skipping init.');
    return;
  }

  Sentry.init({
    dsn,
    release,
    tracesSampleRate: 0.1,
  });
  Sentry.setTag('team', 'thebyteforce');
  console.info('T30 Sentry monitoring initialized without exposing the auth token.');
}
