import { storage } from './storage';
import { db } from './db';
import { categories, products } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export async function cleanInvalidCategories() {
  const dryRun = process.env.CLEAN_CATEGORIES_DRY_RUN === '1';
  console.log(`🔄 Поиск и очистка неверных категорий... (dryRun=${dryRun})`);
  
  try {
    // Найдем все категории
    const allCategories = await storage.getCategories();
    const invalidCategories = [];
    
    for (const category of allCategories) {
      const categoryName = (category.name as any)?.ru || '';
      const normalized = categoryName.trim();
      const isInvalid =
        !normalized ||
        normalized.length < 2 ||
        /^[ds]+$/i.test(normalized) ||
        normalized === 'dsdsds' ||
        normalized.toLowerCase().includes('test') ||
        normalized.toLowerCase().includes('temp');

      if (isInvalid) {
        console.log(`❌ Найдена неверная категория: "${categoryName}" (ID: ${category.id})`);
        invalidCategories.push({ ...category, nameRu: categoryName });
      }
    }

    if (invalidCategories.length === 0) {
      console.log('✅ Неверных категорий не найдено');
      return;
    }
    
  console.log(`Найдено ${invalidCategories.length} неверных категорий:`);
    invalidCategories.forEach(cat => {
      console.log(`  - "${cat.nameRu}" (ID: ${cat.id}, slug: ${cat.slug})`);
    });
    
    // Обрабатываем каждую неверную категорию в транзакции
    for (const invalidCategory of invalidCategories) {
      await db.transaction(async (tx) => {
        // Находим товары, где эта категория указана как основная или подкатегория
        const productsWithCategory = await tx.select().from(products)
          .where(eq(products.categoryId, invalidCategory.id));
        const productsWithSubcategory = await tx.select().from(products)
          .where(eq(products.subcategoryId, invalidCategory.id));

        const totalRefs = productsWithCategory.length + productsWithSubcategory.length;
        const childCategories = await tx.select().from(categories)
          .where(eq(categories.parentId, invalidCategory.id));
        const hasChildren = childCategories.length > 0;

        if (totalRefs > 0 || hasChildren) {
          console.log(`⛔ Пропуск категории "${invalidCategory.nameRu}" (id=${invalidCategory.id}) — references=${totalRefs}, children=${childCategories.length}`);
          return; // ничего не делаем
        }

        if (dryRun) {
          console.log(`(dry-run) Категория id=${invalidCategory.id} slug=${invalidCategory.slug} может быть удалена (нет связей)`);
          return;
        }

        try {
          // Пытаемся удалить
            await tx.delete(categories).where(eq(categories.id, invalidCategory.id));
            console.log(`🗑️  Удалена неверная категория: "${invalidCategory.nameRu}"`);
        } catch (err: any) {
          if (err.code === '23503') {
            // На случай гонки или оставшихся связей делаем soft-disable
            console.log(`⚠️  FK блокирует удаление категории ${invalidCategory.id}. Помечаю isActive=false вместо удаления.`);
            await tx.update(categories)
              .set({ isActive: false } as any)
              .where(eq(categories.id, invalidCategory.id));
          } else {
            throw err;
          }
        }
      });
    }
    
  console.log(`🎉 Очистка неверных категорий завершена: удалено (или помечено) без ссылок. Категорий с товарами/детьми не тронуто.`);
    
  } catch (error) {
    console.error('❌ Ошибка при очистке неверных категорий:', error);
    throw error;
  }
}