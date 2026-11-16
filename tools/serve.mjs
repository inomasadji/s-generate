// Статический сервер на встроенных модулях Node: проект не тянет зависимостей,
// а file:// ломает ES-модули.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT) || 8080;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.png': 'image/png',
};

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let filePath = normalize(join(root, pathname));

    // Не выпускаем за пределы каталога проекта.
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    let info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) {
      filePath = join(filePath, 'index.html');
      info = await stat(filePath).catch(() => null);
    }
    if (!info?.isFile()) {
      res.writeHead(404).end('Not found');
      return;
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': types[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500).end(String(error));
  }
}).listen(port, () => {
  console.log(`s-generate → http://localhost:${port}`);
});
