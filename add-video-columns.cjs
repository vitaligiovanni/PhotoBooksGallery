const { Client } = require('pg');

async function addVideoColumns() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Manana08012023@localhost:5432/fotokraft'
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Добавляем колонку video_url (основное видео)
    console.log('Adding video_url column...');
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN video_url VARCHAR
    `);
    console.log('✅ video_url column added');
    
    // Добавляем колонку videos (массив видео)
    console.log('Adding videos column...');
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN videos TEXT[]
    `);
    console.log('✅ videos column added');
    
    console.log('🎉 Video support columns successfully added to products table!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

addVideoColumns();