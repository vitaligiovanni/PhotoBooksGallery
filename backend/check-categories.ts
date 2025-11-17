import 'dotenv/config';
import { db } from './src/db';
import { categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkCategories() {
  try {
    const allCategories = await db.select().from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.order, categories.sortOrder);

    console.log('Категории из базы данных:');
    allCategories.forEach(cat => {
      const name = typeof cat.name === 'object' ? cat.name?.ru || cat.name?.en || 'No name' : cat.name || 'No name';
      console.log(`ID: ${cat.id}, Name: ${name}, Order: ${cat.order}, ParentId: ${cat.parentId || 'null'}`);
    });
  } catch (error) {
    console.error('Ошибка:', error);
  }
  process.exit(0);
}

checkCategories();