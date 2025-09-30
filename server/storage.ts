import {
  users,
  categories,
  products,
  orders,
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
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, desc, and, ilike, or, ne, sql } from "drizzle-orm";

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
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

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

  async upsertUser(userData: UpsertUser): Promise<User> {
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
        })
        .where(eq(users.email, userData.email!))
        .returning();
      return updatedUser;
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values(userData)
        .returning();
      return newUser;
    }
  }

  // Customer management operations
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
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
    return await db.select().from(categories).orderBy(categories.sortOrder);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Product operations
  async getProducts(categoryId?: string): Promise<Product[]> {
    if (categoryId) {
      return await db.select().from(products)
        .where(and(eq(products.isActive, true), eq(products.categoryId, categoryId)))
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
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
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
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ ...order, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  // Blog category operations
  async getBlogCategories(): Promise<BlogCategory[]> {
    return await db.select().from(blogCategories).orderBy(blogCategories.sortOrder);
  }

  async createBlogCategory(category: InsertBlogCategory): Promise<BlogCategory> {
    const [newCategory] = await db.insert(blogCategories).values(category).returning();
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
    const [newPost] = await db.insert(blogPosts).values(post).returning();
    return newPost;
  }

  async updateBlogPost(id: string, post: Partial<InsertBlogPost>): Promise<BlogPost> {
    const [updatedPost] = await db
      .update(blogPosts)
      .set({ ...post, updatedAt: new Date() })
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
      .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
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
    const [newComment] = await db.insert(comments).values(comment).returning();
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

  async upsertUserTheme(userTheme: InsertUserTheme): Promise<UserTheme> {
    // First try to update existing theme
    const [updatedTheme] = await db
      .update(userThemes)
      .set({ 
        themeName: userTheme.themeName,
        customColors: userTheme.customColors,
        updatedAt: new Date()
      })
      .where(eq(userThemes.userId, userTheme.userId))
      .returning();

    // If no theme was updated, create a new one
    if (!updatedTheme) {
      const [newTheme] = await db
        .insert(userThemes)
        .values(userTheme)
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
      .values(review)
      .returning();
    return newReview;
  }

  async updateReview(id: string, review: Partial<InsertReview>): Promise<Review> {
    const [updatedReview] = await db
      .update(reviews)
      .set({ 
        ...review,
        updatedAt: new Date()
      })
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
      })
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
      })
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
      })
      .returning();
    return newCurrency;
  }

  async updateCurrency(id: string, currency: Partial<InsertCurrency>): Promise<Currency> {
    const [updatedCurrency] = await db
      .update(currencies)
      .set({ 
        ...currency,
        updatedAt: new Date()
      })
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
      await tx.update(currencies).set({ isBaseCurrency: false });
      
      // Then, set the new base currency
      await tx.update(currencies)
        .set({ isBaseCurrency: true, updatedAt: new Date() })
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
      })
      .returning();
    return newRate;
  }

  async updateExchangeRate(id: string, exchangeRate: Partial<InsertExchangeRate>): Promise<ExchangeRate> {
    const [updatedRate] = await db
      .update(exchangeRates)
      .set({ 
        ...exchangeRate,
        updatedAt: new Date()
      })
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
        })
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
        })
        .returning();
      return newSetting;
    }
  }

  async deleteSetting(key: string): Promise<void> {
    await db.delete(settings).where(eq(settings.key, key));
  }
}

export const storage = new DatabaseStorage();
