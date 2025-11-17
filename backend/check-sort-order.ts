import 'dotenv/config';
import { db } from './src/db';
import { categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkSortOrder() {
  try {
    const allCategories = await db.select().from(categories)
      .where(eq(categories.isActive, true));

    console.log('Все категории с sortOrder:');
    allCategories.forEach(cat => {
      const name = typeof cat.name === 'object' ? cat.name?.ru || cat.name?.en || 'No name' : cat.name || 'No name';
      const isSub = cat.parentId ? ' (подкатегория)' : ' (основная)';
      console.log(`ID: ${cat.id}, Name: ${name}, Order: ${cat.order}, SortOrder: ${cat.sortOrder}, ParentId: ${cat.parentId || 'null'}`);
    });

    console.log('\nОсновные категории:');
    const rootCategories = allCategories.filter(cat => !cat.parentId);
    rootCategories.forEach(cat => {
      const name = typeof cat.name === 'object' ? cat.name?.ru || cat.name?.en || 'No name' : cat.name || 'No name';
      console.log(`Name: ${name}, Order: ${cat.order}, SortOrder: ${cat.sortOrder}`);
    });
  } catch (error) {
    console.error('Ошибка:', error);
  }
  process.exit(0);
}

checkSortOrder();