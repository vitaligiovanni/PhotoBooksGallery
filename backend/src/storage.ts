import {
  users,
  categories,
  products,
  orders,
  orderItems,
  changeLogs,
  type InsertChangeLog,
  type ChangeLog,
  blogCategories,
  blogPosts,
  comments,
  settings,
  userThemes,
  reviews,
  currencies,
  exchangeRates,
  type User,
  type UpsertUser,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder,
  type BlogCategory,
  type InsertBlogCategory,
  type BlogPost,
  type InsertBlogPost,
  type Comment,
  type InsertComment,
  type Setting,
  type UserTheme,
  type InsertUserTheme,
  type Review,
  type InsertReview,
  type Currency,
  type InsertCurrency,
  type ExchangeRate,
  type InsertExchangeRate,
} from "../../shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, or, ne, sql } from "drizzle-orm";
import { inArray } from "drizzle-orm";

// Helper to safely extract first row from drizzle returning() which may have different inferred types
function firstRow<T>(result: any): T {
  if (Array.isArray(result)) return result[0] as T;
  // Some drivers might return an iterable-like with rows property
  if (result && Array.isArray(result.rows)) return result.rows[0] as T;
  return result as T;
}

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Customer management operations
  getUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserRole(id: string, role: string): Promise<User>;

  // Category operations
  getCategories(): Promise<Category[]>;
  getCategoriesFlat(): Promise<Category[]>;
  getCategoriesHierarchy(): Promise<any[]>;
  assignProductsToCategory(categoryId: string, productIds: string[]): Promise<void>;
  assignProductsToSubcategory(subcategoryId: string, productIds: string[]): Promise<void>;
  getCategoryById(id: string): Promise<Category | null>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  // Force delete a category moving its products to an "uncategorized" placeholder. Returns stats.
  forceDeleteCategoryWithProductMove(id: string): Promise<{ moved: number; deleted: boolean }>;
  // Deep force delete (рекурсивно удаляет категорию и её поддерево)
  deepForceDeleteCategory(rootId: string, options: {
    mode: 'uncategorized' | 'reassign' | 'purge';
    targetCategoryId?: string | null; // цель для переноса товаров, если mode = reassign
  }): Promise<{
    deletedCategoryIds: string[];
    reassignedProducts: number;
    liftedProducts: number; // products where only subcategoryId cleared
    purgedProducts: number; // products deleted (mode purge only)
    usedUncategorized: boolean;
  }>;
  // Диагностика поддерева категории
  diagnoseCategoryTree(rootId: string): Promise<{
    rootId: string;
    subtreeIds: string[];
    categories: Category[];
    productStats: Record<string, { directProducts: number; subcategoryProducts: number; totalProducts: number }>; 
  }>;

  // Product operations
  getProducts(categoryId?: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  searchProducts(query: string): Promise<Product[]>;
  getProductsBySpecialPage(specialPage: string): Promise<Product[]>;

  // Order operations
  getOrders(userId?: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order>;

  // Blog category operations
  getBlogCategories(): Promise<BlogCategory[]>;
  createBlogCategory(category: InsertBlogCategory): Promise<BlogCategory>;
  updateBlogCategory(id: string, category: Partial<InsertBlogCategory>): Promise<BlogCategory>;
  deleteBlogCategory(id: string): Promise<void>;

  // Blog post operations
  getBlogPosts(categoryId?: string, status?: string, search?: string): Promise<BlogPost[]>;
  getBlogPost(id: string): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: string, post: Partial<InsertBlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: string): Promise<void>;
  incrementBlogPostViews(id: string): Promise<void>;
  getRelatedBlogPosts(id: string): Promise<BlogPost[]>;

  // Comment operations
  getComments(postId?: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: string, comment: Partial<InsertComment>): Promise<Comment>;
  deleteComment(id: string): Promise<void>;

  // Settings operations
  getSettings(): Promise<Record<string, any>>;
  getSetting(key: string): Promise<Setting | undefined>;
  updateSetting(key: string, value: any, description?: string): Promise<Setting>;

  // User theme operations
  getUserTheme(userId: string): Promise<UserTheme | undefined>;
  upsertUserTheme(userTheme: InsertUserTheme): Promise<UserTheme>;

  // Review operations
  getReviews(status?: string): Promise<Review[]>;
  getApprovedReviews(): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: string, review: Partial<InsertReview>): Promise<Review>;
  deleteReview(id: string): Promise<void>;
  approveReview(id: string): Promise<Review>;
  rejectReview(id: string): Promise<Review>;

  // Currency operations
  getCurrencies(): Promise<Currency[]>;
  getCurrency(id: string): Promise<Currency | undefined>;
  getCurrencyByCode(code: string): Promise<Currency | undefined>;
  createCurrency(currency: InsertCurrency): Promise<Currency>;
  updateCurrency(id: string, currency: Partial<InsertCurrency>): Promise<Currency>;
  deleteCurrency(id: string): Promise<void>;
  getBaseCurrency(): Promise<Currency | undefined>;
  setBaseCurrency(currencyId: string): Promise<void>;

  // Exchange rate operations
  getExchangeRates(): Promise<ExchangeRate[]>;
  getExchangeRate(fromCurrencyId: string, toCurrencyId: string): Promise<ExchangeRate | undefined>;
  createExchangeRate(exchangeRate: InsertExchangeRate): Promise<ExchangeRate>;
  updateExchangeRate(id: string, exchangeRate: Partial<InsertExchangeRate>): Promise<ExchangeRate>;
  deleteExchangeRate(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: any): Promise<User> {
    // First, check if user exists by email
    const existingUser = await db.select().from(users).where(eq(users.email, userData.email!)).limit(1);
    
    if (existingUser.length > 0) {
      // Update existing user
        const [updatedUser] = await db
          .update(users)
          .set({
          id: userData.id, // Update ID to Replit ID
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
          } as any)
        .where(eq(users.email, userData.email!))
        .returning();
      return updatedUser;
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values(userData as any)
        .returning();
      return newUser;
    }
  }

  // Customer management operations
  async getUsers(): Promise<User[]> {
    const usersWithOrderCounts = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        passwordHash: users.passwordHash,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        orderCount: sql<number>`CAST(COALESCE(COUNT(DISTINCT ${orders.id}), 0) AS INTEGER)`,
      })
      .from(users)
      .leftJoin(orders, eq(users.id, orders.userId))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));
    
    return usersWithOrderCounts as unknown as User[];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    // Return all categories (both parents and subcategories) in flat structure
    const allCategories = await db.select().from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.order, categories.sortOrder);
    return allCategories as unknown as Category[];
  }

  async getCategoriesFlat(): Promise<Category[]> {
    // Same as getCategories - returns all categories including subcategories in a flat list
    return await this.getCategories();
  }

  async getCategoriesHierarchy(): Promise<any[]> {
    const allCategories = await db.select().from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.order, categories.sortOrder);
    
    // Build hierarchy
  const typed = allCategories as unknown as Category[];
  const rootCategories = typed.filter(cat => !cat.parentId);
  const subcategoryMap = new Map<string, Category[]>();
    
    // Group subcategories by parent ID and sort them by order
    typed.filter(cat => cat.parentId).forEach(cat => {
      const parentId = cat.parentId!;
      if (!subcategoryMap.has(parentId)) {
        subcategoryMap.set(parentId, []);
      }
      subcategoryMap.get(parentId)!.push(cat);
    });

    // Sort subcategories by order (ascending, like root categories)
    for (const subcategories of subcategoryMap.values()) {
      subcategories.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    
    // Recursively build tree structure
    const buildTree = (cats: Category[]): any[] => {
      return cats.map(cat => {
        const children = subcategoryMap.get(cat.id) || [];
        return {
          ...cat,
          children: buildTree(children),
          subcategories: buildTree(children) // Добавляем алиас для совместимости с frontend
        };
      });
    };
    
    return buildTree(rootCategories as Category[]);
  }

  async getCategoryById(id: string): Promise<Category | null> {
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return (result[0] as Category) || null;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const cat: any = category as any;
    // Generate multilingual slugs if not provided
    const generateSlug = (text: string) => text.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove multiple hyphens
      .trim();

    let categoryData: any = { ...cat };

    // Handle legacy format (name/slug fields) or new translations format
    if (cat.translations) {
      // New translations format
      categoryData.translations = {
        ru: {
          name: cat.translations.ru.name,
          slug: cat.translations.ru.slug || generateSlug(cat.translations.ru.name),
          description: cat.translations.ru.description || ''
        },
        hy: cat.translations.hy ? {
          name: cat.translations.hy.name || '',
          slug: cat.translations.hy.slug || generateSlug(cat.translations.hy.name || cat.translations.ru.name + '-hy'),
          description: cat.translations.hy.description || ''
        } : undefined,
        en: cat.translations.en ? {
          name: cat.translations.en.name || '',
          slug: cat.translations.en.slug || generateSlug(cat.translations.en.name || cat.translations.ru.name + '-en'),
          description: cat.translations.en.description || ''
        } : undefined
      };
      
      // Set legacy fields for backwards compatibility
      categoryData.name = {
        ru: cat.translations.ru.name,
        hy: cat.translations.hy?.name || '',
        en: cat.translations.en?.name || ''
      };
      categoryData.slug = cat.translations.ru.slug || generateSlug(cat.translations.ru.name);
    } else if (cat.name) {
      // Legacy format - convert to new translations format
      const ruSlug = cat.slug || generateSlug(cat.name.ru);
      categoryData.slug = ruSlug;
      categoryData.translations = {
        ru: {
          name: cat.name.ru,
          slug: ruSlug,
          description: cat.description?.ru || ''
        },
        hy: {
          name: cat.name.hy || '',
          slug: ruSlug + '-hy',
          description: cat.description?.hy || ''
        },
        en: {
          name: cat.name.en || '',
          slug: ruSlug + '-en', 
          description: cat.description?.en || ''
        }
      };
    }

    // Clean up frontend-only fields
  delete categoryData.productIds;

    // Ensure unique slug
    const baseSlug = categoryData.slug;
    let uniqueSlug = baseSlug;
    let counter = 1;
    
    while (true) {
      const existing = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, uniqueSlug)).limit(1);
      if (existing.length === 0) {
        break;
      }
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    categoryData.slug = uniqueSlug;
    
    // Also update slug in translations
    if (categoryData.translations?.ru) {
      categoryData.translations.ru.slug = uniqueSlug;
    }

  const insertResult = await db.insert(categories).values(categoryData).returning();
  const newCategory: any = firstRow(insertResult);
    
    // If productIds were provided, assign products to this category
    if (cat.productIds && Array.isArray(cat.productIds) && cat.productIds.length > 0) {
      await this.assignProductsToCategory(newCategory.id, cat.productIds as string[]);
    }
    
    return newCategory as Category;
  }

  async assignProductsToCategory(categoryId: string, productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;
    
    // Update all specified products to belong to this category
    for (const productId of productIds) {
      await db.update(products)
        .set({ categoryId } as any)
        .where(eq(products.id, productId));
    }
  }

  async assignProductsToSubcategory(subcategoryId: string, productIds: string[]): Promise<void> {
    try {
      // Сначала убираем все товары из этой подкатегории
      await db.update(products)
        .set({ subcategoryId: null } as any)
        .where(eq(products.subcategoryId, subcategoryId));
      
      // Затем назначаем выбранные товары
      if (productIds.length > 0) {
        for (const productId of productIds) {
          await db.update(products)
            .set({ subcategoryId } as any)
            .where(eq(products.id, productId));
        }
      }
    } catch (error) {
      console.error('Error assigning products to subcategory:', error);
      throw error;
    }
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set(category as any)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory as Category;
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      // Проверяем, есть ли товары в этой категории
      const productsInCategory = await db.select().from(products)
        .where(eq(products.categoryId, id))
        .limit(1);

      if (productsInCategory.length > 0) {
        throw new Error('Нельзя удалить категорию, в которой есть товары. Сначала переместите или удалите все товары из этой категории.');
      }

      // Если товаров нет, можно безопасно удалить категорию
      const result = await db.delete(categories).where(eq(categories.id, id));
      
      console.log('Delete category result:', result);
      
    } catch (error: any) {
      console.error('Delete category error details:', error);
      
      // Если это ошибка внешнего ключа PostgreSQL
      if (error.code === '23503' && error.constraint === 'products_category_id_categories_id_fk') {
        throw new Error('Нельзя удалить категорию, в которой есть товары. Сначала переместите или удалите все товары из этой категории.');
      }
      
      // Для других ошибок, пробрасываем дальше
      throw error;
    }
  }

  async forceDeleteCategoryWithProductMove(id: string): Promise<{ moved: number; deleted: boolean; }> {
    try {
      // Move products to uncategorized placeholder (lazy ensure)
      const placeholder = await this.ensureUncategorizedCategory();
      const updateResult = await db.update(products)
        .set({ categoryId: placeholder.id, subcategoryId: null } as any)
        .where(eq(products.categoryId, id));
      const moved = (updateResult as any)?.rowCount ?? 0;
      const deleteResult = await db.delete(categories).where(eq(categories.id, id));
      const deleted = (deleteResult as any)?.rowCount === 1;
      return { moved, deleted };
    } catch (error) {
      console.error('Force delete category error:', error);
      throw error;
    }
  }

  /** Получить прямых детей категории */
  private async getChildCategories(parentId: string): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.parentId as any, parentId));
  }

  /** Собрать массив id всего поддерева (включая root) в порядке post-order (дети перед родителем) */
  private async collectSubtreeIds(rootId: string): Promise<string[]> {
    const result: string[] = [];
    const visit = async (id: string) => {
      const children = await this.getChildCategories(id);
      for (const child of children) {
        await visit(child.id);
      }
      result.push(id);
    };
    await visit(rootId);
    return result;
  }

  /** Глубокое принудительное удаление категории/подкатегорий с разными режимами обработки товаров */
  async deepForceDeleteCategory(rootId: string, options: { mode: 'uncategorized' | 'reassign' | 'purge'; targetCategoryId?: string | null; }): Promise<{ deletedCategoryIds: string[]; reassignedProducts: number; liftedProducts: number; purgedProducts: number; usedUncategorized: boolean; }> {
    try {
      const { mode, targetCategoryId } = options;
      console.log('[deepForceDeleteCategory] Called with mode:', mode, 'for rootId:', rootId);
      
      let reassignedProducts = 0;
      let liftedProducts = 0;
      let purgedProducts = 0;
      let usedUncategorized = false;

      // Валидация базовой категории
      const root = await this.getCategoryById(rootId);
      if (!root) throw new Error('Категория не найдена');
      
      return await db.transaction(async (trx) => {
        // Проверяем что это не placeholder категория, но разрешаем purge mode
        if ((root as any).slug === 'uncategorized' && mode !== 'purge') {
          // Проверяем есть ли товары в этой категории (и как categoryId и как subcategoryId)
          const productsInCategory = await trx
            .select()
            .from(products)
            .where(eq(products.categoryId, rootId));
          
          const productsInSubcategory = await trx
            .select()
            .from(products)
            .where(eq(products.subcategoryId, rootId));
          
          const categoryCount = productsInCategory.length;
          const subcategoryCount = productsInSubcategory.length;
          const totalCount = categoryCount + subcategoryCount;
          
          console.log('[deepForceDeleteCategory] Uncategorized check - products found:', totalCount, '(cat:', categoryCount, 'sub:', subcategoryCount, ')');
          
          if (totalCount > 0) {
            throw new Error(`Нельзя удалить категорию "Без категории" - в ней ${totalCount} товаров (categoryId: ${categoryCount}, subcategoryId: ${subcategoryCount}). Сначала переместите товары в другие категории.`);
          }
          
          console.warn('[deepForceDeleteCategory] Deleting empty uncategorized category by admin request');
        }
        
        // Для purge режима с Uncategorized категорией - дополнительное предупреждение
        if ((root as any).slug === 'uncategorized' && mode === 'purge') {
          console.warn('[deepForceDeleteCategory] PURGE MODE: Will delete Uncategorized category and ALL its products');
        }

        // Если reassign — проверяем цель
        let effectiveTarget: string | null = null;
        if (mode === 'reassign') {
          if (!targetCategoryId) throw new Error('targetCategoryId обязателен для режима reassign');
          if (targetCategoryId === rootId) throw new Error('targetCategoryId не может совпадать с удаляемой категорией');
          const t = await this.getCategoryById(targetCategoryId);
          if (!t) throw new Error('Целевая категория не найдена');
          if ((t as any).parentId) throw new Error('Целевая категория должна быть корневой (без parentId)');
          effectiveTarget = targetCategoryId;
        }

        // Если uncategorized — lazily ensure placeholder
        if (mode === 'uncategorized') {
          const placeholder = await this.ensureUncategorizedCategory();
          effectiveTarget = placeholder.id;
          usedUncategorized = true;
        }

        // Собираем поддерево (post-order: дети, потом родитель) чтобы безопасно удалять
        const allIds = await this.collectSubtreeIds(rootId);
        console.log('[deepForceDeleteCategory] start', { rootId, mode, targetCategoryId, effectiveTarget, subtreeSize: allIds.length, allIds });

        // Обрабатываем товары и удаляем категории в той же транзакции
        const deletedCategoryIds: string[] = [];
        for (const catId of allIds) {
          try {
            const [cat] = await trx.select().from(categories).where(eq(categories.id, catId));
            if (!cat) {
              console.warn('[deepForceDeleteCategory][tx] category disappeared during processing', catId);
              continue;
            }
            const isSub = !!(cat as any).parentId;
            console.log('[deepForceDeleteCategory][tx] process node', { catId, isSub, mode });

            if (mode === 'purge') {
              // Сначала находим товары которые будем удалять
              const productsToDelete = await trx.select({ id: products.id })
                .from(products)
                .where(or(eq(products.categoryId, catId), eq(products.subcategoryId as any, catId)));
              
              // Удаляем связанные order_items перед удалением товаров
              for (const prod of productsToDelete) {
                const delOrderItemsRes = await trx.delete(orderItems).where(eq(orderItems.productId, prod.id));
                const rcOrderItems = (delOrderItemsRes as any)?.rowCount ?? 0;
                if (rcOrderItems > 0) {
                  console.log('[deepForceDeleteCategory][tx] deleted order items for product', prod.id, ':', rcOrderItems);
                }
              }
              
              // Удаляем ВСЕ продукты связанные с этой категорией (как categoryId, так и subcategoryId)
              const delSubRes = await trx.delete(products).where(eq(products.subcategoryId as any, catId));
              const delCatRes = await trx.delete(products).where(eq(products.categoryId, catId));
              const rcSub = (delSubRes as any)?.rowCount ?? 0;
              const rcCat = (delCatRes as any)?.rowCount ?? 0;
              purgedProducts += rcSub + rcCat;
              console.log('[deepForceDeleteCategory][tx] purged all products', { catId, rcSub, rcCat, totalPurged: rcSub + rcCat, purgedProducts });
            } else if (mode === 'reassign' || mode === 'uncategorized') {
              // Обрабатываем ВСЕ ссылки на категорию
              // 1. Очищаем subcategoryId где он равен catId
              const updSub = await trx.update(products)
                .set({ subcategoryId: null } as any)
                .where(eq(products.subcategoryId as any, catId));
              const rcSub = (updSub as any)?.rowCount ?? 0;
              liftedProducts += rcSub;
              console.log('[deepForceDeleteCategory][tx] lifted products from subcategoryId', { catId, rc: rcSub, liftedProducts });
              
              // 2. Переносим categoryId где он равен catId  
              if (effectiveTarget && effectiveTarget !== catId) {
                const updCat = await trx.update(products)
                  .set({ categoryId: effectiveTarget, subcategoryId: null } as any)
                  .where(eq(products.categoryId, catId));
                const rcCat = (updCat as any)?.rowCount ?? 0;
                reassignedProducts += rcCat;
                console.log('[deepForceDeleteCategory][tx] reassigned categoryId products', { from: catId, to: effectiveTarget, rc: rcCat, reassignedProducts });
              } else if (effectiveTarget === catId) {
                // Если пытаемся переместить в саму удаляемую категорию - создаём новый placeholder
                console.warn('[deepForceDeleteCategory][tx] Cannot move to self, creating new placeholder');
                const newPlaceholder = await this.ensureUncategorizedCategory();
                const updCat2 = await trx.update(products)
                  .set({ categoryId: newPlaceholder.id, subcategoryId: null } as any)
                  .where(eq(products.categoryId, catId));
                const rcCat = (updCat2 as any)?.rowCount ?? 0;
                reassignedProducts += rcCat;
                console.log('[deepForceDeleteCategory][tx] reassigned to new placeholder', { from: catId, to: newPlaceholder.id, rc: rcCat, reassignedProducts });
              }
            }
          } catch (nodeErr: any) {
            console.error('[deepForceDeleteCategory][tx] node processing error', { catId, error: nodeErr?.message });
            throw nodeErr;
          }
        }
        
        // Удаляем сами категории
        for (const catId of allIds) {
          const delRes = await trx.delete(categories).where(eq(categories.id, catId));
          if ((delRes as any)?.rowCount === 1) deletedCategoryIds.push(catId);
        }

        console.log('[deepForceDeleteCategory] deletion complete', { 
          deletedCategoryIdsCount: deletedCategoryIds.length, 
          deletedIds: deletedCategoryIds,
          stats: { reassignedProducts, liftedProducts, purgedProducts, usedUncategorized }
        });

        // Логирование (отключено пока change_logs таблица не создана)
        console.log('[deepForceDeleteCategory] Would log to change_logs:', {
          entityType: 'category',
          entityIds: { rootId, deletedCategoryIds },
          action: 'deep_force_delete_category',
          details: {
            mode,
            targetCategoryId: effectiveTarget,
            reassignedProducts,
            liftedProducts,
            purgedProducts,
            usedUncategorized,
            totalRemoved: deletedCategoryIds.length
          }
        });

        return { deletedCategoryIds, reassignedProducts, liftedProducts, purgedProducts, usedUncategorized };
      });
    } catch (error: any) {
      console.error('[deepForceDeleteCategory] Fatal error:', error);
      console.error('[deepForceDeleteCategory] Stack:', error?.stack);
      throw error;
    }
  }

  async diagnoseCategoryTree(rootId: string): Promise<{ rootId: string; subtreeIds: string[]; categories: Category[]; productStats: Record<string, { directProducts: number; subcategoryProducts: number; totalProducts: number }>; }> {
    const root = await this.getCategoryById(rootId);
    if (!root) throw new Error('Категория не найдена');
    const subtreeIds = await this.collectSubtreeIds(rootId);
    const cats: Category[] = [];
    for (const id of subtreeIds) {
      const c = await this.getCategoryById(id);
      if (c) cats.push(c as any);
    }
    const productStats: Record<string, any> = {};
    for (const cat of cats) {
      const direct = await db.select().from(products).where(eq(products.categoryId, cat.id));
      const subProd = await db.select().from(products).where(eq(products.subcategoryId as any, cat.id));
      productStats[cat.id] = {
        directProducts: direct.length,
        subcategoryProducts: subProd.length,
        totalProducts: direct.length + subProd.length
      };
    }
    return { rootId, subtreeIds, categories: cats, productStats };
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [row] = await db.select().from(categories).where(eq(categories.slug, slug));
    return row as Category | undefined;
  }

  async ensureUncategorizedCategory(): Promise<Category> {
    const existing = await this.getCategoryBySlug('uncategorized');
    if (existing) return existing;
    const name = { ru: 'Без категории', en: 'Uncategorized', hy: 'Առանց կատեգորիայի' } as any;
    const inserted = await db.insert(categories).values({
      name,
      slug: 'uncategorized',
      description: { ru: '', en: '', hy: '' } as any,
      translations: {
        ru: { name: name.ru, slug: 'uncategorized', description: '' },
        en: { name: name.en, slug: 'uncategorized', description: '' },
        hy: { name: name.hy, slug: 'uncategorized', description: '' }
      },
      isActive: true
    } as any).returning();
    const created = firstRow<Category>(inserted);
    return created;
  }

  async getProductsByCategoryId(categoryId: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.categoryId, categoryId));
  }

  async reassignProductsFromCategory(categoryId: string, targetCategoryId: string | null): Promise<number> {
    const updateResult = await db.update(products)
      .set({ categoryId: targetCategoryId, subcategoryId: null } as any)
      .where(eq(products.categoryId, categoryId));
    return (updateResult as any)?.rowCount ?? 0;
  }

  async removeSubcategoryAndLiftProducts(subcategoryId: string): Promise<number> {
    // Get parent of subcategory
    const [subcategory] = await db.select().from(categories).where(eq(categories.id, subcategoryId));
    if (!subcategory) return 0;
    const parentId = (subcategory as any).parentId || null;
    const updateResult = await db.update(products)
      .set({ subcategoryId: null } as any)
      .where(eq(products.subcategoryId, subcategoryId));
    await db.delete(categories).where(eq(categories.id, subcategoryId));
    return (updateResult as any)?.rowCount ?? 0;
  }

  // Product operations
  async getProducts(categoryId?: string): Promise<Product[]> {
    if (categoryId) {
      // Find products that belong to this category OR this subcategory
      return await db.select().from(products)
        .where(and(
          eq(products.isActive, true), 
          or(
            eq(products.categoryId, categoryId),
            eq(products.subcategoryId, categoryId)
          )
        ))
        .orderBy(products.sortOrder);
    }
    
    return await db.select().from(products)
      .where(eq(products.isActive, true))
      .orderBy(products.sortOrder);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product as any).returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set(product as any)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  /**
   * Bulk update products with partial fields (category move, status, sale, hashtags append)
   * Returns updated product IDs.
   */
  async bulkUpdateProducts(params: {
    productIds: string[];
    patch?: Partial<InsertProduct> & {
      // narrow commonly used booleans to avoid accidental full object merges
      inStock?: boolean;
      isActive?: boolean;
      isOnSale?: boolean;
      discountPercentage?: number;
      categoryId?: string | null;
      subcategoryId?: string | null;
    };
    appendHashtags?: { ru?: string[]; hy?: string[]; en?: string[] };
  }): Promise<string[]> {
    const { productIds, patch, appendHashtags } = params;
    if (productIds.length === 0) return [];

    // 1. If we need to append hashtags, load existing first
    let hashtagMap: Record<string, any> = {};
    if (appendHashtags) {
      const existing = await db.select().from(products).where(inArray(products.id, productIds));
      existing.forEach(p => {
        hashtagMap[p.id] = p.hashtags || { ru: [], hy: [], en: [] };
      });

      const norm = (arr?: string[]) => (arr || []).map(t => t.startsWith('#') ? t : `#${t}`).filter(t => t.length > 1);
      for (const pid of productIds) {
        const current = hashtagMap[pid] || { ru: [], hy: [], en: [] };
        hashtagMap[pid] = {
          ru: Array.from(new Set([...(current.ru || []), ...(norm(appendHashtags.ru))])),
          hy: Array.from(new Set([...(current.hy || []), ...(norm(appendHashtags.hy))])),
          en: Array.from(new Set([...(current.en || []), ...(norm(appendHashtags.en))]))
        };
      }
    }

    // 2. Apply uniform patch first (excluding hashtags) via single bulk UPDATE if patch present
    if (patch && Object.keys(patch).length > 0) {
      await db.update(products)
        .set(patch as any)
        .where(inArray(products.id, productIds));
    }

    // 3. Apply per-product hashtag updates individually if necessary (cannot easily batch JSON merge otherwise portable)
    if (appendHashtags) {
      for (const pid of productIds) {
        await db.update(products)
          .set({ hashtags: hashtagMap[pid] } as any)
          .where(eq(products.id, pid));
      }
    }

    return productIds;
  }

  async createChangeLog(entry: InsertChangeLog): Promise<ChangeLog> {
    const record: any = {
      userId: entry.userId || null,
      entityType: entry.entityType,
      entityIds: entry.entityIds,
      action: entry.action,
      details: entry.details || null,
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null
    };
    const [row] = await db.insert(changeLogs).values(record).returning();
    return row as ChangeLog;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          or(
            ilike(products.name, `%${query}%`),
            ilike(products.description, `%${query}%`)
          )
        )
      )
      .orderBy(products.sortOrder);
  }

  async getProductsBySpecialPage(specialPage: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          sql`${products.specialPages} @> ARRAY[${specialPage}]::text[]`
        )
      )
      .orderBy(products.sortOrder);
  }

  // Order operations
  async getOrders(userId?: string): Promise<Order[]> {
    const query = db.select().from(orders);
    
    if (userId) {
      return await query.where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
    }
    
    return await query.orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order as any).returning();
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ ...order, updatedAt: new Date() } as any)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  // Blog category operations
  async getBlogCategories(): Promise<BlogCategory[]> {
    return await db.select().from(blogCategories).orderBy(blogCategories.sortOrder);
  }

  async createBlogCategory(category: InsertBlogCategory): Promise<BlogCategory> {
    const [newCategory] = await db.insert(blogCategories).values(category as any).returning();
    return newCategory;
  }

  async updateBlogCategory(id: string, category: Partial<InsertBlogCategory>): Promise<BlogCategory> {
    const [updatedCategory] = await db
      .update(blogCategories)
      .set(category)
      .where(eq(blogCategories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteBlogCategory(id: string): Promise<void> {
    await db.delete(blogCategories).where(eq(blogCategories.id, id));
  }

  // Blog post operations
  async getBlogPosts(categoryId?: string, status?: string, search?: string): Promise<BlogPost[]> {
    const conditions = [];
    if (categoryId) {
      conditions.push(eq(blogPosts.categoryId, categoryId));
    }
    if (status) {
      conditions.push(eq(blogPosts.status, status as any));
    }
    if (search) {
      conditions.push(
        or(
          ilike(blogPosts.title, `%${search}%`),
          ilike(blogPosts.excerpt, `%${search}%`),
          ilike(blogPosts.content, `%${search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      return await db.select().from(blogPosts).where(and(...conditions)).orderBy(desc(blogPosts.createdAt));
    }
    
    return await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [newPost] = await db.insert(blogPosts).values(post as any).returning();
    return newPost;
  }

  async updateBlogPost(id: string, post: Partial<InsertBlogPost>): Promise<BlogPost> {
    const [updatedPost] = await db
      .update(blogPosts)
      .set({ ...post, updatedAt: new Date() } as any)
      .where(eq(blogPosts.id, id))
      .returning();
    return updatedPost;
  }

  async deleteBlogPost(id: string): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  async incrementBlogPostViews(id: string): Promise<void> {
    await db
      .update(blogPosts)
      .set({ viewCount: sql`${blogPosts.viewCount} + 1` } as any)
      .where(eq(blogPosts.id, id));
  }

  async getRelatedBlogPosts(id: string): Promise<BlogPost[]> {
    // Get the current post to find related posts by category
    const [currentPost] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    if (!currentPost) {
      return [];
    }

    // Find posts in the same category, excluding the current post
    return await db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.categoryId, currentPost.categoryId!),
          eq(blogPosts.status, 'published'),
          ne(blogPosts.id, id) // Exclude current post
        )
      )
      .orderBy(desc(blogPosts.publishedAt))
      .limit(4);
  }

  // Comment operations
  async getComments(postId?: string): Promise<Comment[]> {
    if (postId) {
      return await db.select().from(comments).where(eq(comments.postId, postId)).orderBy(desc(comments.createdAt));
    }
    
    return await db.select().from(comments).orderBy(desc(comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment as any).returning();
    return newComment;
  }

  async updateComment(id: string, comment: Partial<InsertComment>): Promise<Comment> {
    const [updatedComment] = await db
      .update(comments)
      .set(comment)
      .where(eq(comments.id, id))
      .returning();
    return updatedComment;
  }

  async deleteComment(id: string): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  // User theme operations
  async getUserTheme(userId: string): Promise<UserTheme | undefined> {
    const [theme] = await db.select().from(userThemes).where(eq(userThemes.userId, userId));
    return theme;
  }

  async upsertUserTheme(userTheme: any): Promise<UserTheme> {
    // First try to update existing theme
    const [updatedTheme] = await db
      .update(userThemes)
      .set({ 
        themeName: userTheme.themeName,
        customColors: userTheme.customColors,
        updatedAt: new Date()
      } as any)
      .where(eq(userThemes.userId, userTheme.userId))
      .returning();

    // If no theme was updated, create a new one
    if (!updatedTheme) {
      const [newTheme] = await db
        .insert(userThemes)
        .values(userTheme as any)
        .returning();
      return newTheme;
    }

    return updatedTheme;
  }

  // Review operations
  async getReviews(status?: string): Promise<Review[]> {
    if (status) {
      return await db.select()
        .from(reviews)
        .where(eq(reviews.status, status as any))
        .orderBy(desc(reviews.createdAt));
    } else {
      return await db.select()
        .from(reviews)
        .orderBy(desc(reviews.createdAt));
    }
  }

  async getApprovedReviews(): Promise<Review[]> {
    return await db.select()
      .from(reviews)
      .where(eq(reviews.status, "approved"))
      .orderBy(desc(reviews.sortOrder), desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db
      .insert(reviews)
      .values(review as any)
      .returning();
    return newReview;
  }

  async updateReview(id: string, review: Partial<InsertReview>): Promise<Review> {
    const [updatedReview] = await db
      .update(reviews)
      .set({ 
        ...review,
        updatedAt: new Date()
      } as any)
      .where(eq(reviews.id, id))
      .returning();
    
    if (!updatedReview) {
      throw new Error(`Review with id ${id} not found`);
    }
    
    return updatedReview;
  }

  async deleteReview(id: string): Promise<void> {
    await db.delete(reviews).where(eq(reviews.id, id));
  }

  async approveReview(id: string): Promise<Review> {
    const [updatedReview] = await db
      .update(reviews)
      .set({ 
        status: "approved",
        updatedAt: new Date()
      } as any)
      .where(eq(reviews.id, id))
      .returning();
    
    if (!updatedReview) {
      throw new Error(`Review with id ${id} not found`);
    }
    
    return updatedReview;
  }

  async rejectReview(id: string): Promise<Review> {
    const [updatedReview] = await db
      .update(reviews)
      .set({ 
        status: "rejected",
        updatedAt: new Date()
      } as any)
      .where(eq(reviews.id, id))
      .returning();
    
    if (!updatedReview) {
      throw new Error(`Review with id ${id} not found`);
    }
    
    return updatedReview;
  }

  // Currency operations
  async getCurrencies(): Promise<Currency[]> {
    return db.select().from(currencies).orderBy(currencies.sortOrder, currencies.code);
  }

  async getCurrency(id: string): Promise<Currency | undefined> {
    const [currency] = await db.select().from(currencies).where(eq(currencies.id, id));
    return currency;
  }

  async getCurrencyByCode(code: string): Promise<Currency | undefined> {
    const [currency] = await db.select().from(currencies).where(eq(currencies.code, code as any));
    return currency;
  }

  async createCurrency(currency: InsertCurrency): Promise<Currency> {
    const [newCurrency] = await db
      .insert(currencies)
      .values({
        ...currency,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning();
    return newCurrency;
  }

  async updateCurrency(id: string, currency: Partial<InsertCurrency>): Promise<Currency> {
    const [updatedCurrency] = await db
      .update(currencies)
      .set({ 
        ...currency,
        updatedAt: new Date()
      } as any)
      .where(eq(currencies.id, id))
      .returning();
    
    if (!updatedCurrency) {
      throw new Error(`Currency with id ${id} not found`);
    }
    
    return updatedCurrency;
  }

  async deleteCurrency(id: string): Promise<void> {
    await db.delete(currencies).where(eq(currencies.id, id));
  }

  async getBaseCurrency(): Promise<Currency | undefined> {
    const [currency] = await db.select().from(currencies).where(eq(currencies.isBaseCurrency, true));
    return currency;
  }

  async setBaseCurrency(currencyId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // First, remove base currency flag from all currencies
      await tx.update(currencies).set({ isBaseCurrency: false } as any);
      
      // Then, set the new base currency
      await tx.update(currencies)
        .set({ isBaseCurrency: true, updatedAt: new Date() } as any)
        .where(eq(currencies.id, currencyId));
    });
  }

  // Exchange rate operations
  async getExchangeRates(): Promise<ExchangeRate[]> {
    return db.select().from(exchangeRates).orderBy(desc(exchangeRates.updatedAt));
  }

  async getExchangeRate(fromCurrencyId: string, toCurrencyId: string): Promise<ExchangeRate | undefined> {
    const [rate] = await db.select().from(exchangeRates)
      .where(and(
        eq(exchangeRates.fromCurrencyId, fromCurrencyId),
        eq(exchangeRates.toCurrencyId, toCurrencyId)
      ));
    return rate;
  }

  async createExchangeRate(exchangeRate: InsertExchangeRate): Promise<ExchangeRate> {
    const [newRate] = await db
      .insert(exchangeRates)
      .values({
        ...exchangeRate,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning();
    return newRate;
  }

  async updateExchangeRate(id: string, exchangeRate: Partial<InsertExchangeRate>): Promise<ExchangeRate> {
    const [updatedRate] = await db
      .update(exchangeRates)
      .set({ 
        ...exchangeRate,
        updatedAt: new Date()
      } as any)
      .where(eq(exchangeRates.id, id))
      .returning();
    
    if (!updatedRate) {
      throw new Error(`Exchange rate with id ${id} not found`);
    }
    
    return updatedRate;
  }

  async deleteExchangeRate(id: string): Promise<void> {
    await db.delete(exchangeRates).where(eq(exchangeRates.id, id));
  }

  // Settings operations
  async getSettings(): Promise<Record<string, any>> {
    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, any> = {};
    
    allSettings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });
    
    return settingsMap;
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async updateSetting(key: string, value: any, description?: string): Promise<Setting> {
    const [existingSetting] = await db.select().from(settings).where(eq(settings.key, key));
    
    if (existingSetting) {
      // Update existing setting
      const [updatedSetting] = await db
        .update(settings)
        .set({ 
          value,
          description: description || existingSetting.description,
          updatedAt: new Date()
        } as any)
        .where(eq(settings.key, key))
        .returning();
      return updatedSetting;
    } else {
      // Create new setting
      const [newSetting] = await db
        .insert(settings)
        .values({
          key,
          value,
          description,
          updatedAt: new Date()
        } as any)
        .returning();
      return newSetting;
    }
  }

  async deleteSetting(key: string): Promise<void> {
    await db.delete(settings).where(eq(settings.key, key));
  }
}

export const storage = new DatabaseStorage();
