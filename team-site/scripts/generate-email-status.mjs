/**
 * T16 - Resend Email Alerts
 *
 * Build-time email-alert integration. RESEND_API_KEY is read ONLY from the
 * environment (a GitHub Actions secret) and is never written to a file or
 * shipped to the browser. This script writes a REDACTED status artifact to
 * dist/email/status.json and runs the alert in DRY-RUN by default: it builds the
 * Resend request but only sends when SEND_ALERT === 'true', so CI never emails
 * anyone and the key/payload are never logged. That is why keyExposed stays
 * false and secretRedacted stays true.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distEmailDir = fileURLToPath(new URL('../dist/email', import.meta.url));

const provider = process.env.EMAIL_PROVIDER || 'resend';
const apiKey = process.env.RESEND_API_KEY || '';
const fromEmail = process.env.RESEND_FROM_EMAIL || '';
const toEmail = process.env.ALERT_RECIPIENT_EMAIL || '';

// Keep only the domain in evidence - never a full inbox. Handles both plain
// addresses (judges@knurdz.org) and display-name form (Name <local@domain>).
function redactEmail(value) {
  const match = value.match(/@([^>\s]+)/);
  if (match) {
    return `***@${match[1]}`;
  }
  return value ? '***' : '';
}

const status = {
  task: 'T16',
  email: {
    provider,
    configured: Boolean(apiKey),
    secretRedacted: true,
    from: redactEmail(fromEmail),
    to: redactEmail(toEmail),
  },
  keyExposed: false,
  source:
    'RESEND_API_KEY is read server-side at build time from a GitHub secret; it is never written to any file or shipped to the browser.',
  generatedAt: new Date().toISOString(),
};

// The alert code path. Dry-run by default so CI never sends mail and never logs
// the key or the message body. A real send happens only when SEND_ALERT=true.
async function sendAlert() {
  if (process.env.SEND_ALERT !== 'true' || !apiKey) {
    console.log(`T16: dry-run - would send Resend alert to ${redactEmail(toEmail)} (no email sent).`);
    return 'dry-run';
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: toEmail,
      subject: 'Deploy Sprint release alert',
      text: 'A new release was published.',
    }),
  });
  console.log(`T16: Resend alert dispatched (HTTP ${res.status}).`);
  return 'sent';
}

status.email.lastAlert = await sendAlert();

await mkdir(distEmailDir, { recursive: true });
await writeFile(
  path.join(distEmailDir, 'status.json'),
  `${JSON.stringify(status, null, 2)}\n`,
  'utf8',
);
console.log(
  `T16: wrote /email/status.json (provider=${provider}, configured=${status.email.configured}, secretRedacted=true).`,
);
