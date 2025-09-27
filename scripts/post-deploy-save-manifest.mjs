#!/usr/bin/env node
/**
 * Сохраняет текущий deploy-manifest.json как last-deploy-manifest.json
 * Запускать ЛОКАЛЬНО после успешного деплоя (или в конце deploy-safe.ps1 при необходимости).
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const src = path.join(root, 'deploy-manifest.json');
const dst = path.join(root, 'last-deploy-manifest.json');

if (!fs.existsSync(src)) {
  console.error('deploy-manifest.json не найден. Сначала выполните сборку/генерацию.');
  process.exit(1);
}

fs.copyFileSync(src, dst);
console.log('last-deploy-manifest.json обновлён.');