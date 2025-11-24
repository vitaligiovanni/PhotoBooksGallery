import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple migration runner
// Executes SQL files in order

const pool = new Pool({
  connectionString: process.env.AR_DATABASE_URL
});

async function runMigrations() {
  console.log('[Migrations] 🔄 Starting database migrations...');
  
  try {
    // Read migration files
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`[Migrations] Found ${files.length} migration(s)`);
    
    for (const file of files) {
      console.log(`[Migrations] 📄 Running: ${file}`);
      
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      await pool.query(sql);
      console.log(`[Migrations] ✅ Completed: ${file}`);
    }
    
    console.log('[Migrations] ✅ All migrations completed successfully');
    
  } catch (error) {
    console.error('[Migrations] ❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };
