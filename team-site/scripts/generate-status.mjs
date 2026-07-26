/**
 * T01 - Launch Provided Website
 *
 * Writes the /health and /status endpoints into the build output so that every
 * release publishes the commit it was built from. This runs as the `postbuild`
 * step, so CI and local builds always produce the same evidence.
 *
 * nginx on the VPS serves dist/ as plain static files with no SPA fallback, so
 * extensionless files land exactly on /health and /status.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TASK = 'T01';

// Identity and URL come from repository variables in CI; the fallbacks only
// apply to local builds.
const FALLBACK_TEAM = 'thebyteforce';

// The raw IP is the site's own public address, not a credential.
const FALLBACK_PUBLIC_URL = 'http://4.155.210.79';

const distDir = fileURLToPath(new URL('../dist', import.meta.url));

function env(...keys) {
  for (const key of keys) {
    if (process.env[key]) {
      return process.env[key];
    }
  }
  return '';
}

const commit = env('GITHUB_SHA') || 'local-build';
const runId = env('GITHUB_RUN_ID') || 'local';
const builtAt = new Date().toISOString();

const status = {
  ok: true,
  task: TASK,
  tasks: [TASK],
  team: env('TEAM_SLUG') || FALLBACK_TEAM,
  repo: env('GITHUB_REPOSITORY') || 'knurdz/deploy-sprint-finale-team-thebyteforce',
  commit,
  shortCommit: commit.slice(0, 7),
  releaseId: runId,
  sourceRunId: runId,
  builtAt,
  deployedAt: builtAt,
  publicUrl: env('VITE_PUBLIC_URL', 'PUBLIC_URL', 'IP_PUBLIC_URL') || FALLBACK_PUBLIC_URL,
  endpoints: {
    health: '/health',
    status: '/status',
  },
};

await mkdir(distDir, { recursive: true });
await Promise.all([
  writeFile(path.join(distDir, 'health'), 'ok\n', 'utf8'),
  writeFile(path.join(distDir, 'status'), `${JSON.stringify(status, null, 2)}\n`, 'utf8'),
]);

console.log(`${TASK}: wrote /health and /status for ${status.shortCommit} (release ${runId}).`);
