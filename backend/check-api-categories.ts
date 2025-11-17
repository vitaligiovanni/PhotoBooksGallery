import 'dotenv/config';
import { db } from './src/db';
import { categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkAPICategories() {
  try {
    // Имитируем getCategories() из storage.ts
    const allCategories = await db.select().from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.order, categories.sortOrder);

    console.log('Все категории (как возвращает API):');
    allCategories.forEach(cat => {
      const name = typeof cat.name === 'object' ? cat.name?.ru || cat.name?.en || 'No name' : cat.name || 'No name';
      const isSub = cat.parentId ? ' (подкатегория)' : ' (основная)';
      console.log(`Order: ${cat.order}, Name: ${name}${isSub}`);
    });

    console.log('\nОсновные категории (без parentId):');
    const rootCategories = allCategories.filter(cat => !cat.parentId);
    rootCategories.forEach(cat => {
      const name = typeof cat.name === 'object' ? cat.name?.ru || cat.name?.en || 'No name' : cat.name || 'No name';
      console.log(`Order: ${cat.order}, Name: ${name}`);
    });
  } catch (error) {
    console.error('Ошибка:', error);
  }
  process.exit(0);
}

checkAPICategories();