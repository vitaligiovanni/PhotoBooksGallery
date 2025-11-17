// Migration script to add coverImage and bannerImage columns to categories table
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  connectionString: 'postgresql://photobooks:Manana08012023@localhost:5432/photobooks_dev'
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Выполнение миграции: добавление колонок cover_image и banner_image...');

    // Читаем SQL файл
    const sqlPath = path.join(__dirname, 'add_cover_banner_images.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Выполняем SQL
    await client.query(sql);

    console.log('✅ Миграция выполнена успешно!');
    console.log('✅ Колонки cover_image и banner_image добавлены в таблицу categories');

    // Проверяем что колонки созданы
    const checkResult = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'categories' AND column_name IN ('cover_image', 'banner_image')
      ORDER BY column_name
    `);

    if (checkResult.rows.length === 2) {
      console.log('✅ Проверка: колонки найдены в схеме:');
      checkResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}, nullable: ${row.is_nullable}`);
      });
    } else {
      console.error('❌ Ошибка: не все колонки найдены после миграции');
      console.log('Найдено колонок:', checkResult.rows.length);
    }

  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});