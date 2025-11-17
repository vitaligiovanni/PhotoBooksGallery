import 'dotenv/config';
import { db } from './src/db';
import { categories } from '../shared/schema';
import { eq, isNull } from 'drizzle-orm';

async function updateOrders() {
  try {
    console.log('Обновляем order для существующих категорий...');

    // Обновляем все категории с order=0 на 1
    const result = await db.update(categories)
      .set({ order: 1 } as any)
      .where(eq(categories.order, 0));

    console.log('✅ Обновлено категорий с order=0 на order=1:', result.rowCount);

    // Также обновляем null значения
    const nullResult = await db.update(categories)
      .set({ order: 1 } as any)
      .where(isNull(categories.order));

    console.log('✅ Обновлено категорий с order=null на order=1:', nullResult.rowCount);

    console.log('🎉 Все категории теперь имеют order >= 1');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при обновлении order:', error);
    process.exit(1);
  }
}

updateOrders();