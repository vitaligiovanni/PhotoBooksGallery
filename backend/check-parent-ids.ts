import 'dotenv/config';
import { db } from './src/db';
import { categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkParentIds() {
  try {
    const allCategories = await db.select().from(categories)
      .where(eq(categories.isActive, true));

    console.log('Проверка parentId:');
    allCategories.forEach(cat => {
      const name = typeof cat.name === 'object' ? cat.name?.ru || cat.name?.en || 'No name' : cat.name || 'No name';
      console.log(`Name: ${name}, parentId: "${cat.parentId}", type: ${typeof cat.parentId}`);
    });
  } catch (error) {
    console.error('Ошибка:', error);
  }
  process.exit(0);
}

checkParentIds();