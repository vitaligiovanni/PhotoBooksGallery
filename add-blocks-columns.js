import pg from 'pg';
const { Client } = pg;

async function addBlocksColumns() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Manana08012023@localhost:5432/fotokraft'
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Добавляем недостающие колонки в таблицу blocks
    await client.query(`
      ALTER TABLE blocks 
      ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now(),
      ADD COLUMN IF NOT EXISTS title varchar
    `);
    
    console.log('Added missing columns to blocks table: is_active, updated_at, title');
    
    // Проверяем, что колонки добавились
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'blocks' 
      AND column_name IN ('is_active', 'updated_at', 'title')
    `);
    
    console.log('\nAdded columns:');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

addBlocksColumns();
