import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Используем такую же строку соединения, как и в других скриптах миграций
const pool = new Pool({
  connectionString: 'postgresql://photobooks:Manana08012023@localhost:5432/photobooks_dev'
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Выполнение миграции: создание таблицы uploads...');
    const sqlPath = path.join(__dirname, 'add_uploads_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('✅ Миграция выполнена: таблица uploads создана (если её не было)');
  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции uploads:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
