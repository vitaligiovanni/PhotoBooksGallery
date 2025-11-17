import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { generateSlug, ensureUniqueSlug, buildExistingSlugSet } from "../utils/slug";
import { insertCategorySchema, insertProductSchema, insertOrderSchema, products as db_products, products, categories } from "../../../shared/schema";
import { LocalStorageService } from "../localStorage";
import { mockAuth, requireAdmin } from "./middleware";
import { db } from "../db";
import { or, eq } from "drizzle-orm";

export function createEcommerceRouter() {
  const router = Router();

  // Category routes
  router.get('/categories', async (req, res) => {
    try {
      const hierarchy = req.query.hierarchy === 'true';
      
      if (hierarchy) {
        const categories = await storage.getCategoriesHierarchy();
        res.json(categories);
      } else {
        const categories = await storage.getCategories();
        res.json(categories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  router.get('/categories/hierarchy', async (req, res) => {
    try {
      const categories = await storage.getCategoriesHierarchy();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories hierarchy:", error);
      res.status(500).json({ message: "Failed to fetch categories hierarchy" });
    }
  });

  router.get('/categories/flat', async (req, res) => {
    try {
      const lang = req.query.lang as string || 'ru';
      const categories = await storage.getCategoriesFlat();
      
      // Преобразуем категории для правильного отображения переводов
      const processedCategories = categories.map(category => {
        // Если есть структура translations, используем её
        if (category.translations && typeof category.translations === 'object') {
          const trAny = category.translations as any;
          const langData = trAny[lang] || trAny['ru'] || trAny[Object.keys(trAny)[0]];
          if (langData) {
            return {
              ...category,
              name: langData.name || category.name,
              description: langData.description || category.description,
              slug: langData.slug || category.slug
            };
          }
        }
        
        // Если есть структура name как объект
        if (category.name && typeof category.name === 'object') {
          const nameAny = category.name as any;
          const descAny = category.description as any;
          const name = nameAny[lang] || nameAny['ru'] || nameAny[Object.keys(nameAny)[0]];
          const description = category.description && typeof category.description === 'object' 
            ? (descAny?.[lang] || descAny?.['ru'] || descAny?.[Object.keys(descAny)[0]])
            : category.description;
            
          return {
            ...category,
            name,
            description
          };
        }
        
        return category;
      });
      
      res.json(processedCategories);
    } catch (error) {
      console.error("Error fetching categories flat:", error);
      res.status(500).json({ message: "Failed to fetch categories flat" });
    }
  });

  // Диагностика поддерева категории: возвращает состав поддерева и статистику по товарам
  router.get('/categories/:id/diagnose', async (req, res) => {
    try {
      const id = req.params.id;
      const report = await storage.diagnoseCategoryTree(id);
      res.json({
        message: 'diagnose ok',
        ...report
      });
    } catch (error: any) {
      console.error('[GET /categories/:id/diagnose] error', error);
      res.status(500).json({ message: 'Failed to diagnose category', error: error?.message });
    }
  });

  router.post('/categories', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      // Allow both legacy and new payload shapes
      const body = req.body || {};
      // If client already validated, we still run schema for base safety (may be partial)
      // We will reconstruct final object with translations if provided
      let parsed: any = {};
      try {
        parsed = insertCategorySchema.partial().parse(body);
      } catch (e) {
        // Continue with raw body; we'll validate critical fields manually
        parsed = body;
      }

      // Fetch existing categories for uniqueness
      const existingCategories = await storage.getCategories();
      const existingSet = await buildExistingSlugSet(existingCategories);

      const translations = body.translations || parsed.translations || null;
      const ruSourceName = translations?.ru?.name || body.name?.ru || parsed.name?.ru || body.name || parsed.name;
      if (!ruSourceName) {
        return res.status(400).json({ message: 'Русское название обязательно' });
      }

      const ruSlugDesired = (translations?.ru?.slug) || parsed.slug || generateSlug(ruSourceName, 'ru');
      const ruSlug = ensureUniqueSlug(ruSlugDesired, existingSet);
      existingSet.add(ruSlug);

      // Build multilingual block
      const hyName = translations?.hy?.name || body.name?.hy || parsed.name?.hy || '';
      const enName = translations?.en?.name || body.name?.en || parsed.name?.en || '';
      const hySlugDesired = translations?.hy?.slug || (hyName ? generateSlug(hyName, 'hy') : '');
      const enSlugDesired = translations?.en?.slug || (enName ? generateSlug(enName, 'en') : '');
      const hySlug = hySlugDesired ? ensureUniqueSlug(hySlugDesired, existingSet) : '';
      if (hySlug) existingSet.add(hySlug);
      const enSlug = enSlugDesired ? ensureUniqueSlug(enSlugDesired, existingSet) : '';
      if (enSlug) existingSet.add(enSlug);

      const finalTranslations = {
        ru: {
          name: ruSourceName,
          slug: ruSlug,
          description: translations?.ru?.description || body.description?.ru || parsed.description?.ru || ''
        },
        hy: {
          name: hyName || '',
          slug: hySlug,
          description: translations?.hy?.description || body.description?.hy || parsed.description?.hy || ''
        },
        en: {
          name: enName || '',
          slug: enSlug,
          description: translations?.en?.description || body.description?.en || parsed.description?.en || ''
        }
      };

      const categoryData: any = {
        name: { ru: ruSourceName, hy: hyName || '', en: enName || '' },
        slug: ruSlug, // primary slug is russian baseline
        description: {
          ru: finalTranslations.ru.description,
          hy: finalTranslations.hy.description,
            en: finalTranslations.en.description
        },
        translations: finalTranslations,
        parentId: body.parentId || parsed.parentId || null,
        imageUrl: body.imageUrl || parsed.imageUrl || undefined,
        coverImage: body.coverImage || parsed.coverImage || undefined,
        bannerImage: body.bannerImage || parsed.bannerImage || undefined,
        order: body.order || parsed.order || 1,
        isActive: body.isActive ?? true
      };

      // Normalize image URL if it's an external object URL (legacy)
      if (categoryData.imageUrl && categoryData.imageUrl.startsWith('https://storage.googleapis.com/')) {
        const storageSvc = new LocalStorageService();
        categoryData.imageUrl = storageSvc.normalizeObjectEntityPath(categoryData.imageUrl);
        console.log('Normalized category image URL:', categoryData.imageUrl);
      }

      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  router.put('/categories/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const { translations, parent_id, product_ids, ...otherData } = req.body;
      const categoryId = req.params.id;

      console.log('[PUT /categories/:id] Request body:', JSON.stringify(req.body, null, 2));
      console.log('[PUT /categories/:id] otherData:', JSON.stringify(otherData, null, 2));
      console.log('[PUT /categories/:id] coverImage:', otherData.coverImage);
      console.log('[PUT /categories/:id] bannerImage:', otherData.bannerImage);

      // 1. Получаем текущую категорию
      const existing = await storage.getCategoryById(categoryId);
      if (!existing) {
        return res.status(404).json({ message: 'Категория не найдена' });
      }

      // 2. Если есть многоязычные данные — перерасчёт slug с обеспечением уникальности
      let finalTranslations: any = translations || existing.translations || null;
      if (translations) {
        // Собираем множество уже занятых slug из других категорий
        const all = await storage.getCategories();
        const others = all.filter(c => c.id !== categoryId);
        const existingSet = await buildExistingSlugSet(others);

        const langs: Array<'ru'|'hy'|'en'> = ['ru','hy','en'];
        finalTranslations = {};

        for (const lang of langs) {
          const incoming = (translations && translations[lang]) || {};
            // Текущие сохранённые данные (могут быть в existing.translations или плоских полях)
          const current = (existing.translations && (existing.translations as any)[lang]) || {};

          // Имя: новое -> существующее переводное -> существующее имя в объекте name -> fallback плоское имя
          const name = incoming.name ?? current.name ?? (existing.name && typeof existing.name === 'object' ? (existing.name as any)[lang] : existing.name) ?? '';
          const description = incoming.description ?? current.description ?? (existing.description && typeof existing.description === 'object' ? (existing.description as any)[lang] : existing.description) ?? '';

          // Логика slug:
          //  - Если пользователь явно передал slug -> используем его (и проверяем уникальность если отличается от текущего)
          //  - Если имя изменилось и slug не передан -> генерируем заново
          //  - Если ничего не изменилось -> оставляем прежний slug
          const currentSlug = current.slug || (lang === 'ru' ? existing.slug : '');
          const nameChanged = typeof incoming.name === 'string' && incoming.name !== current.name;
          let desiredSlug = incoming.slug || (nameChanged ? (name ? generateSlug(name, lang) : '') : currentSlug);

          // Если slug отсутствует, но есть имя — генерируем
          if (!desiredSlug && name) {
            desiredSlug = generateSlug(name, lang);
          }

          let finalSlug = desiredSlug || '';
          if (finalSlug) {
            // Если slug новый или изменён — обеспечиваем уникальность
            if (finalSlug !== currentSlug) {
              finalSlug = ensureUniqueSlug(finalSlug, existingSet);
            }
            // Добавляем в множество занятых slug
            existingSet.add(finalSlug);
          }

          finalTranslations[lang] = { name, slug: finalSlug, description };
        }
      }

      // 3. Формируем структуру полей name/description в формате {ru, hy, en}
      const existingNameAny: any = existing.name || {};
      const existingDescAny: any = existing.description || {};
      const nameObj = {
        ru: finalTranslations?.ru?.name || (existingNameAny?.ru ?? existingNameAny) || '',
        hy: finalTranslations?.hy?.name || (existingNameAny?.hy ?? ''),
        en: finalTranslations?.en?.name || (existingNameAny?.en ?? '')
      };
      const descObj = {
        ru: finalTranslations?.ru?.description || (existingDescAny?.ru ?? existingDescAny) || '',
        hy: finalTranslations?.hy?.description || (existingDescAny?.hy ?? ''),
        en: finalTranslations?.en?.description || (existingDescAny?.en ?? '')
      };

      // 4. Итоговые данные для апдейта
      const categoryData: any = {
        ...otherData,
        parentId: parent_id !== undefined ? parent_id : existing.parentId,
        name: nameObj,
        description: descObj,
        slug: finalTranslations?.ru?.slug || existing.slug,
        translations: finalTranslations || existing.translations,
        order: req.body.order !== undefined ? req.body.order : existing.order || 1
      };

      // Preserve existing imageUrl if client didn't send a new value.
      // Frontend subcategory edit form sometimes omits imageUrl when unchanged or sends empty string when user didn't clear it intentionally.
      // We only overwrite if an explicit non-empty value provided; if empty string provided, treat as intent to clear.
      if (otherData.imageUrl === undefined) {
        categoryData.imageUrl = existing.imageUrl; // keep previous
      } else if (otherData.imageUrl === '') {
        categoryData.imageUrl = null; // allow clearing
      }

      // Handle coverImage and bannerImage with same logic as imageUrl
      if (otherData.coverImage === undefined) {
        categoryData.coverImage = existing.coverImage; // keep previous
      } else if (otherData.coverImage === '') {
        categoryData.coverImage = null; // allow clearing
      }

      if (otherData.bannerImage === undefined) {
        categoryData.bannerImage = existing.bannerImage; // keep previous
      } else if (otherData.bannerImage === '') {
        categoryData.bannerImage = null; // allow clearing
      }

      // 5. Нормализация imageUrl при необходимости (legacy external URLs)
      if (categoryData.imageUrl && categoryData.imageUrl.startsWith('https://storage.googleapis.com/')) {
        const storageSvc = new LocalStorageService();
        categoryData.imageUrl = storageSvc.normalizeObjectEntityPath(categoryData.imageUrl);
        console.log('Normalized category image URL:', categoryData.imageUrl);
      }

      const category = await storage.updateCategory(categoryId, categoryData);

      console.log('[PUT /categories/:id] Updated category from DB:', JSON.stringify(category, null, 2));

      // 6. Назначение товаров (используем прежнюю логику; для подкатегории используем assignProductsToSubcategory)
      if (product_ids !== undefined && Array.isArray(product_ids)) {
        const isSubcategory = !!category.parentId; // теперь различаем по наличию parentId
        if (isSubcategory) {
          await storage.assignProductsToSubcategory(category.id, product_ids);
        } else {
          await storage.assignProductsToCategory(category.id, product_ids);
        }
      }

      res.json({
        ...category,
        message: 'Категория успешно обновлена'
      });
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Базовое удаление теперь всегда рекурсивное (mode=uncategorized)
  router.delete('/categories/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const id = req.params.id;
      console.log('[DELETE /categories/:id] attempt deep delete', id);
      let result = await storage.deepForceDeleteCategory(id, { mode: 'uncategorized' });
      if (!result.deletedCategoryIds?.length) {
        console.warn('[DELETE /categories/:id] deep delete returned empty set, running fallback', id);
        // Fallback: собрать вручную поддерево и удалить
        const all = await storage.getCategories();
        const collect = (root: string): string[] => {
          const children = all.filter(c => (c as any).parentId === root).map(c=>c.id);
            return children.flatMap(ch => collect(ch)).concat(root);
        };
        const ids = collect(id);
        let reassigned = 0; let lifted = 0; let purged = 0; let usedUncategorized = false;
        const placeholder = await storage.ensureUncategorizedCategory();
        usedUncategorized = true;
        for (const cid of ids) {
          // Сначала продукты где subcategoryId=cid (очистка)
          const updSub = await db.update(db_products).set({ subcategoryId: null } as any).where(eq(db_products.subcategoryId, cid));
          lifted += (updSub as any)?.rowCount ?? 0;
          // Затем продукты где categoryId=cid переносим в placeholder
          const updCat = await db.update(db_products).set({ categoryId: placeholder.id, subcategoryId: null } as any).where(eq(db_products.categoryId, cid));
          reassigned += (updCat as any)?.rowCount ?? 0;
          await db.delete(categories).where(eq(categories.id, cid));
        }
        result = { deletedCategoryIds: ids, reassignedProducts: reassigned, liftedProducts: lifted, purgedProducts: purged, usedUncategorized } as any;
      }
      console.log('[DELETE /categories/:id] done', id, result);
      res.json({ message: 'Category tree deleted', mode: 'uncategorized', ...result });
    } catch (error: any) {
      console.error('Error deep deleting (default) category:', error);
      console.error('Stack trace:', error?.stack);
      res.status(500).json({ 
        message: 'Failed to delete category', 
        error: error?.message,
        errorType: error?.constructor?.name || 'Error',
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
      });
    }
  });

  /**
   * Расширенное удаление категории / подкатегории.
   * Query params:
   *  force=1 — требуется если есть связанные товары иначе 409
   *  targetCategoryId=<id> — куда переназначить товары (только для root категории)
   *  mode=auto (по умолчанию) — автоматически определяет subcategory vs root
   */
  router.delete('/categories/:id/force', mockAuth, requireAdmin, async (req: any, res) => {
    const id = req.params.id;
    const { mode, targetCategoryId } = req.query as { mode?: string; targetCategoryId?: string };
    try {
      const category = await storage.getCategoryById(id);
      if (!category) return res.status(404).json({ message: 'Category not found' });
      const m = (mode as any) || 'uncategorized';
      if (!['uncategorized','reassign','purge'].includes(m)) {
        return res.status(400).json({ message: 'Invalid mode. Use uncategorized | reassign | purge' });
      }
      console.log('[DELETE /categories/:id/force] attempt deep delete', { id, mode: m, targetCategoryId });
      let result = await storage.deepForceDeleteCategory(id, { mode: m, targetCategoryId: targetCategoryId || null });
      if (!result.deletedCategoryIds?.length) {
        console.warn('[DELETE /categories/:id/force] deep delete returned empty set, running fallback', id);
        const all = await storage.getCategories();
        const collect = (root: string): string[] => {
          const children = all.filter(c => (c as any).parentId === root).map(c=>c.id);
          return children.flatMap(ch => collect(ch)).concat(root);
        };
        const ids = collect(id);
        let reassigned = 0; let lifted = 0; let purged = 0; let usedUncategorized = false;
        if (m === 'purge') {
          for (const cid of ids) {
            // Сначала продукты привязанные subcategoryId
            const delSub = await db.delete(db_products).where(eq(db_products.subcategoryId, cid));
            purged += (delSub as any)?.rowCount ?? 0;
            const delCat = await db.delete(db_products).where(eq(db_products.categoryId, cid));
            purged += (delCat as any)?.rowCount ?? 0;
          }
        } else {
          let target = targetCategoryId || null;
          if (m === 'uncategorized') {
            const placeholder = await storage.ensureUncategorizedCategory();
            target = placeholder.id; usedUncategorized = true;
          }
          for (const cid of ids) {
            // очистка subcategories
            const updSub = await db.update(db_products).set({ subcategoryId: null } as any).where(eq(db_products.subcategoryId, cid));
            lifted += (updSub as any)?.rowCount ?? 0;
            // перенос category
            if (target && cid !== target) {
              const updCat = await db.update(db_products).set({ categoryId: target, subcategoryId: null } as any).where(eq(db_products.categoryId, cid));
              reassigned += (updCat as any)?.rowCount ?? 0;
            }
          }
        }
        // Удаление всех категорий
        for (const cid of ids) await db.delete(categories).where(eq(categories.id, cid));
        result = { deletedCategoryIds: ids, reassignedProducts: reassigned, liftedProducts: lifted, purgedProducts: purged, usedUncategorized } as any;
      }
      console.log('[DELETE /categories/:id/force] done', id, result);
      return res.json({ message: 'Force deep delete completed', mode: m, ...result });
    } catch (error: any) {
      console.error('Error extended force deep delete category:', error);
      console.error('Stack trace:', error?.stack);
      res.status(500).json({ 
        message: 'Failed to force deep delete category', 
        error: error?.message,
        errorType: error?.constructor?.name || 'Error',
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
      });
    }
  });

  // Deep recursive delete endpoint
  router.delete('/categories/:id/deep', mockAuth, requireAdmin, async (req: any, res) => {
    const id = req.params.id;
    const { mode, targetCategoryId } = req.query as { mode?: string; targetCategoryId?: string };
    try {
      const m = (mode as any) || 'uncategorized';
      if (!['uncategorized', 'reassign', 'purge'].includes(m)) {
        return res.status(400).json({ message: 'Invalid mode. Use uncategorized | reassign | purge' });
      }
      const result = await storage.deepForceDeleteCategory(id, { mode: m, targetCategoryId: targetCategoryId || null });
      return res.json({
        message: 'Deep delete completed',
        mode: m,
        ...result
      });
    } catch (error: any) {
      console.error('Error deep deleting category:', error);
      console.error('Stack trace:', error?.stack);
      return res.status(500).json({ 
        message: 'Failed to deep delete category', 
        error: error?.message,
        errorType: error?.constructor?.name || 'Error',
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
      });
    }
  });

  // Subcategory-specific endpoint
  router.post('/categories/subcategory', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const { translations, parent_id, product_ids, ...otherData } = req.body;
      
      // Validate required data
      if (!translations || !translations.ru || !translations.ru.name) {
        return res.status(400).json({ 
          message: "Русское название обязательно для подкатегории" 
        });
      }
      
      if (!parent_id) {
        return res.status(400).json({ 
          message: "Родительская категория обязательна для подкатегории" 
        });
      }
      
      // Verify parent category exists and is root level
      const parentCategory = await storage.getCategoryById(parent_id);
      if (!parentCategory) {
        return res.status(404).json({ 
          message: "Родительская категория не найдена" 
        });
      }
      
      if (parentCategory.parentId) {
        return res.status(400).json({ 
          message: "Родительская категория должна быть корневой (без parent_id)" 
        });
      }
      
      // Build uniqueness set
      const existingCategories = await storage.getCategories();
      const existingSet = await buildExistingSlugSet(existingCategories);

      const ruName = translations.ru.name;
      const ruDesired = translations.ru.slug || generateSlug(ruName, 'ru');
      const ruSlug = ensureUniqueSlug(ruDesired, existingSet); existingSet.add(ruSlug);

      const hyName = translations.hy?.name || '';
      const hyDesired = translations.hy?.slug || (hyName ? generateSlug(hyName, 'hy') : '');
      const hySlug = hyDesired ? ensureUniqueSlug(hyDesired, existingSet) : ''; if (hySlug) existingSet.add(hySlug);

      const enName = translations.en?.name || '';
      const enDesired = translations.en?.slug || (enName ? generateSlug(enName, 'en') : '');
      const enSlug = enDesired ? ensureUniqueSlug(enDesired, existingSet) : ''; if (enSlug) existingSet.add(enSlug);

      const processedTranslations = {
        ru: { name: ruName, slug: ruSlug, description: translations.ru.description || '' },
        hy: { name: hyName, slug: hySlug, description: translations.hy?.description || '' },
        en: { name: enName, slug: enSlug, description: translations.en?.description || '' }
      };
      
      // Create subcategory data - исправлено для мультиязычности
      const subcategoryData = {
        name: {
          ru: processedTranslations.ru.name,
          en: processedTranslations.en.name,
          hy: processedTranslations.hy.name
        },
  slug: processedTranslations.ru.slug, // primary slug baseline (ru)
        description: {
          ru: processedTranslations.ru.description,
          en: processedTranslations.en.description,
          hy: processedTranslations.hy.description
        },
        translations: processedTranslations,
        parentId: parent_id,
        isActive: true,
        // Поддержка двух изображений: обложка карточки и баннер страницы  
        imageUrl: req.body.coverImage || otherData.imageUrl || req.body.imageUrl || undefined,
        coverImage: req.body.coverImage || undefined, // Изображение для карточки категории
        bannerImage: req.body.bannerImage || undefined, // Изображение для hero-баннера страницы
        ...otherData
      };
      
      // Create subcategory
      const subcategory = await storage.createCategory(subcategoryData);
      
      // Assign products if provided
      if (product_ids && Array.isArray(product_ids) && product_ids.length > 0) {
        await storage.assignProductsToCategory(subcategory.id, product_ids);
      }
      
      res.status(201).json({
        ...subcategory,
        message: "Подкатегория успешно создана"
      });
    } catch (error) {
      console.error("Error creating subcategory:", error);
      res.status(500).json({ message: "Ошибка при создании подкатегории" });
    }
  });

  // Subcategories API routes
  router.get('/subcategories', async (req, res) => {
    try {
      const lang = req.query.lang as string || 'ru';
      const categoryId = req.query.categoryId as string;
      
      let subcategories;
      if (categoryId) {
        // Get subcategories for specific category
        subcategories = await storage.getCategories();
        subcategories = subcategories.filter(cat => cat.parentId === categoryId);
      } else {
        // Get all subcategories (categories with parentId)
        subcategories = await storage.getCategories();
        subcategories = subcategories.filter(cat => cat.parentId !== null);
      }
      
      // Process for multilingual display
      const processedSubcategories = subcategories.map(subcategory => {
        // Handle translations
        if (subcategory.translations && typeof subcategory.translations === 'object') {
          const trAny = subcategory.translations as any;
          const langData = trAny[lang] || trAny['ru'] || trAny[Object.keys(trAny)[0]];
          if (langData) {
            return {
              ...subcategory,
              name: langData.name || subcategory.name,
              description: langData.description || subcategory.description,
              slug: langData.slug || subcategory.slug,
              coverImage: (subcategory as any).coverImage || subcategory.imageUrl,
              bannerImage: (subcategory as any).bannerImage || subcategory.imageUrl
            };
          }
        }
        
        // Handle name as object
        if (subcategory.name && typeof subcategory.name === 'object') {
          const nameAny = subcategory.name as any;
          const descAny = subcategory.description as any;
          const name = nameAny[lang] || nameAny['ru'] || nameAny[Object.keys(nameAny)[0]];
          const description = subcategory.description && typeof subcategory.description === 'object' 
            ? (descAny?.[lang] || descAny?.['ru'] || descAny?.[Object.keys(descAny)[0]])
            : subcategory.description;
            
          return {
            ...subcategory,
            name,
            description,
            coverImage: (subcategory as any).coverImage || subcategory.imageUrl,
            bannerImage: (subcategory as any).bannerImage || subcategory.imageUrl
          };
        }
        
        return {
          ...subcategory,
          coverImage: (subcategory as any).coverImage || subcategory.imageUrl,
          bannerImage: (subcategory as any).bannerImage || subcategory.imageUrl
        };
      });
      
      res.json(processedSubcategories);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      res.status(500).json({ message: "Failed to fetch subcategories" });
    }
  });

  router.get('/subcategories/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const lang = req.query.lang as string || 'ru';
      
      const subcategory = await storage.getCategoryById(id);
      if (!subcategory) {
        return res.status(404).json({ message: "Subcategory not found" });
      }
      
      // Process for multilingual display
      let processedSubcategory = subcategory;
      
      if (subcategory.translations && typeof subcategory.translations === 'object') {
        const trAny = subcategory.translations as any;
        const langData = trAny[lang] || trAny['ru'] || trAny[Object.keys(trAny)[0]];
        if (langData) {
          processedSubcategory = {
            ...subcategory,
            name: langData.name || subcategory.name,
            description: langData.description || subcategory.description,
            slug: langData.slug || subcategory.slug
          };
        }
      }
      
      if (subcategory.name && typeof subcategory.name === 'object') {
        const nameAny = subcategory.name as any;
        const descAny = subcategory.description as any;
        const name = nameAny[lang] || nameAny['ru'] || nameAny[Object.keys(nameAny)[0]];
        const description = subcategory.description && typeof subcategory.description === 'object' 
          ? (descAny?.[lang] || descAny?.['ru'] || descAny?.[Object.keys(descAny)[0]])
          : subcategory.description;
          
        processedSubcategory = {
          ...subcategory,
          name,
          description
        };
      }
      
      res.json(processedSubcategory);
    } catch (error) {
      console.error("Error fetching subcategory:", error);
      res.status(500).json({ message: "Failed to fetch subcategory" });
    }
  });

  // Product routes
  // Path-based catalog routing (SEO friendly): /catalog/:categorySlug/:subcategorySlug?
  // Resolves multilingual slugs (primary slug or translations[lang].slug). Returns category/subcategory + products.
  // Path-based catalog route
  router.get('/catalog/:categorySlug/:maybeSubcategorySlug?', async (req, res) => {
    try {
      const { categorySlug, maybeSubcategorySlug } = req.params as { categorySlug: string; maybeSubcategorySlug?: string };
      const lang = (req.query.lang as string) || 'ru';
  // (debug removed)

      // Load all active categories once (in-memory resolution keeps logic consistent with existing storage abstractions)
      const all = await storage.getCategories();
      const roots = all.filter(c => !c.parentId);
      const slugMatches = (cat: any, slug: string) => {
        if (!slug) return false;
        if (cat.slug === slug) return true;
        if (cat.translations && typeof cat.translations === 'object') {
          for (const k of Object.keys(cat.translations)) {
            const t = (cat.translations as any)[k];
            if (t && t.slug === slug) return true;
          }
        }
        return false;
      };

      const category = roots.find(r => slugMatches(r, categorySlug));
      if (!category) {
        return res.status(404).json({ message: 'Категория не найдена', categorySlug });
      }

      let subcategory: any = null;
      if (maybeSubcategorySlug) {
        const children = all.filter(c => c.parentId === category.id);
        subcategory = children.find(ch => slugMatches(ch, maybeSubcategorySlug));
        if (!subcategory) {
          return res.status(404).json({ message: 'Подкатегория не найдена', categorySlug, subcategorySlug: maybeSubcategorySlug });
        }
      }

      // Fetch products: if subcategory -> by subcategoryId, else by categoryId (existing getProducts already returns both direct + subcategory products when passing categoryId)
      let products: any[] = [];
      if (subcategory) {
        const allProducts = await storage.getProducts();
        products = allProducts.filter(p => p.subcategoryId === subcategory.id);
      } else {
        products = await storage.getProducts(category.id);
      }

      // Build localized presentation
      const localize = (cat: any) => {
        if (!cat) return null;
        console.log('[localize] Processing category:', cat.id, 'lang:', lang, 'hasTranslations:', !!cat.translations, 'coverImage:', cat.coverImage, 'bannerImage:', cat.bannerImage);
        if (cat.translations && (cat.translations as any)[lang]) {
          const t = (cat.translations as any)[lang];
          const result = {
            id: cat.id,
            slug: t.slug || cat.slug,
            name: t.name || (cat.name?.[lang] ?? cat.name?.ru ?? cat.name),
            description: t.description || (cat.description?.[lang] ?? cat.description?.ru ?? ''),
            parentId: cat.parentId,
            imageUrl: cat.imageUrl || null,
            coverImage: cat.coverImage || null,
            bannerImage: cat.bannerImage || null,
            isActive: cat.isActive
          };
          console.log('[localize] Returning with translations:', result);
          return result;
        }
        const result = {
          id: cat.id,
            slug: cat.slug,
          name: (cat.name?.[lang] ?? cat.name?.ru ?? cat.name),
          description: (cat.description?.[lang] ?? cat.description?.ru ?? ''),
          parentId: cat.parentId,
          imageUrl: cat.imageUrl || null,
          coverImage: cat.coverImage || null,
          bannerImage: cat.bannerImage || null,
          isActive: cat.isActive
        };
        console.log('[localize] Returning without translations:', result);
        return result;
      };

      const localizedCategory = localize(category);
      const localizedSubcategory = localize(subcategory);

      const children = all.filter(c => c.parentId === category.id).map(localize);
      const siblings = subcategory ? all.filter(c => c.parentId === category.id && c.id !== subcategory.id).map(localize) : [];

      const breadcrumbs = [
        { type: 'category', id: category.id, name: localizedCategory?.name, slug: localizedCategory?.slug },
        ...(subcategory ? [{ type: 'subcategory', id: subcategory.id, name: localizedSubcategory?.name, slug: localizedSubcategory?.slug }] : [])
      ];

      return res.json({
        category: localizedCategory,
        subcategory: localizedSubcategory,
        products,
        breadcrumbs,
        children: subcategory ? undefined : children,
        siblings: subcategory ? siblings : undefined,
        counts: { products: products.length, children: children.length }
      });
    } catch (error) {
      console.error('[GET /catalog/:categorySlug/:maybeSubcategorySlug] error', error);
      res.status(500).json({ message: 'Failed to resolve catalog path' });
    }
  });

  router.get('/products', async (req, res) => {
    try {
      const categorySlug = req.query.category as string | undefined;
      const specialPage = req.query.special as string | undefined;
      const categoryIdParam = req.query.categoryId as string | undefined;
      const subcategoryIdParam = req.query.subcategoryId as string | undefined;

      // 1. Special page logic
      if (specialPage) {
        console.log('[GET /products] special page =', specialPage);
        const products = await storage.getProductsBySpecialPage(specialPage);
        return res.json(products);
      }

      // 2. Direct subcategory filtering has precedence
      if (subcategoryIdParam) {
        console.log('[GET /products] filter by subcategoryId', subcategoryIdParam);
        const all = await storage.getProducts();
        return res.json(all.filter(p => p.subcategoryId === subcategoryIdParam));
      }

      // 3. Direct categoryId if provided
      if (categoryIdParam) {
        console.log('[GET /products] filter by categoryId', categoryIdParam);
        const all = await storage.getProducts(categoryIdParam);
        return res.json(all.filter(p => p.categoryId === categoryIdParam));
      }

      // 4. Slug-based resolution (legacy)
      let resolvedCategoryId: string | undefined;
      if (categorySlug) {
        const cats = await storage.getCategories();
        const match = cats.find(c => c.slug === categorySlug || (c.translations && Object.values(c.translations as any).some((tr: any) => tr?.slug === categorySlug)));
        resolvedCategoryId = match?.id;
        console.log('[GET /products] resolved slug', categorySlug, '=>', resolvedCategoryId);
      }
      const products = await storage.getProducts(resolvedCategoryId);
      res.json(products);
    } catch (error) {
      console.error('[GET /products] error', error);
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  router.get('/products/search', async (req, res) => {
    try {
      console.log('Products search API called with query:', req.query.q);
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query required" });
      }
      const products = await storage.searchProducts(query);
      res.json(products);
    } catch (error) {
      console.error("Error searching products:", error);
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  // Получение товаров по ID категории (для админки)

  router.get('/products/by-category/:categoryId', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const categoryId = req.params.categoryId;
      
      // Получаем товары где categoryId или subcategoryId равны переданному ID
      const products = await db.select().from(db_products)
        .where(or(
          eq(db_products.categoryId, categoryId),
          eq(db_products.subcategoryId, categoryId)
        ));
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching products by category ID:", error);
      res.status(500).json({ message: "Failed to fetch products by category ID" });
    }
  });

  router.get('/products/special/:page', async (req, res) => {
    try {
      const specialPage = req.params.page;
      console.log('Special page API called with page:', specialPage);
      
      if (!specialPage) {
        return res.status(400).json({ message: "Special page parameter required" });
      }
      
      const products = await storage.getProductsBySpecialPage(specialPage);
      console.log('Found products for special page:', products.length);
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching products for special page:", error);
      res.status(500).json({ message: "Failed to fetch products for special page" });
    }
  });

  // Admin endpoint to get ALL products including inactive ones (MUST be before /products/:id)
  router.get('/products/admin', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      // Get ALL products without isActive filter for admin interface
      const allProducts = await db.select().from(db_products).orderBy(db_products.sortOrder);
      res.json(allProducts);
    } catch (error) {
      console.error("Error fetching all products for admin:", error);
      res.status(500).json({ message: "Failed to fetch all products" });
    }
  });

  router.get('/products/:id', async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  router.post('/products', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      console.log('🚀 Creating product with data:', JSON.stringify(req.body, null, 2));
      console.log('🔒 User authenticated:', !!req.user);
      console.log('👤 User ID:', req.user?.claims?.sub);
      
  const productData: any = insertProductSchema.parse(req.body);
      console.log('✅ Validation passed for product data');

      // --- Invariants & auto-fixes (server-side safety net) ---
      // 1. Если пришла subcategoryId без categoryId – пытаемся определить родителя и проставить
      if (productData.subcategoryId && !productData.categoryId) {
        try {
          const sub = await storage.getCategoryById(productData.subcategoryId);
            if (sub && (sub as any).parentId) {
              productData.categoryId = (sub as any).parentId;
              console.log('[POST /products] Derived parent categoryId from subcategoryId', { subcategoryId: productData.subcategoryId, categoryId: productData.categoryId });
            } else if (sub && !(sub as any).parentId) {
              // subcategoryId указывает на корневую категорию — значит это не подкатегория
              console.warn('[POST /products] Provided subcategoryId refers to a root category (no parentId). Leaving categoryId as is.');
            }
        } catch (e) {
          console.warn('[POST /products] Failed to derive parent category from subcategoryId', e);
        }
      }

      // 2. Авто-синхронизация inStock по stockQuantity, если явно не задано или расходится
      if (typeof (productData as any).stockQuantity === 'number') {
        const desiredInStock = (productData as any).stockQuantity > 0;
        if (productData.inStock === undefined || productData.inStock !== desiredInStock) {
          console.log('[POST /products] Auto-adjust inStock based on stockQuantity', { stockQuantity: (productData as any).stockQuantity, inStockPrev: productData.inStock, inStockNew: desiredInStock });
          (productData as any).inStock = desiredInStock;
        }
      }
      
      // Allow products without category for now, but warn
      if (!productData.categoryId || productData.categoryId === "") {
        console.log('⚠️ Product created without category');
        productData.categoryId = undefined;
      }

  // Normalize image and video URLs if they are legacy external URLs
  const storageSvc = new LocalStorageService();
      
      // Normalize image URLs
      if (productData.imageUrl && productData.imageUrl.startsWith('https://storage.googleapis.com/')) {
        productData.imageUrl = storageSvc.normalizeObjectEntityPath(productData.imageUrl);
        console.log('Normalized product image URL:', productData.imageUrl);
      }
      
      if (productData.images) {
        productData.images = productData.images.map((img: string) =>
          img.startsWith('https://storage.googleapis.com/')
            ? storageSvc.normalizeObjectEntityPath(img)
            : img
        );
      }
      
      // Normalize video URLs
      if (productData.videoUrl && productData.videoUrl.startsWith('https://storage.googleapis.com/')) {
        productData.videoUrl = storageSvc.normalizeObjectEntityPath(productData.videoUrl);
        console.log('Normalized product video URL:', productData.videoUrl);
      }
      
      if (productData.videos) {
        productData.videos = productData.videos.map((video: string) =>
          video.startsWith('https://storage.googleapis.com/')
            ? storageSvc.normalizeObjectEntityPath(video)
            : video
        );
      }
      
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("❌ Error creating product:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        console.log('💥 Validation error details:', error.message);
        return res.status(400).json({ message: "Ошибка валидации данных: " + error.message });
      }
      if (error instanceof Error && error.message?.includes('violates foreign key constraint')) {
        return res.status(400).json({ message: "Выбранная категория не существует" });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  router.put('/products/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const productData = insertProductSchema.partial().parse(req.body);
      
      // Clean empty strings for numeric fields to prevent database errors
      const cleanedData: any = { ...productData };
      const numericFields = [
        'price', 'originalPrice', 'additionalSpreadPrice', 'weight',
        'minCustomPrice', 'costPrice', 'materialCosts', 'laborCosts',
        'overheadCosts', 'shippingCosts', 'otherCosts', 'expectedProfitMargin'
      ];
      
      numericFields.forEach(field => {
        if (cleanedData[field] === '') {
          delete cleanedData[field]; // Remove empty string fields
        }
      });
      
      // Clean empty strings for foreign key fields
      const foreignKeyFields = [
        'currencyId', 'categoryId', 'costCurrencyId',
        'additionalSpreadCurrencyId', 'minCustomPriceCurrencyId'
      ];
      
      foreignKeyFields.forEach(field => {
        if (cleanedData[field] === '') {
          cleanedData[field] = null;
        }
      });

  // Normalize image and video URLs if they are legacy external URLs
  const storageSvc = new LocalStorageService();
      
      // Normalize image URLs
      if (cleanedData.imageUrl && cleanedData.imageUrl.startsWith('https://storage.googleapis.com/')) {
        cleanedData.imageUrl = storageSvc.normalizeObjectEntityPath(cleanedData.imageUrl);
        console.log('Normalized product image URL:', cleanedData.imageUrl);
      }
      
      if (cleanedData.images) {
        cleanedData.images = cleanedData.images.map((img: string) =>
          img.startsWith('https://storage.googleapis.com/')
            ? storageSvc.normalizeObjectEntityPath(img)
            : img
        );
      }
      
      // Normalize video URLs
      if (cleanedData.videoUrl && cleanedData.videoUrl.startsWith('https://storage.googleapis.com/')) {
        cleanedData.videoUrl = storageSvc.normalizeObjectEntityPath(cleanedData.videoUrl);
        console.log('Normalized product video URL:', cleanedData.videoUrl);
      }
      
      if (cleanedData.videos) {
        cleanedData.videos = cleanedData.videos.map((video: string) =>
          video.startsWith('https://storage.googleapis.com/')
            ? storageSvc.normalizeObjectEntityPath(video)
            : video
        );
      }

      // --- Invariants & auto-fixes for update ---
      // 1. Derive parent category if only subcategoryId provided (and categoryId omitted/null)
      if (cleanedData.subcategoryId && !cleanedData.categoryId) {
        try {
          const sub = await storage.getCategoryById(cleanedData.subcategoryId);
          if (sub && (sub as any).parentId) {
            cleanedData.categoryId = (sub as any).parentId;
            console.log('[PUT /products/:id] Derived parent categoryId from subcategoryId', { id: req.params.id, subcategoryId: cleanedData.subcategoryId, categoryId: cleanedData.categoryId });
          }
        } catch (e) {
          console.warn('[PUT /products/:id] Failed to derive parent category from subcategoryId', e);
        }
      }

      // 2. Auto-sync inStock if stockQuantity present and mismatch
      if (typeof cleanedData.stockQuantity === 'number') {
        const desiredInStock = cleanedData.stockQuantity > 0;
        if (cleanedData.inStock === undefined || cleanedData.inStock !== desiredInStock) {
          console.log('[PUT /products/:id] Auto-adjust inStock based on stockQuantity', { id: req.params.id, stockQuantity: cleanedData.stockQuantity, inStockPrev: cleanedData.inStock, inStockNew: desiredInStock });
          cleanedData.inStock = desiredInStock;
        }
      }
      
      const product = await storage.updateProduct(req.params.id, cleanedData);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  router.delete('/products/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Bulk update products (move, status, hashtags append, sale)
  router.patch('/products/bulk', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const bulkSchema = z.object({
        productIds: z.array(z.string().min(1)).min(1).max(100),
        action: z.object({
          move: z.object({
            categoryId: z.string().min(1).optional(),
            subcategoryId: z.string().min(1).optional()
          }).optional(),
          setStatus: z.object({
            inStock: z.boolean().optional(),
            isActive: z.boolean().optional()
          }).optional(),
          appendHashtags: z.object({
            ru: z.array(z.string().min(1)).optional(),
            hy: z.array(z.string().min(1)).optional(),
            en: z.array(z.string().min(1)).optional()
          }).optional(),
          setSale: z.object({
            isOnSale: z.boolean(),
            discountPercentage: z.number().min(0).max(100).optional()
          }).optional()
        }).refine(a => a.move || a.setStatus || a.appendHashtags || a.setSale, { message: 'At least one action provided' })
      });

      // Normalize empty strings to undefined to avoid validation errors
      const normalizedBody = JSON.parse(JSON.stringify(req.body, (key, value) => {
        if (typeof value === 'string' && value.trim() === '') {
          return undefined;
        }
        return value;
      }));

      const parsed = bulkSchema.parse(normalizedBody);
      const { productIds, action } = parsed;

      // Validation for move
      let patch: any = {};
      if (action.move) {
        const { categoryId, subcategoryId } = action.move;
        if (subcategoryId && !categoryId) {
          // Accept: infer parent later? For safety we just set subcategory; category kept as is.
          patch.subcategoryId = subcategoryId;
        } else if (categoryId && !subcategoryId) {
          patch.categoryId = categoryId;
          patch.subcategoryId = null; // clearing previous subcategory
        } else if (categoryId && subcategoryId) {
          // Optionally ensure subcategory belongs to category (skipped for now, TODO)
          patch.categoryId = categoryId;
          patch.subcategoryId = subcategoryId;
        }
      }
      if (action.setStatus) {
        if (action.setStatus.inStock !== undefined) patch.inStock = action.setStatus.inStock;
        if (action.setStatus.isActive !== undefined) patch.isActive = action.setStatus.isActive;
      }
      if (action.setSale) {
        patch.isOnSale = action.setSale.isOnSale;
        if (action.setSale.discountPercentage !== undefined) patch.discountPercentage = action.setSale.discountPercentage;
      }

      const updatedIds = await storage.bulkUpdateProducts({
        productIds,
        patch,
        appendHashtags: action.appendHashtags
      });

      await storage.createChangeLog({
        userId: req.user?.claims?.sub,
        entityType: 'product',
        entityIds: updatedIds,
        action: 'bulk',
        details: {
          patchApplied: patch,
            hashtagsAppended: action.appendHashtags ? Object.keys(action.appendHashtags) : [],
          operations: Object.keys(action)
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({ updatedCount: updatedIds.length, updatedIds });
    } catch (error) {
      console.error('Error bulk updating products:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation failed', issues: error.errors });
      }
      res.status(500).json({ message: 'Failed bulk update' });
    }
  });

  // Suggest categories for products (stub for future AI integration)
  router.post('/products/bulk/suggest-category', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const body = z.object({ productIds: z.array(z.string().min(1)).min(1).max(50) }).parse(req.body);
      // Fetch products minimal fields
      const all = await storage.getProducts();
      const subset = all.filter(p => body.productIds.includes(p.id));
      const suggestions = subset.map(p => ({
        productId: p.id,
        suggestedCategoryId: p.categoryId || null,
        confidence: 0.0,
        reason: 'AI suggestions not yet implemented'
      }));
      res.json({ suggestions });
    } catch (error) {
      console.error('Error suggesting categories:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation failed', issues: error.errors });
      }
      res.status(500).json({ message: 'Failed to generate suggestions' });
    }
  });

  router.patch('/products/:id/costs', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      // Validate cost data - convert empty strings to null or 0
      const costsData = {
        costPrice: req.body.costPrice && req.body.costPrice !== '' ? req.body.costPrice : '0',
        costCurrencyId: req.body.costCurrencyId && req.body.costCurrencyId !== '' ? req.body.costCurrencyId : null,
        materialCosts: req.body.materialCosts && req.body.materialCosts !== '' ? req.body.materialCosts : '0',
        laborCosts: req.body.laborCosts && req.body.laborCosts !== '' ? req.body.laborCosts : '0',
        overheadCosts: req.body.overheadCosts && req.body.overheadCosts !== '' ? req.body.overheadCosts : '0',
        shippingCosts: req.body.shippingCosts && req.body.shippingCosts !== '' ? req.body.shippingCosts : '0',
        otherCosts: req.body.otherCosts && req.body.otherCosts !== '' ? req.body.otherCosts : '0',
        expectedProfitMargin: req.body.expectedProfitMargin && req.body.expectedProfitMargin !== '' ? req.body.expectedProfitMargin : '30',
      };

      const product = await storage.updateProduct(req.params.id, costsData);
      res.json(product);
    } catch (error) {
      console.error("Error updating product costs:", error);
      res.status(500).json({ message: "Failed to update product costs" });
    }
  });

  // Order routes
  router.get('/orders', mockAuth, async (req: any, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  router.get('/orders/:id', mockAuth, async (req: any, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  router.post('/orders', async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  router.put('/orders/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const orderData = insertOrderSchema.partial().parse(req.body);
      const order = await storage.updateOrder(req.params.id, orderData);
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  return router;
}