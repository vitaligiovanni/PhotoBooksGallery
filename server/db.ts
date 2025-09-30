import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to configure the database connection?",
  );
}

// Создаем пул соединений с PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Настройки пула соединений
  max: 20, // максимум соединений в пуле
  idleTimeoutMillis: 30000, // время ожидания перед закрытием неактивного соединения
  connectionTimeoutMillis: 10000, // таймаут на подключение
});

// Создаем Drizzle ORM экземпляр
export const db = drizzle(pool, { schema });

// Функция для проверки подключения к базе данных
export async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as test');
    client.release();
    console.log('✅ База данных подключена успешно');
    return { success: true, result: result.rows[0] };
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error);
    return { success: false, error };
  }
}

// Корректное закрытие соединений при остановке процесса
const gracefulShutdown = async () => {
  console.log('🔄 Закрытие соединений с базой данных...');
  try {
    await pool.end();
    console.log('✅ Соединения с базой данных закрыты');
  } catch (error) {
    console.error('❌ Ошибка при закрытии соединений:', error);
  }
  process.exit(0);
};

// Обработчики сигналов завершения процесса
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGQUIT', gracefulShutdown);

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
  console.error('❌ Необработанное исключение:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанный отказ promise:', reason, 'at:', promise);
  gracefulShutdown();
});
