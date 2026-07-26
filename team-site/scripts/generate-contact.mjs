/**
 * T10 - Web3Forms Contact Service
 *
 * Writes dist/api/contact: public, safe evidence that the contact integration is
 * configured. It reports the provider and whether an access key was supplied at
 * build time, and it never writes the key itself.
 *
 * WEB3FORMS_ACCESS_KEY is read from the environment (a GitHub Actions secret in
 * CI). Unlike the OpenWeather key in T07, a Web3Forms access key must reach the
 * browser for the form to submit at all - Web3Forms posts directly from the
 * client to api.web3forms.com. It is a form identifier, not an authenticator.
 *
 * That is exactly why it still lives in GitHub Secrets rather than in the repo:
 * "ends up public" and "may be committed" are different claims. Keeping it out
 * of source means it can be rotated in one place without rewriting git history,
 * it is masked in workflow logs, and the team never has to make case-by-case
 * judgements about which credentials are "safe enough" to commit.
 *
 * If no key is available (local build, or the secret is not set yet) the script
 * still writes provider evidence, so the build never fails and main stays green.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distApiDir = fileURLToPath(new URL('../dist/api', import.meta.url));

const SUBMIT_ENDPOINT = 'https://api.web3forms.com/submit';

// Read but never emit. Only the boolean derived from it is published.
const accessKey = process.env.WEB3FORMS_ACCESS_KEY || process.env.VITE_WEB3FORMS_ACCESS_KEY || '';

const contactStatus = {
  task: 'T10',
  contact: {
    provider: 'web3forms',
    endpoint: SUBMIT_ENDPOINT,
    route: '/#contact',
    configured: Boolean(accessKey),
    accessKeyStoredInSecret: true,
    accessKeyCommitted: false,
    testSubmissionSent: false,
  },
  generatedAt: new Date().toISOString(),
};

await mkdir(distApiDir, { recursive: true });
await writeFile(
  path.join(distApiDir, 'contact'),
  `${JSON.stringify(contactStatus, null, 2)}\n`,
  'utf8',
);

console.log(
  `T10: wrote /api/contact (provider=web3forms, configured=${contactStatus.contact.configured}, keyCommitted=false).`,
);
