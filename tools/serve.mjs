import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
export function serve(port = 4173) {
  return http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root) || !types[path.extname(file)]) { res.writeHead(404).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] + '; charset=utf-8' }).end(body);
    } catch { res.writeHead(404).end(); }
  }).listen(port, '127.0.0.1');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  serve(); console.log('http://127.0.0.1:4173');
}
