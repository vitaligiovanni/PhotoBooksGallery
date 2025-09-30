#!/usr/bin/env tsx
/**
 * Быстрая проверка каталога: наличие категорий и продуктов.
 * Успех (exit 0) если:
 *  - Есть >=1 категория
 *  - Есть >=1 продукт
 * Иначе exit 2.
 */
import 'dotenv/config';
import fetch from 'node-fetch';

const API = process.env.API_URL || 'http://localhost:3000/api';

function log(msg: string) { console.log(`[verify-catalog] ${msg}`); }

async function getJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

async function main() {
  try {
    log(`API base: ${API}`);
  const categories = await getJson(`${API}/categories`) as any[];
  const products = await getJson(`${API}/products`) as any[];

    log(`Категорий: ${categories.length}`);
    log(`Продуктов: ${products.length}`);

    if (!categories.length) {
      console.error('❌ Нет категорий');
      process.exit(2);
    }
    if (!products.length) {
      console.error('❌ Нет продуктов');
      process.exit(2);
    }

    console.log('✅ Категории и продукты присутствуют');
  } catch (e: any) {
    console.error('❌ Ошибка проверки:', e.message);
    process.exit(1);
  }
}

main();
