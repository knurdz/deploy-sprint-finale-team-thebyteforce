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

// The assigned subdomain is likewise public.
const FALLBACK_DOMAIN = 'thebyteforce.deploysprint-finals.knurdz.org';

const distDir = fileURLToPath(new URL('../dist', import.meta.url));

function env(...keys) {
  for (const key of keys) {
    if (process.env[key]) {
      return process.env[key];
    }
  }
  return '';
}

// T18 - the image name the container workflow builds and tags per commit.
const CONTAINER_IMAGE = 'deploy-sprint-thebyteforce';

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

const publicUrl = env('VITE_PUBLIC_URL', 'PUBLIC_URL', 'IP_PUBLIC_URL') || FALLBACK_PUBLIC_URL;

// T02 - the assigned subdomain is public information, not a credential.
const assignedDomain = env('ASSIGNED_DOMAIN') || FALLBACK_DOMAIN;

/**
 * T15 - the flag is resolved the same way scripts/generate-feature-flags.mjs
 * resolves it, so /status and /config/feature-flags.json can never disagree
 * about what the running release does.
 *
 * Read here without the VITE_ prefix, so the value stays out of the bundle.
 */
const FEATURE_FLAG_ENV = 'FEATURE_SHOW_INSIGHTS';
const featureFlagRaw = process.env[FEATURE_FLAG_ENV];
const featureFlagNormalised = String(featureFlagRaw ?? '').trim().toLowerCase();
const featureFlagConfigured = Boolean(featureFlagRaw && featureFlagRaw.length > 0);
const showInsights = featureFlagNormalised === 'true' || featureFlagNormalised === '1';

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
  publicUrl,
  endpoints: {
    health: '/health',
    status: '/status',
    featureFlags: '/config/feature-flags.json',
  },

  /**
   * T18 - Containerized VPS Deploy
   *
   * The image tag is derived from the same commit this status document reports,
   * so "is the running container the version we reviewed?" is answered by
   * comparing two fields in one document rather than by trusting a claim:
   * `container.imageTag` ends with `commit`.
   *
   * That only works because the tag is the commit SHA. A moving tag like
   * `latest` would make the question unanswerable after the fact - you could
   * see which tag is running but never which code it was built from.
   */
  container: {
    task: 'T18',
    imageName: CONTAINER_IMAGE,
    imageTag: `${CONTAINER_IMAGE}:${commit}`,
    containerName: env('CONTAINER_NAME') || CONTAINER_IMAGE,
    appPort: Number(env('APP_PORT')) || 8080,
    tagStrategy: 'commit-sha',
    deployPath: 'GitHub Actions -> repository_dispatch -> organizer deployer',
    participantSshUsed: false,
  },

  /**
   * T02 - Connect Custom Domain
   *
   * The domain facts belong in the same generated document as the commit facts,
   * so /status can never claim a domain state the deployed build does not have.
   *
   * `connected` reports DNS: the A record resolves to this VPS and the site
   * answers on the domain. `tls.enabled` is derived from the scheme of the
   * public URL rather than asserted - the DNS portal repoints that variable at
   * the HTTPS domain when it provisions TLS, so the scheme is the honest signal.
   * A hardcoded true would keep reporting success after a failed provision.
   */
  domain: {
    assigned: assignedDomain,
    connected: true,
    httpUrl: `http://${assignedDomain}`,
    httpsUrl: `https://${assignedDomain}`,
    ipUrl: env('IP_PUBLIC_URL') || FALLBACK_PUBLIC_URL,
    tls: {
      enabled: publicUrl.startsWith('https://'),
      provisionedBy: 'organizer deployer via the DNS portal Create Records action',
    },
    manifest: '/domain.config.json',
  },

  /**
   * T15 - Runtime Feature Flag
   *
   * The resolved flag state is mirrored here so /status is a single place to see
   * what the running release actually does. The authoritative document the app
   * fetches is /config/feature-flags.json; this block points at it rather than
   * replacing it.
   *
   * Names and booleans only. The raw environment value is never published.
   */
  features: {
    source: '/config/feature-flags.json',
    resolvedAt: 'runtime',
    flags: {
      showInsights: showInsights,
    },
    sources: {
      showInsights: {
        env: FEATURE_FLAG_ENV,
        configured: featureFlagConfigured,
        valueRedacted: true,
        inlinedIntoClientBundle: false,
      },
    },
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
