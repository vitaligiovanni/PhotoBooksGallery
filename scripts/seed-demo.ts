#!/usr/bin/env tsx
import 'dotenv/config';
import fetch from 'node-fetch';

const API = process.env.API_URL || 'http://localhost:3000/api';

async function seedTestData() {
  console.log('[seed-demo] Начинаю создание демо данных...');
  
  try {
    // Проверяем есть ли уже категории
    const catResp = await fetch(`${API}/categories`);
    const categories = await catResp.json() as any[];
    
    let categoryId: string;
    
    if (categories.length === 0) {
      console.log('[seed-demo] Создаю категорию...');
      const catPayload = {
        name: { ru: 'Демо категория', en: 'Demo Category', hy: 'Դեմո կատեգորիա' },
        slug: `demo-cat-${Date.now()}`,
        description: { ru: 'Тестовая категория для проверки' }
      };
      
      const createCatResp = await fetch(`${API}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catPayload)
      });
      
      if (!createCatResp.ok) {
        throw new Error(`Ошибка создания категории: ${createCatResp.status}`);
      }
      
      const createdCat = await createCatResp.json() as any;
      categoryId = createdCat.id;
      console.log(`[seed-demo] Категория создана: ${categoryId}`);
    } else {
      categoryId = categories[0].id;
      console.log(`[seed-demo] Использую существующую категорию: ${categoryId}`);
    }
    
    // Проверяем есть ли товары
    const prodResp = await fetch(`${API}/products`);
    const products = await prodResp.json() as any[];
    
    if (products.length === 0) {
      console.log('[seed-demo] Создаю товар...');
      const prodPayload = {
        name: { ru: 'Демо товар', en: 'Demo Product', hy: 'Դեմո ապրանք' },
        description: { ru: 'Тестовый товар для проверки системы' },
        price: '99.99',
        categoryId: categoryId,
        inStock: true,
        stockQuantity: 10
      };
      
      const createProdResp = await fetch(`${API}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prodPayload)
      });
      
      if (!createProdResp.ok) {
        throw new Error(`Ошибка создания товара: ${createProdResp.status}`);
      }
      
      const createdProd = await createProdResp.json() as any;
      console.log(`[seed-demo] Товар создан: ${createdProd.id}`);
    } else {
      console.log(`[seed-demo] Товары уже существуют (${products.length})`);
    }
    
    console.log('[seed-demo] ✅ Демо данные готовы');
    process.exit(0);
    
  } catch (error: any) {
    console.error('[seed-demo] ❌ Ошибка:', error.message);
    process.exit(1);
  }
}

seedTestData();