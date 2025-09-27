const pg = require('pg');
const { Client } = pg;
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, 'objects', 'local-upload');

async function findBrokenImages() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Manana08012023@localhost:5432/fotokraft'
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Получаем все UUID из всех таблиц, где могут быть изображения
    const queries = [
      // Пользователи
      "SELECT id, profileImageUrl as uuid FROM users WHERE profileImageUrl IS NOT NULL AND profileImageUrl != ''",
      
      // Категории
      "SELECT id, imageUrl as uuid FROM categories WHERE imageUrl IS NOT NULL AND imageUrl != ''",
      
      // Продукты (основное изображение)
      "SELECT id, imageUrl as uuid FROM products WHERE imageUrl IS NOT NULL AND imageUrl != ''",
      
      // Продукты (дополнительные изображения)
      "SELECT id, unnest(images) as uuid FROM products WHERE images IS NOT NULL AND array_length(images, 1) > 0",
      
      // Блог посты
      "SELECT id, featuredImage as uuid FROM blog_posts WHERE featuredImage IS NOT NULL AND featuredImage != ''",
      
      // Отзывы
      "SELECT id, profilePhoto as uuid FROM reviews WHERE profilePhoto IS NOT NULL AND profilePhoto != ''"
    ];

    const allUUIDs = new Set();
    const brokenReferences = [];

    for (const query of queries) {
      try {
        const result = await client.query(query);
        for (const row of result.rows) {
          if (row.uuid) {
            // Извлекаем UUID из полного пути
            // Извлекаем UUID из полного пути (поддерживаем больше расширений и форматов)
            const uuidMatch = row.uuid.match(/\/([a-f0-9-]{36})\.(jpg|jpeg|png|gif|webp|JPG|JPEG|PNG|GIF|WEBP)$/i);
            if (uuidMatch) {
              allUUIDs.add(uuidMatch[1]); // Добавляем только UUID
            } else if (row.uuid.match(/^[a-f0-9-]{36}$/)) {
              // Если это уже чистый UUID (36 символов)
              allUUIDs.add(row.uuid);
            } else {
              // Пробуем извлечь UUID другими способами
              const uuidOnlyMatch = row.uuid.match(/\/([a-f0-9-]{36})(?:\.\w+)?$/);
              if (uuidOnlyMatch) {
                allUUIDs.add(uuidOnlyMatch[1]);
              } else {
                console.log(`Warning: Could not extract UUID from: ${row.uuid}`);
              }
            }
          }
        }
      } catch (error) {
        console.log(`Query failed (table might not exist): ${query.split(' ')[3]}`);
      }
    }

    console.log(`Found ${allUUIDs.size} image references in database`);

    // Проверяем наличие файлов
    const files = fs.readdirSync(UPLOAD_DIR);
    const fileUUIDs = new Set();
    
    for (const file of files) {
      const uuid = file.split('.')[0]; // Убираем расширение
      fileUUIDs.add(uuid);
    }

    console.log(`Found ${fileUUIDs.size} files in upload directory`);

    // Находим отсутствующие файлы
    for (const uuid of allUUIDs) {
      if (!fileUUIDs.has(uuid)) {
        brokenReferences.push(uuid);
        console.log(`❌ Missing file: ${uuid}`);
      }
    }

    console.log(`\n=== RESULTS ===`);
    console.log(`Total image references: ${allUUIDs.size}`);
    console.log(`Missing files: ${brokenReferences.length}`);
    
    if (brokenReferences.length > 0) {
      console.log('\nMissing UUIDs:');
      brokenReferences.forEach(uuid => console.log(uuid));
      
      // Сохраняем результаты в файл
      fs.writeFileSync('broken-images-report.txt', 
        `Broken Image Report - ${new Date().toISOString()}\n` +
        `Total references: ${allUUIDs.size}\n` +
        `Missing files: ${brokenReferences.length}\n\n` +
        brokenReferences.join('\n')
      );
      console.log('\nReport saved to broken-images-report.txt');
    } else {
      console.log('✅ All image files are present!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

findBrokenImages();