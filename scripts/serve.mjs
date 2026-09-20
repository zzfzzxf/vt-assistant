import http from 'node:http';
import fs from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

const root = path.resolve('dist');
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.7z': 'application/x-7z-compressed' };
const cache = new Map();
const server = http.createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filename = path.resolve(root, `.${pathname.endsWith('/') ? pathname + 'index.html' : pathname}`);
    if (!filename.startsWith(root + path.sep) || pathname.includes('\0')) { response.writeHead(403); response.end(); return; }
    const info = await stat(filename);
    if (!info.isFile()) throw new Error('not file');
    const extension = path.extname(filename);
    const type = types[extension] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600' };
    if (extension === '.7z') headers['Content-Disposition'] = "attachment; filename=VT-Assistant.7z; filename*=UTF-8''VT%E5%8A%A9%E6%89%8B.7z";
    if (type.startsWith('text/')) {
      const accept = request.headers['accept-encoding'] || '';
      const encoding = accept.includes('br') ? 'br' : accept.includes('gzip') ? 'gzip' : '';
      const key = `${filename}:${info.mtimeMs}:${encoding}`;
      if (!cache.has(key)) { const source = await readFile(filename); cache.set(key, encoding === 'br' ? brotliCompressSync(source, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }) : encoding === 'gzip' ? gzipSync(source) : source); }
      const body = cache.get(key);
      if (encoding) headers['Content-Encoding'] = encoding;
      headers.Vary = 'Accept-Encoding'; headers['Content-Length'] = body.length;
      response.writeHead(200, headers); response.end(request.method === 'HEAD' ? undefined : body);
    } else {
      headers['Content-Length'] = info.size; response.writeHead(200, headers);
      if (request.method === 'HEAD') response.end();
      else { const stream = fs.createReadStream(filename); stream.on('error', () => response.destroy()); stream.pipe(response); }
    }
  } catch { if (!response.headersSent) response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`VT助手官网预览：http://127.0.0.1:${port}/`));
