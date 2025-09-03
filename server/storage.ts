import {
  users,
  categories,
  products,
  orders,
  blogCategories,
  blogPosts,
  comments,
  settings,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, or, ne, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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
  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  updateSetting(key: string, value: string, description?: string): Promise<Setting>;
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

  // Settings operations
  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings).orderBy(settings.key);
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async updateSetting(key: string, value: string, description?: string): Promise<Setting> {
    // First try to update existing setting
    const [updatedSetting] = await db
      .update(settings)
      .set({ 
        value, 
        description: description || null,
        updatedAt: new Date()
      })
      .where(eq(settings.key, key))
      .returning();

    // If no setting was updated, create a new one
    if (!updatedSetting) {
      const [newSetting] = await db
        .insert(settings)
        .values({ key, value, description: description || null })
        .returning();
      return newSetting;
    }

    return updatedSetting;
  }
}

export const storage = new DatabaseStorage();
