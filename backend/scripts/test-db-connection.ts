import 'dotenv/config';
import { pool } from '../src/db';

async function main() {
  console.log('\n[TEST-DB] Starting database connectivity test...');
  try {
    const client = await pool.connect();
    console.log('[TEST-DB] Connected. Running simple query...');
    const r = await client.query('SELECT NOW() as now, current_database() as db, user as user');
    console.log('[TEST-DB] Result:', r.rows[0]);
    client.release();
    console.log('[TEST-DB] SUCCESS ✅');
  } catch (err: any) {
    console.error('[TEST-DB] FAILURE ❌');
    console.error(' name:', err.name);
    console.error(' code:', err.code);
    console.error(' message:', err.message);
    if (err.stack) console.error(err.stack.split('\n').slice(0,6).join('\n'));
    if (err instanceof Error && 'severity' in err) {
      // @ts-ignore
      console.error(' severity:', err.severity);
    }
    console.error('\nDiagnostics:');
    console.error('  DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);
    console.error('  NODE_ENV:', process.env.NODE_ENV);
  } finally {
    await pool.end();
  }
}

main();
