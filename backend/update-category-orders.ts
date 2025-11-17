import 'dotenv/config';
import { db } from './src/db';
import { categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function updateCategoryOrders() {
  try {
    console.log('Обновляем order для категорий...');

    // Обновляем Персональный фотоальбом без фото на order=2
    await db.update(categories)
      .set({ order: 2 } as any)
      .where(eq(categories.id, '8bccc07e-695b-4136-8028-59979b55774c'));

    // Обновляем Календари на order=3
    await db.update(categories)
      .set({ order: 3 } as any)
      .where(eq(categories.id, '8157f83f-422f-459f-a473-33ba75bc18c0'));

    console.log('✅ Order обновлены');
  } catch (error) {
    console.error('Ошибка:', error);
  }
  process.exit(0);
}

updateCategoryOrders();