import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../../shared/schema";

if (!process.env.DATABASE_URL) {
  console.error('[DB] ENV variable DATABASE_URL is missing. .env loaded?', { cwd: process.cwd() });
  throw new Error(
    "DATABASE_URL must be set. Did you forget to configure the database connection?",
  );
}

// Mask password for logging
function maskDbUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.password) {
      u.password = '***';
    }
    return u.toString();
  } catch {
    return '[invalid url]';
  }
}

console.log('[DB] Using connection string:', maskDbUrl(process.env.DATABASE_URL));

// Создаем пул соединений с PostgreSQL
// 🔥 CRITICAL: MindAR compilation BLOCKS CPU for 120 seconds (unavoidable)
// connectionTimeoutMillis MUST be > compilation time to prevent "Connection terminated"
// Real solution: Move compilation to Worker Thread (separate CPU core)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50, // Larger pool to handle concurrent requests during compilation
  min: 10, // Keep 10 warm connections ready
  idleTimeoutMillis: 30000, // 30s: normal idle timeout
  connectionTimeoutMillis: 180000, // 180s: MUST be > MindAR compilation time (120s)
  allowExitOnIdle: false,
  // PostgreSQL query_timeout: kill individual queries >30s
  query_timeout: 30000, // 30 seconds per query
});

pool.on('error', (err) => {
  console.error('❌ [DB] Pool error (likely idle client error):', err);
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
