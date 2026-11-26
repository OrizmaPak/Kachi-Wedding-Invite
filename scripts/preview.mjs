import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import rsvpHandler from '../api/rsvp.js';

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: process.env.PORT || '3000' },
    host: { type: 'string', default: '0.0.0.0' },
    strictPort: { type: 'boolean' },
  },
});

const publicDirectory = path.resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function safePublicPath(urlPath) {
  const routeFiles = { '/': 'index.html', '/invite': 'index.html', '/responses': 'responses.html' };
  const relativePath = routeFiles[urlPath] || urlPath.replace(/^\/+/, '');
  const resolved = path.resolve(publicDirectory, relativePath);
  return resolved === publicDirectory || resolved.startsWith(`${publicDirectory}${path.sep}`) ? resolved : null;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/api/rsvp') {
      await rsvpHandler(request, response);
      return;
    }

    const filePath = safePublicPath(url.pathname);
    if (!filePath || !(await stat(filePath)).isFile()) throw Object.assign(new Error('Not found'), { code: 'ENOENT' });
    response.statusCode = 200;
    response.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    response.end(await readFile(filePath));
  } catch (error) {
    response.statusCode = error.code === 'ENOENT' ? 404 : 500;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end(response.statusCode === 404 ? 'Not found' : 'Preview server error');
  }
});

server.listen(Number(values.port), values.host, () => {
  console.log(`Local: http://localhost:${values.port}`);
  console.log('Private response page preview password: preview');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
