import 'dotenv/config';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, 'add_uploads_lifecycle.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('🔄 Applying add_uploads_lifecycle.sql to', connectionString);
    await client.query(sql);
    console.log('✅ Migration applied');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
