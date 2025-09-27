#!/usr/bin/env node
/**
 * generate-manifest.mjs
 * Сканирует рабочую директорию и формирует deploy-manifest.json
 * с хэшами файлов, категориями и агрегированной статистикой.
 * Категории: code, public, migrations, uploads (optional), other
 * По умолчанию uploads исключены (т.к. большие) — включите флагом --include-uploads
 */
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'deploy-manifest.json');

const args = process.argv.slice(2);
const includeUploads = args.includes('--include-uploads');
const quiet = args.includes('--quiet');

const DEFAULT_IGNORE = new Set([
  'node_modules', '.git', '.config', '.vscode', '.idea', '.DS_Store',
  'deploy-manifest.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'
]);

// Также поддержим .deployignore (простые строки, без glob)
async function loadExtraIgnore() {
  const file = path.join(ROOT, '.deployignore');
  try {
    const txt = await fs.readFile(file, 'utf8');
    txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(l => DEFAULT_IGNORE.add(l));
  } catch { /* noop */ }
}

function categorize(rel) {
  if (rel.startsWith('dist/')) return 'code';
  if (rel.startsWith('server/')) return 'code';
  if (rel.startsWith('shared/')) return 'code';
  if (rel.startsWith('public/')) return 'public';
  if (rel.startsWith('migrations/')) return 'migrations';
  if (rel.startsWith('uploads/')) return includeUploads ? 'uploads' : 'skip';
  if (/^.*\.(ts|js|cjs|mjs|json|config|env|lock)$/.test(rel)) return 'code';
  return 'other';
}

async function hashFile(abs) {
  const h = createHash('sha256');
  const data = await fs.readFile(abs);
  h.update(data);
  return h.digest('hex').slice(0, 32); // усечем для компактности
}

async function walk(dir, acc = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (DEFAULT_IGNORE.has(e.name)) continue;
    const abs = path.join(dir, e.name);
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    if (e.isDirectory()) {
      await walk(abs, acc);
    } else if (e.isFile()) {
      const category = categorize(rel);
      if (category === 'skip') continue;
      const size = (await fs.stat(abs)).size;
      const hash = await hashFile(abs);
      acc.push({ path: rel, size, hash, category });
    }
  }
  return acc;
}

async function main() {
  await loadExtraIgnore();
  const started = Date.now();
  const files = await walk(ROOT, []);

  const byCategory = files.reduce((m, f) => {
    (m[f.category] ||= { files: 0, size: 0 });
    m[f.category].files += 1;
    m[f.category].size += f.size;
    return m;
  }, {});

  let gitCommit = null;
  try {
    const { execSync } = await import('child_process');
    gitCommit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  } catch {/* ignore */}

  const manifest = {
    generatedAt: new Date().toISOString(),
    gitCommit,
    includeUploads,
    totals: {
      files: files.length,
      size: files.reduce((s, f) => s + f.size, 0)
    },
    categories: byCategory,
    files
  };

  await fs.writeFile(OUTPUT, JSON.stringify(manifest, null, 2), 'utf8');
  if (!quiet) {
    console.log(`Manifest written: ${OUTPUT}`);
    console.log(`Files: ${manifest.totals.files}, size: ${manifest.totals.size} bytes, time: ${Date.now() - started}ms`);
  }
}

main().catch(err => {
  console.error('Manifest generation failed:', err);
  process.exit(1);
});
