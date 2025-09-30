#!/usr/bin/env tsx
/**
 * Выводит список применённых миграций (если таблица drizzle.__drizzle_migrations существует)
 * и сигнатуру локального набора файлов, чтобы сравнить с сервером.
 */
import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: url });
  try {
    const client = await pool.connect();
    let rows: any[] = [];
    try {
      const r = await client.query('select name, hash, executed_at from drizzle.__drizzle_migrations order by executed_at');
      rows = r.rows;
    } catch {
      console.warn('⚠️  drizzle.__drizzle_migrations отсутствует');
    }
    console.log('Applied migrations:');
    rows.forEach(r => console.log(` - ${r.name} @ ${r.executed_at}`));

    const migrationsDir = path.join(process.cwd(), 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    console.log('\nLocal migration files:');
    files.forEach(f => console.log(' * ' + f));
    const hash = crypto.createHash('sha256');
    for (const f of files) {
      const c = fs.readFileSync(path.join(migrationsDir, f));
      hash.update(f + ':' + c.length + ':');
    }
    console.log('\nLocal signature: ' + hash.digest('hex'));
    await client.release();
    await pool.end();
  } catch (e: any) {
    console.error('Error:', e.message);
    process.exit(2);
  }
}

main();
