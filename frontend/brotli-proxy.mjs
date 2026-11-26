/**
 * Brotli front door for the Next.js standalone server.
 *
 * Next.js compresses only with gzip, and every transfer-encoding setting we own
 * lives in this container, so brotli is applied here instead of depending on an
 * edge proxy we do not control. The wrapper is transparent: HTTP/1.1 keep-alive,
 * streaming SSR, RSC payloads, sitemaps and HEAD requests all pass through, and
 * a client that does not advertise `br` still gets Next's own gzip response.
 *
 * Set BROTLI_PROXY=off to exec the Next.js server directly.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import zlib from 'node:zlib';

const PUBLIC_PORT = Number(process.env.PORT || 3000);
const INTERNAL_PORT = Number(process.env.INTERNAL_PORT || PUBLIC_PORT + 1);
const HOST = '0.0.0.0';
const MIN_BYTES = 1024; // below this brotli overhead outweighs the gain
const QUALITY = Number(process.env.BROTLI_QUALITY || 4);
// Lets a developer point the wrapper at an already running server (no child).
const EXTERNAL_UPSTREAM = Number(process.env.UPSTREAM_PORT || 0);
let upstreamPort = EXTERNAL_UPSTREAM || INTERNAL_PORT;

const COMPRESSIBLE = [
  'text/',
  'application/json',
  'application/javascript',
  'application/x-javascript',
  'application/xml',
  'application/rss+xml',
  'application/atom+xml',
  'image/svg+xml',
];

// next-intl / App Router segments stream as text/x-component; compress those too.
const STREAMING = 'text/event-stream';

function nextServerPath() {
  for (const candidate of ['/app/server.js', '/app/app/server.js']) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return '';
}

function acceptsBrotli(header) {
  if (!header) return false;
  return String(header)
    .split(',')
    .some((part) => {
      const [token, ...params] = part.trim().toLowerCase().split(';');
      if (token !== 'br') return false;
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return !q || Number(q.slice(2)) > 0;
    });
}

function isCompressible(contentType) {
  if (!contentType) return false;
  const value = String(contentType).toLowerCase();
  if (value.includes(STREAMING)) return false;
  return COMPRESSIBLE.some((prefix) => value.startsWith(prefix));
}

function waitForPort(port, host, deadline) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect({ port, host });
      socket.setTimeout(1000);
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      const retry = () => {
        socket.destroy();
        if (Date.now() > deadline) reject(new Error(`next.js did not listen on ${port}`));
        else setTimeout(attempt, 150);
      };
      socket.once('error', retry);
      socket.once('timeout', retry);
    };
    attempt();
  });
}

function startNext(serverPath) {
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PORT: String(INTERNAL_PORT), HOSTNAME: '127.0.0.1' },
    stdio: 'inherit',
  });
  child.on('exit', (code, signal) => {
    console.error(`[brotli] next.js exited code=${code} signal=${signal}`);
    process.exit(1);
  });
  return child;
}

const agent = new http.Agent({ keepAlive: true, maxSockets: 256, maxFreeSockets: 64 });

function proxyRequest(clientReq, clientRes) {
  const brotli = acceptsBrotli(clientReq.headers['accept-encoding']);
  const headers = { ...clientReq.headers };
  // Ask the origin for an uncompressed body so we can compress it ourselves;
  // otherwise leave Accept-Encoding alone and let Next gzip it.
  if (brotli) headers['accept-encoding'] = 'identity';

  const upstream = http.request(
    { host: '127.0.0.1', port: upstreamPort, method: clientReq.method, path: clientReq.url, headers, agent },
    (originRes) => {
      const responseHeaders = { ...originRes.headers };
      const alreadyEncoded = Boolean(responseHeaders['content-encoding']);
      const length = Number(responseHeaders['content-length'] || 0);
      const compress = brotli
        && clientReq.method !== 'HEAD'
        && !alreadyEncoded
        && (originRes.statusCode || 200) < 300
        && isCompressible(responseHeaders['content-type'])
        && (!length || length >= MIN_BYTES);

      if (!compress) {
        clientRes.writeHead(originRes.statusCode || 502, responseHeaders);
        originRes.pipe(clientRes);
        return;
      }

      const existingVary = String(responseHeaders.vary || '')
        .split(',')
        .map((token) => token.trim())
        .filter((token) => token && token.toLowerCase() !== 'accept-encoding');
      responseHeaders.vary = [...existingVary, 'Accept-Encoding'].join(', ');
      responseHeaders['content-encoding'] = 'br';
      // Compressed bytes no longer match the identity length or the strong ETag.
      delete responseHeaders['content-length'];
      if (responseHeaders.etag && !String(responseHeaders.etag).startsWith('W/')) {
        responseHeaders.etag = `W/${responseHeaders.etag}`;
      }

      const encoder = zlib.createBrotliCompress({
        params: {
          [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
          [zlib.constants.BROTLI_PARAM_QUALITY]: QUALITY,
          // Small enough for HTML, big enough that the ratio still holds.
          [zlib.constants.BROTLI_PARAM_LGWIN]: 20,
        },
      });
      encoder.on('error', () => clientRes.destroy());
      clientRes.writeHead(originRes.statusCode || 502, responseHeaders);
      originRes.on('data', (chunk) => {
        encoder.write(chunk);
        // Streamed SSR needs each chunk flushed or the browser waits for EOF.
        encoder.flush(zlib.constants.BROTLI_OPERATION_FLUSH, () => {});
      });
      originRes.on('end', () => encoder.end());
      originRes.on('aborted', () => encoder.destroy());
      encoder.pipe(clientRes);
    },
  );

  upstream.on('error', (error) => {
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      clientRes.end(`bad gateway: ${error.message}`);
    } else {
      clientRes.destroy();
    }
  });
  clientReq.pipe(upstream);
  clientReq.on('aborted', () => upstream.destroy());
}

function main() {
  if (process.env.BROTLI_PROXY === 'off') {
    const serverPath = nextServerPath();
    if (!serverPath) {
      console.error('[brotli] server.js not found');
      process.exit(1);
    }
    const direct = spawn(process.execPath, [serverPath], {
      env: { ...process.env, PORT: String(PUBLIC_PORT) },
      stdio: 'inherit',
    });
    direct.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 0));
    return;
  }
  const serverPath = EXTERNAL_UPSTREAM ? '' : nextServerPath();
  if (!EXTERNAL_UPSTREAM && !serverPath) {
    console.error('[brotli] server.js not found, starting next.js is impossible');
    process.exit(1);
  }
  const child = EXTERNAL_UPSTREAM ? null : startNext(serverPath);
  const server = http.createServer(proxyRequest);
  // Node's default request timeout is fine; keep sockets a little longer than
  // the origin keep-alive so the browser reuses one connection.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;

  upstreamPort = EXTERNAL_UPSTREAM || INTERNAL_PORT;
  waitForPort(upstreamPort, '127.0.0.1', Date.now() + 90_000)
    .then(() => {
      server.listen(PUBLIC_PORT, HOST, () => {
        console.log(`[brotli] listening on ${HOST}:${PUBLIC_PORT} -> 127.0.0.1:${upstreamPort} q=${QUALITY}`);
      });
    })
    .catch((error) => {
      console.error(`[brotli] ${error.message}`);
      child?.kill('SIGTERM');
      process.exit(1);
    });

  const shutdown = () => {
    server.close(() => {
      child?.kill('SIGTERM');
      process.exit(0);
    });
    setTimeout(() => {
      child?.kill('SIGKILL');
      process.exit(0);
    }, 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main();
