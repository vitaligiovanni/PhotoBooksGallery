import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// AR Service Database Configuration
// CRITICAL: Isolated database for AR projects ONLY
// No mixing with main e-commerce database

const databaseUrl = process.env.AR_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('AR_DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 20, // Normal pool size (no MindAR blocking in main pool)
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000, // Normal timeout (workers handle compilation)
  statement_timeout: 30000, // 30s query timeout
  application_name: 'ar-service'
});

// Test connection on startup
pool.on('connect', () => {
  console.log('[AR DB] ✅ Connected to AR database');
});

pool.on('error', (err) => {
  console.error('[AR DB] ❌ Unexpected error:', err);
  process.exit(-1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[AR DB] 🛑 Closing database pool...');
  await pool.end();
  console.log('[AR DB] ✅ Database pool closed');
});

export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('[AR DB] ✅ Database connection test successful');
    return true;
  } catch (error) {
    console.error('[AR DB] ❌ Database connection test failed:', error);
    return false;
  }
}
