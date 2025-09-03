import { sql } from 'drizzle-orm';
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"), // user, admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: jsonb("name").notNull(), // {ru: string, hy: string, en: string}
  slug: varchar("slug").notNull().unique(),
  description: jsonb("description"), // {ru: string, hy: string, en: string}
  imageUrl: varchar("image_url"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: jsonb("name").notNull(), // {ru: string, hy: string, en: string}
  description: jsonb("description"), // {ru: string, hy: string, en: string}
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }), // For discounts
  discountPercentage: integer("discount_percentage").default(0), // Discount percentage (0-100)
  inStock: boolean("in_stock").default(true), // Availability status
  stockQuantity: integer("stock_quantity").default(0), // Available quantity
  isOnSale: boolean("is_on_sale").default(false), // Sale status
  imageUrl: varchar("image_url"), // Primary image URL
  images: text("images").array(), // Array of image URLs
  categoryId: varchar("category_id").references(() => categories.id),
  options: jsonb("options"), // {sizes: string[], coverTypes: string[], etc}
  // Photobook specific fields
  photobookFormat: varchar("photobook_format"), // album, book, square
  photobookSize: varchar("photobook_size"), // "20x15", "30x20", etc
  minSpreads: integer("min_spreads").default(10), // minimum spreads
  additionalSpreadPrice: decimal("additional_spread_price", { precision: 10, scale: 2 }), // price per additional spread
  // Quality and materials
  paperType: varchar("paper_type"), // matte, glossy, satin
  coverMaterial: varchar("cover_material"), // hardcover, softcover, leatherette
  bindingType: varchar("binding_type"), // spiral, perfect, saddle-stitch
  // Production and delivery
  productionTime: integer("production_time").default(7), // Days
  shippingTime: integer("shipping_time").default(3), // Days
  weight: decimal("weight", { precision: 5, scale: 2 }), // kg
  // Customization options
  allowCustomization: boolean("allow_customization").default(true),
  minCustomPrice: decimal("min_custom_price", { precision: 10, scale: 2 }), // Minimum price for custom work
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Photobook format enum
export const photobookFormatEnum = pgEnum("photobook_format", [
  "album",
  "book",
  "square"
]);

// Order status enum
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing", 
  "shipped",
  "delivered",
  "cancelled"
]);

// Blog status enum
export const blogStatusEnum = pgEnum("blog_status", [
  "draft",
  "published",
  "scheduled",
  "archived"
]);

// Orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  customerName: varchar("customer_name").notNull(),
  customerEmail: varchar("customer_email").notNull(),
  customerPhone: varchar("customer_phone"),
  shippingAddress: text("shipping_address").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").default("pending"),
  items: jsonb("items").notNull(), // Array of order items
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blog Categories
export const blogCategories = pgTable("blog_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: jsonb("name").notNull(), // {ru: string, hy: string, en: string}
  slug: varchar("slug").notNull().unique(),
  description: jsonb("description"),
  color: varchar("color").default("#6366f1"), // для UI
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Blog Posts
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: jsonb("title").notNull(), // {ru: string, hy: string, en: string}
  slug: varchar("slug").notNull().unique(),
  excerpt: jsonb("excerpt"), // {ru: string, hy: string, en: string}
  content: jsonb("content").notNull(), // {ru: string, hy: string, en: string}
  featuredImage: varchar("featured_image"),
  authorId: varchar("author_id").references(() => users.id),
  categoryId: varchar("category_id").references(() => blogCategories.id),
  status: blogStatusEnum("status").default("draft"),
  publishedAt: timestamp("published_at"),
  seoTitle: jsonb("seo_title"), // {ru: string, hy: string, en: string}
  seoDescription: jsonb("seo_description"), // {ru: string, hy: string, en: string}
  tags: text("tags").array(), // массив тегов
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comments
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => blogPosts.id),
  userId: varchar("user_id").references(() => users.id),
  authorName: varchar("author_name").notNull(),
  authorEmail: varchar("author_email").notNull(),
  content: text("content").notNull(),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Analytics Events
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: varchar("event_type").notNull(), // page_view, product_view, add_to_cart, purchase, etc
  entityType: varchar("entity_type"), // product, category, blog_post, etc
  entityId: varchar("entity_id"),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  metadata: jsonb("metadata"), // дополнительные данные
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// CRM Settings
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  description: text("description"),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Theme Preferences
export const userThemes = pgTable("user_themes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  themeName: varchar("theme_name").notNull(), // default, ocean, sunset, forest, purple, etc
  customColors: jsonb("custom_colors"), // custom color overrides
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Promocodes
export const promocodes = pgTable("promocodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  name: varchar("name").notNull(),
  discountType: varchar("discount_type").notNull(), // percentage, fixed
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  blogPosts: many(blogPosts),
  comments: many(comments),
  analyticsEvents: many(analyticsEvents),
  themes: many(userThemes),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));

