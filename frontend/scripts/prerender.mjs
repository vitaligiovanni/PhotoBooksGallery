import { chromium } from 'playwright';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import serveStatic from 'serve-static';
import finalhandler from 'finalhandler';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

const serve = serveStatic(distDir, { maxAge: 0, index: ['index.html'] });
const server = http.createServer((req, res) => serve(req, res, finalhandler(req, res)));
let baseUrl = '';

const routes = [
  { url: '/', out: 'index.html', lang: 'x-default' },
  { url: '/ru', out: path.join('ru', 'index.html'), lang: 'ru' },
  { url: '/hy', out: path.join('hy', 'index.html'), lang: 'hy' },
  { url: '/en', out: path.join('en', 'index.html'), lang: 'en' },
];

async function ensureDir(p) {
  await fs.mkdir(path.dirname(p), { recursive: true });
}

async function prerender() {
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  baseUrl = `http://localhost:${port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Helper: merge Helmet head into base HTML and set html lang
  const baseHtmlPath = path.join(distDir, 'index.html');
  const baseHtml = await fs.readFile(baseHtmlPath, 'utf8');

  for (const r of routes) {
    const target = `${baseUrl}${r.url}`;
    await page.goto(target, { waitUntil: 'networkidle' });
    // Wait for Helmet to apply: title changes and description exists
    try {
      await page.waitForFunction(() => {
        const titleOk = document.title && document.title !== 'PhotoBooksGallery';
        const desc = document.querySelector('head meta[name="description"]');
        const hasDesc = !!desc && !!desc.getAttribute('content');
        return titleOk && hasDesc;
      }, { timeout: 8000 });
    } catch {}
    const headHtml = await page.evaluate(() => document.head.outerHTML);

    const merged = baseHtml
      .replace(/<head>[\s\S]*?<\/head>/i, headHtml)
      .replace(/<html([^>]*)lang="[^"]*"/i, `<html$1 lang="${r.lang}"`);

    const outPath = path.join(distDir, r.out);
    await ensureDir(outPath);
    await fs.writeFile(outPath, merged, 'utf8');
    console.log(`Prerendered: ${r.url} -> ${r.out}`);
  }

  await browser.close();
  server.close();
}

prerender().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
