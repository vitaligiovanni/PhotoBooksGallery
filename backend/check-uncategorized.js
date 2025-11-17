// Check products in uncategorized category using backend infrastructure
import { db } from './src/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function checkUncategorized() {
  try {
    console.log('🔍 Проверяем товары в категории Uncategorized...');
    
    const uncategorizedId = '20394d7e-89c6-4c83-a93c-81e76d708513';
    
    // Найти товары с categoryId = uncategorized
    const productsInCategory = await db
      .select()
      .from(products)
      .where(eq(products.categoryId, uncategorizedId));
    
    console.log(`📊 Найдено товаров с categoryId='${uncategorizedId}': ${productsInCategory.length}`);
    
    if (productsInCategory.length > 0) {
      console.log('📦 Товары:');
      productsInCategory.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name} (ID: ${product.id})`);
        console.log(`     categoryId: ${product.categoryId}`);
        console.log(`     subcategoryId: ${product.subcategoryId || 'null'}`);
      });
    }
    
    // Также найти товары с subcategoryId = uncategorized
    const productsInSubcategory = await db
      .select()
      .from(products)
      .where(eq(products.subcategoryId, uncategorizedId));
    
    console.log(`📊 Найдено товаров с subcategoryId='${uncategorizedId}': ${productsInSubcategory.length}`);
    
    if (productsInSubcategory.length > 0) {
      console.log('📦 Товары в подкатегории:');
      productsInSubcategory.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name} (ID: ${product.id})`);
        console.log(`     categoryId: ${product.categoryId}`);
        console.log(`     subcategoryId: ${product.subcategoryId}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    process.exit(0);
  }
}

checkUncategorized();