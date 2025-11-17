import { Pool } from 'pg';
import { readFile } from 'fs/promises';
import { join } from 'path';

const connectionString = 'postgresql://photobooks:Manana08012023@localhost:5432/photobooks_dev';

async function runHashtagsMigration() {
  const pool = new Pool({
    connectionString,
  });

  try {
    console.log('🔄 Подключение к базе данных...');
    
    // Читаем SQL файл миграции
    const migrationPath = join(process.cwd(), 'migrations', 'add_hashtags_column.sql');
    const migrationSQL = await readFile(migrationPath, 'utf-8');
    
    console.log('📄 Выполнение миграции hashtags...');
    
    // Выполняем миграцию
    await pool.query(migrationSQL);
    
    console.log('✅ Миграция hashtags успешно выполнена!');
    
    // Проверяем, что колонка создалась
    const checkResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'hashtags'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Колонка hashtags создана:', checkResult.rows[0]);
    } else {
      console.log('⚠️ Колонка hashtags не найдена');
    }
    
  } catch (error) {
    if (error.code === '42701') {
      console.log('✅ Колонка hashtags уже существует');
    } else {
      console.error('❌ Ошибка миграции:', error);
      throw error;
    }
  } finally {
    await pool.end();
    console.log('🔌 Соединение с базой закрыто');
  }
}

// Запуск миграции
runHashtagsMigration().catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});