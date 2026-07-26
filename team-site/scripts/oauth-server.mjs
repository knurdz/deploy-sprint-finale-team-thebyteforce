/**
 * T20 - Google OAuth Login (server-side)
 *
 * A dependency-free Node server that logs users in with Google using a
 * SERVER-SIDE callback. GOOGLE_CLIENT_SECRET and SESSION_SECRET are read only
 * from the environment and are used only on the server - they are never sent to
 * the browser, never committed, and never logged. That is why secretExposed is
 * always false, and why the client secret is never inlined into the browser bundle.
 *
 * Routes:
 *   GET /auth/google           - start login: redirect to Google with a signed state
 *   GET /auth/google/callback  - verify state, exchange the code server-side, set session
 *   GET /auth/logout           - clear the session cookie
 *   GET /auth/me               - safe evidence: provider + auth status, never secrets
 */
import { createServer } from 'node:http';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  'https://thebyteforce.deploysprint-finals.knurdz.org/auth/google/callback';
const AUTHORIZED_ORIGIN =
  process.env.GOOGLE_AUTHORIZED_ORIGIN ||
  'https://thebyteforce.deploysprint-finals.knurdz.org';
const SCOPES = process.env.GOOGLE_SCOPES || 'openid email profile';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

// --- helpers ---------------------------------------------------------------

// State and sessions are signed with SESSION_SECRET (server-only) so the client
// cannot forge them. The secret is never included in any response.
function sign(value) {
  return createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

function makeState() {
  const nonce = randomBytes(16).toString('hex');
  return `${nonce}.${sign(nonce)}`;
}

function verifyState(state) {
  if (!state || !state.includes('.')) return false;
  const [nonce, sig] = state.split('.');
  return safeEqual(sig, sign(nonce));
}

function readCookie(req, name) {
  const match = (req.headers.cookie || '').match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : '';
}

function setCookie(res, name, value, maxAgeSeconds) {
  res.setHeader(
    'Set-Cookie',
    `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`,
  );
}

function decodeIdToken(idToken) {
  if (!idToken || !idToken.includes('.')) return {};
  try {
    return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString());
  } catch {
    return {};
  }
}

// --- route handlers --------------------------------------------------------

function startGoogleLogin(req, res) {
  const state = makeState();
  setCookie(res, 'oauth_state', state, 600);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  res.writeHead(302, { Location: `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}` });
  res.end();
}

async function handleGoogleCallback(req, res, url) {
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const savedState = readCookie(req, 'oauth_state');

  // 1. CSRF protection: the returned state must match the cookie AND be signed by us.
  if (!returnedState || returnedState !== savedState || !verifyState(returnedState)) {
    res.writeHead(400).end('invalid oauth state');
    return;
  }

  // 2. Exchange the authorization code for tokens SERVER-SIDE. This is the only
  //    place CLIENT_SECRET is used; it never reaches the browser.
  const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code || '',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    res.writeHead(502).end('token exchange failed');
    return;
  }
  const tokens = await tokenRes.json();

  // 3. Store a SIGNED session cookie holding only a safe subset (email). No
  //    access tokens or secrets are placed in the cookie.
  const claims = decodeIdToken(tokens.id_token);
  const payload = Buffer.from(JSON.stringify({ email: claims.email || null })).toString('base64url');
  setCookie(res, 'session', `${payload}.${sign(payload)}`, 3600);
  res.writeHead(302, { Location: '/auth/me' });
  res.end();
}

function handleLogout(req, res) {
  setCookie(res, 'session', '', 0);
  res.writeHead(302, { Location: '/' });
  res.end();
}

function readSession(req) {
  const raw = readCookie(req, 'session');
  if (!raw || !raw.includes('.')) return null;
  const [payload, sig] = raw.split('.');
  if (!safeEqual(sig, sign(payload))) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
}

function handleAuthMe(req, res) {
  const user = readSession(req);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      task: 'T20',
      provider: 'google',
      authenticated: Boolean(user),
      user,
      ready: Boolean(CLIENT_ID && CLIENT_SECRET && SESSION_SECRET),
      secretExposed: false,
      scopes: SCOPES,
      authorizedOrigin: AUTHORIZED_ORIGIN,
      redirectUri: REDIRECT_URI,
    }),
  );
}

// --- server ----------------------------------------------------------------

export function createAuthServer() {
  return createServer((req, res) => {
    const url = new URL(req.url, AUTHORIZED_ORIGIN);
    if (req.method === 'GET' && url.pathname === '/auth/google') {
      return startGoogleLogin(req, res);
    }
    if (req.method === 'GET' && url.pathname === '/auth/google/callback') {
      return handleGoogleCallback(req, res, url);
    }
    if (req.method === 'GET' && url.pathname === '/auth/logout') {
      return handleLogout(req, res);
    }
    if (req.method === 'GET' && url.pathname === '/auth/me') {
      return handleAuthMe(req, res);
    }
    res.writeHead(404).end('not found');
  });
}

// Only listen when explicitly started, so importing this module (or building the
// site) never boots a server.
if (process.env.START_AUTH_SERVER === 'true') {
  const port = Number(process.env.PORT || 8081);
  createAuthServer().listen(port, () => {
    console.log(`T20 Google OAuth server listening on ${port}`);
  });
}
