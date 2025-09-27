#!/usr/bin/env node
/**
 * predeploy-check.mjs
 * Цель: перед деплоем быстро проверить состояние:
 *  - git чистый?
 *  - есть ли untracked важные файлы
 *  - собирается ли проект (опционально --build)
 *  - сгенерировать новый deploy-manifest.json и сравнить с предыдущим (last-deploy-manifest.json)
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const doBuild = args.includes('--build');
const quiet = args.includes('--quiet');

function log(msg) { if (!quiet) console.log(msg); }
function run(cmd) { return execSync(cmd, { stdio: 'pipe' }).toString().trim(); }

let gitClean = false;
try {
  const status = run('git status --porcelain');
  gitClean = status.length === 0;
  log(gitClean ? '✔ Git рабочее дерево чистое' : '✖ Есть несохранённые изменения (git status)');
} catch (e) {
  log('⚠ Не удалось выполнить git status');
}

if (doBuild) {
  try {
    log('Запуск: npm run build');
    execSync('npm run build', { stdio: 'inherit' });
  } catch (e) {
    console.error('Сборка провалилась. Останов.');
    process.exit(2);
  }
}

// Генерируем манфест
try {
  execSync('node scripts/generate-manifest.mjs --quiet', { stdio: 'inherit' });
} catch (e) {
  console.error('Не удалось создать manifest.');
  process.exit(3);
}

const lastManifest = path.join(process.cwd(), 'last-deploy-manifest.json');
if (fs.existsSync(lastManifest)) {
  try {
    const diffOut = run('node scripts/diff-manifests.mjs last-deploy-manifest.json deploy-manifest.json');
    log('Diff (last vs new):');
    log(diffOut);
  } catch (e) {
    console.error('Ошибка diff:', e.message);
  }
} else {
  log('Нет last-deploy-manifest.json (первый деплой или файл не сохранён).');
}

if (!gitClean) {
  console.warn('Предупреждение: git не чистый. Рекомендуется закоммитить перед деплоем.');
}

log('predeploy-check завершён.');