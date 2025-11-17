// Migration script to add is_ready_made column
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  connectionString: 'postgresql://photobooks:Manana08012023@localhost:5432/photobooks_dev'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Выполнение миграции: добавление колонки is_ready_made...');
    
    // Читаем SQL файл
    const sqlPath = path.join(__dirname, 'add_ready_made_column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Выполняем SQL
    await client.query(sql);
    
    console.log('✅ Миграция выполнена успешно!');
    console.log('✅ Колонка is_ready_made добавлена в таблицу products');
    
    // Проверяем что колонка создана
    const checkResult = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'is_ready_made'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Проверка: колонка найдена в схеме:', checkResult.rows[0]);
    } else {
      console.error('❌ Ошибка: колонка не найдена после миграции');
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