/**
 * T17 - minimal static server used to health-check a candidate release.
 *
 * The candidate has to be checked the way real traffic would reach it - over
 * HTTP against the actual built artifact - rather than by testing whether files
 * exist on disk. A file-existence check would happily pass a release whose
 * index.html is empty or whose /health was never generated.
 *
 * Deliberately serves a single release directory and nothing else, so the
 * candidate can be exercised while the current release keeps serving.
 *
 * Usage: node serve-release.mjs <release-dir> <port>
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const [, , releaseDir, portArg] = process.argv;

if (!releaseDir || !portArg) {
  console.error('usage: node serve-release.mjs <release-dir> <port>');
  process.exit(2);
}

const root = path.resolve(releaseDir);
const port = Number(portArg);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  const requested = decodeURIComponent((req.url || '/').split('?')[0]);
  let target = path.join(root, requested === '/' ? 'index.html' : requested);

  // Never serve outside the release directory, even if the request tries to
  // climb out of it with ../ segments.
  if (!path.resolve(target).startsWith(root)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      target = path.join(target, 'index.html');
    }
  } catch {
    res.writeHead(404).end('not found');
    return;
  }

  const type = TYPES[path.extname(target)] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type });
  createReadStream(target).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`serving ${root} on http://127.0.0.1:${port}`);
});
