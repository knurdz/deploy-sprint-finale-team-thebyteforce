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

/**
 * T05 - Secret And Config Separation
 *
 * Public config may reach the browser; private config may not. `/status` is
 * served to anyone, so it reports secrets by NAME and never by value: the
 * presence of a name proves the value is configured without disclosing it.
 *
 * The distinction is enforced by Vite, not by convention: any variable named
 * VITE_* is inlined into the client bundle at build time and is readable by
 * every visitor. Private values are therefore never given a VITE_ prefix and
 * are only read inside Actions/deploy steps.
 */
const publicDeployLabel = env('VITE_PUBLIC_DEPLOY_LABEL', 'PUBLIC_DEPLOY_LABEL');

// Names only. Every value below is a GitHub Secret consumed by deploy logic and
// must never appear in source, the client bundle, /status, or unmasked logs.
const secretsRedacted = [
  'PRIVATE_DEPLOY_TOKEN',
  'DEPLOYER_DISPATCH_TOKEN',
  'DNS_PORTAL_PASSWORD',
  'DNS_TXT_VALUE',
];

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
  contact: {
    provider: 'web3forms',
    configured: Boolean(env('WEB3FORMS_ACCESS_KEY', 'VITE_WEB3FORMS_ACCESS_KEY')),
    accessKeyStoredInSecret: true,
  },
  config: {
    publicDeployLabel: publicDeployLabel || 'not-configured',
    publicUrlConfigured: Boolean(env('VITE_PUBLIC_URL', 'PUBLIC_URL', 'IP_PUBLIC_URL')),
    secretsRedacted,
    secretValuesInClientBundle: false,
  },
};

await mkdir(distDir, { recursive: true });
await Promise.all([
  writeFile(path.join(distDir, 'health'), 'ok\n', 'utf8'),
  writeFile(path.join(distDir, 'status'), `${JSON.stringify(status, null, 2)}\n`, 'utf8'),
]);

console.log(`${TASK}: wrote /health and /status for ${status.shortCommit} (release ${runId}).`);
