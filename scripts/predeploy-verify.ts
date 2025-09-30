#!/usr/bin/env tsx
/**
 * Преддеплойная проверка окружения и базы данных.
 * Цели:
 *  - Проверить соединение с БД
 *  - Считать server_encoding, lc_collate, lc_ctype, timezone
 *  - Проверить что все миграции присутствуют и не нарушена последовательность
 *  - Сравнить список таблиц со schema (Drizzle) — предупреждать об отсутствующих
 *  - Вывести рекомендации если что-то не совпадает
 */
import { Pool } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function log(section: string, message: string) {
  console.log(`\n=== ${section} ===\n${message}`);
}

const warnings: string[] = [];
function warn(message: string) {
  warnings.push(message);
  console.warn(`⚠️  ${message}`);
}

function ok(message: string) {
  console.log(`✅ ${message}`);
}

async function main() {
  const { DATABASE_URL, NODE_ENV } = process.env;
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL не задана');
    process.exit(1);
  }

  log('ENV', `NODE_ENV=${NODE_ENV || 'undefined'}`);

  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    const client = await pool.connect();
    ok('Подключение к БД установлено');

    // Базовые параметры кодировки/локалей
    const paramsQuery = `SELECT \n      current_database() as db,\n      current_user as user,\n      version() as version,\n      current_setting('server_encoding') as server_encoding,\n      current_setting('lc_collate') as lc_collate,\n      current_setting('lc_ctype') as lc_ctype,\n      current_setting('TimeZone') as timezone;`;
    const params = await client.query(paramsQuery);
    const row = params.rows[0];
    log('DB PARAMETERS', JSON.stringify(row, null, 2));

    if (row.server_encoding !== 'UTF8') {
      warn(`Ожидалась UTF8 кодировка, сейчас: ${row.server_encoding}`);
    } else {
      ok('Кодировка UTF8 подтверждена');
    }

    // Список таблиц
    const tablesRes = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1");
    const tables = tablesRes.rows.map(r => r.tablename);
    log('TABLES', tables.join(', '));

    // Проверка миграций (простая) — читаем папку migrations
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.match(/\.sql$/));
    files.sort();
    log('MIGRATION FILES', files.join('\n'));

    // Простая сигнатура
    const hash = crypto.createHash('sha256');
    for (const f of files) {
      const content = fs.readFileSync(path.join(migrationsDir, f));
      hash.update(f + ':' + content.length + ':');
    }
    const signature = hash.digest('hex');
    ok(`Сигнатура набора миграций: ${signature}`);

    // Проверим наличие служебной таблицы drizzle (если используется push / migrate)
    let drizzleState: any = null;
    try {
      const state = await client.query("SELECT name, hash, executed_at FROM drizzle.__drizzle_migrations ORDER BY executed_at");
      drizzleState = state.rows;
      log('DRIZZLE STATE', JSON.stringify(drizzleState, null, 2));
    } catch (e:any) {
      warn('Не удалось прочитать drizzle.__drizzle_migrations (возможно ещё не применялись миграции через drizzle-kit)');
    }

    // Простейшая эвристика несоответствий между файлами и таблицей drizzle
    if (drizzleState && Array.isArray(drizzleState)) {
      const fileBase = files.map(f => f.replace(/\.sql$/, ''));
      const missingInDb = fileBase.filter(n => !drizzleState.find((r:any) => r.name === n));
      if (missingInDb.length) {
        warn('Не все миграции применены: ' + missingInDb.join(', '));
      } else {
        ok('Все миграции из папки присутствуют в drizzle.__drizzle_migrations');
      }
    }

    // Проверка наличия расширения pgcrypto (для gen_random_uuid())
    try {
      const ext = await client.query("SELECT 1 FROM pg_extension WHERE extname='pgcrypto'");
      if (ext.rowCount === 0) {
        warn('Расширение pgcrypto не установлено (генерация UUID может не работать)');
      } else {
        ok('pgcrypto установлен');
      }
    } catch {
      warn('Не удалось проверить наличие pgcrypto');
    }

    // Проверка enum drift: вытянем значения из pg_type для известных enum
    const expectedEnums: Record<string,string[]> = {
      blog_status: ['draft','published','scheduled','archived'],
      currency: ['USD','RUB','AMD'],
      order_status: ['pending','processing','shipped','delivered','cancelled'],
      photobook_format: ['album','book','square'],
      review_status: ['pending','approved','rejected']
    };
    try {
      const enumNames = Object.keys(expectedEnums);
      const q = `SELECT t.typname as name, e.enumlabel as value\n               FROM pg_type t\n               JOIN pg_enum e ON t.oid = e.enumtypid\n               WHERE t.typname = ANY($1) ORDER BY t.typname, e.enumsortorder`;
      const pgEnums = await client.query(q, [enumNames]);
      const grouped: Record<string,string[]> = {};
      for (const r of pgEnums.rows) {
        grouped[r.name] = grouped[r.name] || []; grouped[r.name].push(r.value);
      }
      for (const name of enumNames) {
        const got = grouped[name] || [];
        const exp = expectedEnums[name];
        if (JSON.stringify(got) !== JSON.stringify(exp)) {
          warn(`Enum drift: ${name}: ожидалось [${exp.join(',')}] получили [${got.join(',')}]`);
        } else {
          ok(`Enum ${name} совпадает`);
        }
      }
    } catch (e:any) {
      warn('Не удалось проверить enum drift: ' + e.message);
    }

    // Количество миграций — эвристика (если меньше локальных файлов)
    if (drizzleState) {
      if (drizzleState.length < files.length) {
        warn(`Не все локальные миграции применены (applied=${drizzleState.length} < files=${files.length})`);
      }
    }

    // Рекомендации
    log('RECOMMENDATIONS', `1. Перед деплоем сделать pg_dump продакшн базы (структура+данные)\n2. Сверить сигнатуру миграций между локальной версией и сервером (можно вывести её там тем же скриптом)\n3. Убедиться что TimeZone = UTC или желаемая (сейчас: ${row.timezone})\n4. Избегать изменения уже применённых SQL файлов — добавлять новые\n5. После деплоя выполнить smoke-запросы /api/health, /api/debug/encoding`);

    await client.release();
    await pool.end();
    if (warnings.length) {
      console.log('\n--- SUMMARY WARNINGS ---');
      warnings.forEach(w => console.log('⚠️  ' + w));
      if (process.env.STRICT_PREDEPLOY === '1') {
        console.error('❌ STRICT_PREDEPLOY=1: есть предупреждения, завершаю с кодом 3');
        process.exit(3);
      }
    }
    ok('Проверка завершена успешно');
  } catch (e:any) {
    console.error('❌ Ошибка во время проверки:', e.message);
    process.exit(2);
  }
}

main();
