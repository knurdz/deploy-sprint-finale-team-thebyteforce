/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_URL?: string;
  readonly VITE_TEAM_NAME?: string;
  readonly VITE_COMMIT_SHA?: string;
  readonly VITE_RELEASE_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