export const blogCategoriesRelations = relations(blogCategories, ({ many }) => ({
  posts: many(blogPosts),
}));

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
  category: one(blogCategories, {
    fields: [blogPosts.categoryId],
    references: [blogCategories.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(blogPosts, {
    fields: [comments.postId],
    references: [blogPosts.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(users, {
    fields: [analyticsEvents.userId],
    references: [users.id],
  }),
}));

export const userThemesRelations = relations(userThemes, ({ one }) => ({
  user: one(users, {
    fields: [userThemes.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
}).extend({
  categoryId: z.string().min(1, "Выберите категорию"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlogCategorySchema = createInsertSchema(blogCategories).omit({
  id: true,
  createdAt: true,
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  createdAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertPromocodeSchema = createInsertSchema(promocodes).omit({
  id: true,
  createdAt: true,
});

export const insertUserThemeSchema = createInsertSchema(userThemes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type BlogCategory = typeof blogCategories.$inferSelect;
export type InsertBlogCategory = z.infer<typeof insertBlogCategorySchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Promocode = typeof promocodes.$inferSelect;
export type InsertPromocode = z.infer<typeof insertPromocodeSchema>;
export type UserTheme = typeof userThemes.$inferSelect;
export type InsertUserTheme = z.infer<typeof insertUserThemeSchema>;

// Photobook format types and constants
export type PhotobookFormat = "album" | "book" | "square";

export interface PhotobookSize {
  width: number;
  height: number;
  label: string;
}

export const PHOTOBOOK_SIZES: Record<PhotobookFormat, PhotobookSize[]> = {
  album: [
    { width: 20, height: 15, label: "20×15 см" },
    { width: 30, height: 20, label: "30×20 см" },
    { width: 35, height: 25, label: "35×25 см" },
    { width: 40, height: 30, label: "40×30 см" },
  ],
  book: [
    { width: 15, height: 20, label: "15×20 см" },
    { width: 20, height: 30, label: "20×30 см" },
    { width: 35, height: 25, label: "35×25 см" },
    { width: 30, height: 40, label: "30×40 см" },
  ],
  square: [
    // TODO: Add square sizes when specified
  ],
};

export const PHOTOBOOK_FORMAT_LABELS: Record<PhotobookFormat, string> = {
  album: "Альбомный",
  book: "Книжный",
  square: "Квадратный",
};

// Helper function to calculate additional spread price (10% of base price)
export const calculateAdditionalSpreadPrice = (basePrice: number): number => {
  return Math.round(basePrice * 0.1);
};

// Helper function to format size as string
export const formatPhotobookSize = (size: PhotobookSize): string => {
  return `${size.width}x${size.height}`;
};

// Color theme definitions
export interface ColorTheme {
  name: string;
  label: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
  };
}

export const BUILT_IN_THEMES: Record<string, ColorTheme> = {
  default: {
    name: "default",
    label: "По умолчанию",
    description: "Стандартная цветовая схема ФотоКрафт",
    colors: {
      primary: "hsl(222.2, 84%, 4.9%)",
      secondary: "hsl(210, 40%, 96%)",
      accent: "hsl(210, 40%, 94%)",
      background: "hsl(0, 0%, 100%)",
      surface: "hsl(0, 0%, 98%)",
      text: "hsl(222.2, 84%, 4.9%)",
      textMuted: "hsl(215.4, 16.3%, 46.9%)",
      border: "hsl(214.3, 31.8%, 91.4%)",
    },
  },
  ocean: {
    name: "ocean",
    label: "Океан",
    description: "Прохладные морские оттенки",
    colors: {
      primary: "hsl(200, 95%, 25%)",
      secondary: "hsl(200, 50%, 95%)",
      accent: "hsl(190, 70%, 88%)",
      background: "hsl(0, 0%, 100%)",
      surface: "hsl(195, 20%, 98%)",
      text: "hsl(200, 95%, 25%)",
      textMuted: "hsl(200, 30%, 50%)",
      border: "hsl(200, 20%, 85%)",
    },
  },
  sunset: {
    name: "sunset",
    label: "Закат",
    description: "Теплые оранжевые и красные тона",
    colors: {
      primary: "hsl(15, 85%, 40%)",
      secondary: "hsl(25, 60%, 95%)",
      accent: "hsl(35, 80%, 90%)",
      background: "hsl(0, 0%, 100%)",
      surface: "hsl(25, 30%, 98%)",
      text: "hsl(15, 85%, 30%)",
      textMuted: "hsl(20, 40%, 55%)",
      border: "hsl(25, 30%, 85%)",
    },
  },
  forest: {
    name: "forest",
    label: "Лес",
    description: "Природные зеленые оттенки",
    colors: {
      primary: "hsl(140, 50%, 30%)",
      secondary: "hsl(120, 40%, 95%)",
      accent: "hsl(130, 60%, 90%)",
      background: "hsl(0, 0%, 100%)",
      surface: "hsl(120, 20%, 98%)",
      text: "hsl(140, 50%, 25%)",
      textMuted: "hsl(130, 25%, 50%)",
      border: "hsl(120, 20%, 85%)",
    },
  },
  purple: {
    name: "purple",
    label: "Фиолетовый",
    description: "Элегантные фиолетовые тона",
    colors: {
      primary: "hsl(270, 60%, 40%)",
      secondary: "hsl(280, 40%, 95%)",
      accent: "hsl(275, 70%, 90%)",
      background: "hsl(0, 0%, 100%)",
      surface: "hsl(280, 20%, 98%)",
      text: "hsl(270, 60%, 35%)",
      textMuted: "hsl(275, 30%, 55%)",
      border: "hsl(280, 20%, 85%)",
    },
  },
  cosmic: {
    name: "cosmic",
    label: "Космос",
    description: "Темная космическая тема со звездными акцентами",
    colors: {
      primary: "hsl(250, 80%, 60%)",
      secondary: "hsl(220, 20%, 15%)",
      accent: "hsl(280, 100%, 70%)",
      background: "hsl(220, 25%, 8%)",
      surface: "hsl(220, 20%, 12%)",
      text: "hsl(0, 0%, 95%)",
      textMuted: "hsl(220, 15%, 65%)",
      border: "hsl(220, 20%, 25%)",
    },
  },
  rainbow: {
    name: "rainbow",
    label: "Радуга",
    description: "Яркие многоцветные акценты",
    colors: {
      primary: "hsl(340, 85%, 55%)",
      secondary: "hsl(60, 85%, 95%)",
      accent: "hsl(180, 85%, 85%)",
      background: "hsl(0, 0%, 100%)",
      surface: "hsl(60, 20%, 98%)",
      text: "hsl(340, 85%, 25%)",
      textMuted: "hsl(220, 15%, 45%)",
      border: "hsl(180, 30%, 80%)",
    },
  },
};

