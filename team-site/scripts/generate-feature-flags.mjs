/**
 * T15 - Runtime Feature Flag
 *
 * Writes dist/config/feature-flags.json: the resolved state of every runtime
 * feature flag, plus safe evidence of where each value came from.
 *
 * FEATURE_SHOW_INSIGHTS is read from the environment (a GitHub Actions secret in
 * CI) and deliberately has NO `VITE_` prefix. That matters: Vite inlines every
 * VITE_* variable into the client bundle at build time, which would bake the
 * flag into the JavaScript and make it a build-time constant. Keeping the name
 * unprefixed means the bundle never contains the value at all - it ships both
 * code paths and resolves the flag at page load by fetching this document.
 *
 * The practical consequence: flipping the flag changes what the app does without
 * changing a single line of application code or any bundled asset.
 *
 * Only the resolved boolean is published, never the raw string that produced it.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Published at /config/feature-flags.json. This is runtime configuration, not
// an API response, and the documented location for it is /config - so it lives
// there rather than under /api alongside the generated weather and contact
// evidence, and it keeps the .json extension so nginx serves it as JSON without
// needing a per-path content type rule.
const distConfigDir = fileURLToPath(new URL('../dist/config', import.meta.url));

const FLAG_ENV = 'FEATURE_SHOW_INSIGHTS';

/**
 * Environment variables are always strings, and a flag that silently reads as
 * false because someone typed "True" is a bad flag. Accept the obvious truthy
 * spellings, treat everything else - including unset - as off.
 *
 * Default-off is the important half: if the secret is missing, the fetch fails,
 * or the value is malformed, an unreleased feature must stay hidden. A flag that
 * fails open is not a safety mechanism.
 */
function readFlag(name) {
  const raw = process.env[name];
  const normalised = String(raw ?? '').trim().toLowerCase();
  return {
    enabled: normalised === 'true' || normalised === '1',
    configured: Boolean(raw && raw.length > 0),
  };
}

const showInsights = readFlag(FLAG_ENV);

const payload = {
  task: 'T15',
  generatedAt: new Date().toISOString(),
  flags: {
    // The resolved boolean is public by necessity - the browser needs it to
    // decide what to render. It is a decision, not a credential.
    showInsights: showInsights.enabled,
  },
  sources: {
    showInsights: {
      // Name only. The raw value never appears in this document, the client
      // bundle, or any log.
      env: FLAG_ENV,
      configured: showInsights.configured,
      valueRedacted: true,
      inlinedIntoClientBundle: false,
      resolvedAt: 'runtime',
    },
  },
};

await mkdir(distConfigDir, { recursive: true });
await writeFile(
  path.join(distConfigDir, 'feature-flags.json'),
  `${JSON.stringify(payload, null, 2)}\n`,
  'utf8',
);

console.log(
  `T15: wrote /config/feature-flags.json (${FLAG_ENV} configured=${showInsights.configured}, ` +
    `showInsights=${showInsights.enabled}).`,
);
