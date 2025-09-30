#!/usr/bin/env tsx
/**
 * Проверка обязательных переменных окружения.
 * Exit codes: 0 ok, 1 missing required.
 */
const REQUIRED = [
  'DATABASE_URL',
  'SESSION_SECRET'
];

const OPTIONAL = [
  'PORT',
  'API_URL',
  'FRONTEND_URL',
  'DOMAIN'
];

let missing: string[] = [];
for (const key of REQUIRED) {
  if (!process.env[key] || process.env[key] === '') {
    missing.push(key);
  }
}

if (missing.length) {
  console.error('❌ Отсутствуют обязательные переменные: ' + missing.join(', '));
  process.exit(1);
}

console.log('✅ Все обязательные переменные заданы');
console.log('ℹ️  Опциональные: ' + OPTIONAL.filter(k => process.env[k]).join(', '));
