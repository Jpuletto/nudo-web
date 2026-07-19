import { createReadStream, promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { rootDir, shell, writeGeneratedAssets, writeGeneratedProjects } from './site-tools.mjs';

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '127.0.0.1';

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4'
};

await Promise.all([
  writeGeneratedProjects(),
  writeGeneratedAssets()
]);

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  if (/^\/proyecto-[a-z0-9-]+\.html$/i.test(pathname)) {
    const slug = pathname.replace('/proyecto-', '').replace('.html', '');
    response.writeHead(200, { 'Content-Type': contentTypes['.html'] });
    response.end(shell({
      page: 'project',
      slug,
      title: 'Proyecto — NUDO Arquitectura',
      description: 'Proyecto de NUDO Arquitectura.'
    }));
    return;
  }

  const filePath = path.normalize(path.join(rootDir, pathname));
  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error('Not found');
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('No encontrado');
  }
});

server.listen(port, host, () => {
  console.log(`NUDO local: http://${host}:${port}`);
});
