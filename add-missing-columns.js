import pg from 'pg';
const { Client } = pg;

async function addMissingColumns() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Manana08012023@localhost:5432/fotokraft'
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Добавляем недостающие колонки
    await client.query(`
      ALTER TABLE pages 
      ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_homepage boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0
    `);
    
    console.log('Added missing columns: is_published, is_homepage, and sort_order');
    
    // Проверяем, что колонки добавились
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'pages' 
      AND column_name IN ('is_published', 'is_homepage')
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

addMissingColumns();
