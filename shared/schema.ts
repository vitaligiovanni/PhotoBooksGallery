import { sql } from 'drizzle-orm';
import {
  boolean,
  bigint,
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
// Re-export browser-safe constants and helpers
export { PHOTOBOOK_SIZES, PHOTOBOOK_FORMAT_LABELS, calculateAdditionalSpreadPrice, formatPhotobookSize, BUILT_IN_THEMES, SUPPORTED_CURRENCIES, formatCurrency } from './public';
export type { PhotobookFormat, PhotobookSize, SupportedCurrency, ColorTheme } from './public';

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
  passwordHash: varchar("password_hash"), // For local authentication
  role: varchar("role").default("user"), // user, admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories (self-referential). Use a forward declaration pattern to appease TS circular inference.
// We declare a temporary variable, then build the table, then reassign the typed export.
let _categories: any; // forward placeholder
// Multilingual helper types for JSONB columns
// Require 'ru' since the app logic assumes a primary Russian value, others optional
type MLText = { ru: string; hy?: string; en?: string };
type Translation = { name?: string; slug?: string; description?: string };

export const categories = _categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: jsonb("name").$type<MLText>().notNull(), // {ru: string, hy?: string, en?: string}
  slug: varchar("slug").notNull().unique(),
  description: jsonb("description").$type<MLText | null>(), // {ru: string, hy: string, en: string}
  translations: jsonb("translations").$type<{ ru: Translation; hy?: Translation; en?: Translation } | null>(),
  parentId: varchar("parent_id").references(() => _categories.id), // Self-referencing foreign key for hierarchy
  imageUrl: varchar("image_url"),
  coverImage: varchar("cover_image"), // Cover image for subcategory cards
  bannerImage: varchar("banner_image"), // Banner image for subcategory pages
  sortOrder: integer("sort_order").default(0),
  order: integer("order").default(1), // Custom display order (lower = higher priority)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_categories_parent_id").on(table.parentId),
  index("IDX_categories_slug").on(table.slug),
  index("IDX_categories_active").on(table.isActive),
]);

// Products
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: jsonb("name").$type<MLText>().notNull(), // {ru: string, hy?: string, en?: string}
  description: jsonb("description").$type<MLText | null>(), // {ru: string, hy: string, en: string}
  hashtags: jsonb("hashtags").$type<{ ru?: string[]; hy?: string[]; en?: string[] } | null>(), // {ru: string[], hy: string[], en: string[]}
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currencyId: varchar("currency_id").references(() => currencies.id), // валюта цены
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }), // For discounts
  discountPercentage: integer("discount_percentage").default(0), // Discount percentage (0-100)
  inStock: boolean("in_stock").default(true), // Availability status
  stockQuantity: integer("stock_quantity").default(0), // Available quantity
  isOnSale: boolean("is_on_sale").default(false), // Sale status
  imageUrl: varchar("image_url"), // Primary image URL
  images: text("images").array(), // Array of image URLs
  videoUrl: varchar("video_url"), // Primary video URL
  videos: text("videos").array(), // Array of video URLs
  categoryId: varchar("category_id").references(() => categories.id),
  subcategoryId: varchar("subcategory_id").references(() => categories.id), // Foreign key для подкатегорий
  options: jsonb("options"), // {sizes: string[], coverTypes: string[], etc}
  // Photobook specific fields
  photobookFormat: varchar("photobook_format"), // album, book, square
  photobookSize: varchar("photobook_size"), // "20x15", "30x20", etc
  minSpreads: integer("min_spreads").default(10), // minimum spreads
  additionalSpreadPrice: decimal("additional_spread_price", { precision: 10, scale: 2 }), // price per additional spread
  additionalSpreadCurrencyId: varchar("additional_spread_currency_id").references(() => currencies.id), // валюта доп. цены
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
  minCustomPriceCurrencyId: varchar("min_custom_price_currency_id").references(() => currencies.id), // валюта мін. цены
  // Ready-made product flag
  isReadyMade: boolean("is_ready_made").default(false), // готовый товар (рамки, альбомы) vs кастомные (фотокниги)
  // Cost and profit management
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).default("0"), // Себестоимость
  costCurrencyId: varchar("cost_currency_id").references(() => currencies.id), // валюта себестоимости
  materialCosts: decimal("material_costs", { precision: 10, scale: 2 }).default("0"), // Стоимость материалов
  laborCosts: decimal("labor_costs", { precision: 10, scale: 2 }).default("0"), // Стоимость работы
  overheadCosts: decimal("overhead_costs", { precision: 10, scale: 2 }).default("0"), // Накладные расходы
  shippingCosts: decimal("shipping_costs", { precision: 10, scale: 2 }).default("0"), // Расходы на доставку
  otherCosts: decimal("other_costs", { precision: 10, scale: 2 }).default("0"), // Прочие расходы
  expectedProfitMargin: decimal("expected_profit_margin", { precision: 5, scale: 2 }).default("30"), // Ожидаемая маржа %
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  // Special pages assignment
  specialPages: text("special_pages").array().default(sql`'{}'::text[]`), // Pages where this product should appear: ['graduation-albums', 'premium-gifts']
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

// Review status enum
export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected"
]);

// Currency enum
export const currencyEnum = pgEnum("currency", [
  "USD", // American Dollar
  "RUB", // Russian Ruble
  "AMD"  // Armenian Dram
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
  currencyId: varchar("currency_id").references(() => currencies.id), // валюта заказа
  exchangeRate: decimal("exchange_rate", { precision: 15, scale: 8 }), // курс на момент заказа
  status: orderStatusEnum("status").default("pending"),
  items: jsonb("items").notNull(), // Array of order items
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order Items
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  productId: varchar("product_id").references(() => products.id),
  productName: varchar("product_name").notNull(),
  productImageUrl: varchar("product_image_url"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  options: jsonb("options"), // Опции товара (формат, размер, материал и т.д.)
  createdAt: timestamp("created_at").defaultNow(),
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

// Change logs (audit trail for bulk operations & critical updates)
export const changeLogs = pgTable("change_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  entityType: varchar("entity_type").notNull(), // e.g. 'product'
  entityIds: jsonb("entity_ids").notNull(), // array of ids affected
  action: varchar("action").notNull(), // e.g. 'bulk-move', 'bulk-status'
  details: jsonb("details"), // arbitrary JSON describing change
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_change_logs_entity_type").on(table.entityType),
  index("IDX_change_logs_created_at").on(table.createdAt),
]);

export const insertChangeLogSchema = z.object({
  userId: z.string().optional().nullable(),
  entityType: z.string().min(1),
  entityIds: z.array(z.string().min(1)).min(1),
  action: z.string().min(1),
  details: z.any().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});

export type ChangeLog = typeof changeLogs.$inferSelect;
export type InsertChangeLog = z.infer<typeof insertChangeLogSchema>;

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
  currencyId: varchar("currency_id").references(() => currencies.id), // валюта для fixed скидки
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  minOrderCurrencyId: varchar("min_order_currency_id").references(() => currencies.id), // валюта мин. суммы
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // null для промо-отзывов
  productId: varchar("product_id").references(() => products.id), // связь с товаром
  authorName: varchar("author_name").notNull(),
  authorEmail: varchar("author_email"), // опционально для промо-отзывов
  profilePhoto: varchar("profile_photo"), // URL фото профиля
  gender: varchar("gender"), // male, female, other для дефолтной аватарки
  rating: integer("rating").notNull(), // 1-5 звезд
  comment: text("comment").notNull(),
  status: reviewStatusEnum("status").default("pending"),
  isPromoted: boolean("is_promoted").default(false), // промо-отзывы от администратора
  sortOrder: integer("sort_order").default(0), // для управления порядком
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Banner types enum
export const bannerTypeEnum = pgEnum("banner_type", [
  "header", // Верхний sticky баннер
  "fullscreen", // Полноэкранный баннер
  "sidebar", // Боковой баннер
  "inline", // Встроенный баннер
  "popup" // Попап баннер
]);

// Banner status enum
export const bannerStatusEnum = pgEnum("banner_status", [
  "draft",
  "active",
  "paused",
  "expired"
]);

// Popup types enum
export const popupTypeEnum = pgEnum("popup_type", [
  "welcome", // Приветственный попап
  "exit_intent", // Попап при попытке ухода
  "newsletter", // Подписка на рассылку
  "special_offer", // Специальное предложение
  "cart_abandonment" // Брошенная корзина
]);

// Popup status enum
export const popupStatusEnum = pgEnum("popup_status", [
  "draft",
  "active",
  "paused",
  "expired"
]);

// Special offer types enum
export const specialOfferTypeEnum = pgEnum("special_offer_type", [
  "flash_sale", // Молниеносная распродажа
  "limited_time", // Ограниченное время
  "personalized", // Персонализированная скидка
  "bundle", // Комплект товаров
  "free_shipping" // Бесплатная доставка
]);

// Special offer status enum
export const specialOfferStatusEnum = pgEnum("special_offer_status", [
  "draft",
  "active",
  "paused",
  "expired"
]);

// Banners table
export const banners = pgTable("banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: bannerTypeEnum("type").notNull(),
  title: jsonb("title"), // {ru: string, en: string, hy: string}
  content: jsonb("content"), // {ru: string, en: string, hy: string}
  imageUrl: varchar("image_url"),
  buttonText: jsonb("button_text"), // {ru: string, en: string, hy: string}
  buttonLink: varchar("button_link"),
  backgroundColor: varchar("background_color").default("#ffffff"),
  textColor: varchar("text_color").default("#000000"),
  position: varchar("position"), // top, bottom, left, right, center
  size: jsonb("size"), // {width: number, height: number}
  priority: integer("priority").default(0), // для сортировки
  isActive: boolean("is_active").default(false),
  status: bannerStatusEnum("status").default("draft"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  targetPages: text("target_pages").array(), // массив URL или паттернов
  targetUsers: varchar("target_users"), // all, logged_in, guests, specific_roles
  maxImpressions: integer("max_impressions"), // максимум показов
  maxClicks: integer("max_clicks"), // максимум кликов
  currentImpressions: integer("current_impressions").default(0),
  currentClicks: integer("current_clicks").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Banner analytics table
export const bannerAnalytics = pgTable("banner_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bannerId: varchar("banner_id").references(() => banners.id, { onDelete: 'cascade' }),
  eventType: varchar("event_type").notNull(), // impression, click, close
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  pageUrl: varchar("page_url"),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  metadata: jsonb("metadata"), // дополнительные данные
  createdAt: timestamp("created_at").defaultNow(),
});

// Popups table
export const popups = pgTable("popups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: popupTypeEnum("type").notNull(),
  title: jsonb("title"), // {ru: string, en: string, hy: string}
  content: jsonb("content"), // {ru: string, en: string, hy: string}
  imageUrl: varchar("image_url"),
  buttonText: jsonb("button_text"), // {ru: string, en: string, hy: string}
  buttonLink: varchar("button_link"),
  secondaryButtonText: jsonb("secondary_button_text"), // {ru: string, en: string, hy: string}
  secondaryButtonLink: varchar("secondary_button_link"),
  backgroundColor: varchar("background_color").default("#ffffff"),
  textColor: varchar("text_color").default("#000000"),
  size: jsonb("size"), // {width: number, height: number}
  priority: integer("priority").default(0),
  isActive: boolean("is_active").default(false),
  status: popupStatusEnum("status").default("draft"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  targetPages: text("target_pages").array(),
  targetUsers: varchar("target_users"), // all, logged_in, guests, specific_roles
  showDelay: integer("show_delay").default(0), // задержка показа в секундах
  showFrequency: varchar("show_frequency"), // once_per_session, once_per_day, always
  maxImpressions: integer("max_impressions"),
  maxClicks: integer("max_clicks"),
  currentImpressions: integer("current_impressions").default(0),
  currentClicks: integer("current_clicks").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Special offers table
export const specialOffers = pgTable("special_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: specialOfferTypeEnum("type").notNull(),
  title: jsonb("title"), // {ru: string, en: string, hy: string}
  description: jsonb("description"), // {ru: string, en: string, hy: string}
  imageUrl: varchar("image_url"),
  discountType: varchar("discount_type"), // percentage, fixed, free_shipping
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }),
  currencyId: varchar("currency_id").references(() => currencies.id),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  minOrderCurrencyId: varchar("min_order_currency_id").references(() => currencies.id),
  buttonText: jsonb("button_text"), // {ru: string, en: string, hy: string}
  buttonLink: varchar("button_link"),
  backgroundColor: varchar("background_color").default("#ffffff"),
  textColor: varchar("text_color").default("#000000"),
  priority: integer("priority").default(0),
  isActive: boolean("is_active").default(false),
  status: specialOfferStatusEnum("status").default("draft"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  targetProducts: text("target_products").array(), // массив ID товаров
  targetCategories: text("target_categories").array(), // массив ID категорий
  targetUsers: varchar("target_users"), // all, logged_in, guests, specific_roles
  maxUses: integer("max_uses"),
  currentUses: integer("current_uses").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Special offers table will be declared after popup/banner enums

// Currencies
export const currencies = pgTable("currencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: currencyEnum("code").notNull().unique(), // USD, RUB, AMD
  name: jsonb("name").$type<MLText>().notNull(), // {ru: "Доллар США", hy?: "Ամերիկյան դոլար", en?: "US Dollar"}
  symbol: varchar("symbol").notNull(), // $, ₽, ֏
  isBaseCurrency: boolean("is_base_currency").default(false), // одна валюта должна быть базовой
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Exchange Rates
export const exchangeRates = pgTable("exchange_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromCurrencyId: varchar("from_currency_id").references(() => currencies.id).notNull(),
  toCurrencyId: varchar("to_currency_id").references(() => currencies.id).notNull(),
  rate: decimal("rate", { precision: 15, scale: 8 }).notNull(), // точный курс обмена
  source: varchar("source"), // источник курса (manual, api, etc)
  isManual: boolean("is_manual").default(false), // ручное управление курсом
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  blogPosts: many(blogPosts),
  comments: many(comments),
  analyticsEvents: many(analyticsEvents),
  themes: many(userThemes),
  reviews: many(reviews),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  products: many(products),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "parentCategory",
  }),
  subcategories: many(categories, { relationName: "parentCategory" }),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  currency: one(currencies, {
    fields: [products.currencyId],
    references: [currencies.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  currency: one(currencies, {
    fields: [orders.currencyId],
    references: [currencies.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
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

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

export const bannersRelations = relations(banners, ({ many }) => ({
  analytics: many(bannerAnalytics),
}));

export const bannerAnalyticsRelations = relations(bannerAnalytics, ({ one }) => ({
  banner: one(banners, {
    fields: [bannerAnalytics.bannerId],
    references: [banners.id],
  }),
  user: one(users, {
    fields: [bannerAnalytics.userId],
    references: [users.id],
  }),
}));

export const currenciesRelations = relations(currencies, ({ many }) => ({
  products: many(products),
  orders: many(orders),
  promocodes: many(promocodes),
  exchangeRatesFrom: many(exchangeRates, { relationName: "fromCurrency" }),
  exchangeRatesTo: many(exchangeRates, { relationName: "toCurrency" }),
}));

export const exchangeRatesRelations = relations(exchangeRates, ({ one }) => ({
  fromCurrency: one(currencies, {
    fields: [exchangeRates.fromCurrencyId],
    references: [currencies.id],
    relationName: "fromCurrency",
  }),
  toCurrency: one(currencies, {
    fields: [exchangeRates.toCurrencyId],
    references: [currencies.id],
    relationName: "toCurrency",
  }),
}));

// Insert schemas
export const insertUserSchema = (createInsertSchema(users) as any).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
}) as any;

export const insertCurrencySchema = (createInsertSchema(currencies) as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}) as any;

export const insertExchangeRateSchema = (createInsertSchema(exchangeRates) as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}) as any;

export const insertCategorySchema = (createInsertSchema(categories) as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as any).extend({
  name: z.object({
    ru: z.string()
      .min(2, "Русское название должно содержать минимум 2 символа")
      .max(100, "Русское название не должно превышать 100 символов")
      .refine((val) => val.trim() !== "", "Русское название обязательно")
      .refine((val) => !/^[ds]+$/i.test(val.trim()), "Недопустимое название (только повторяющиеся символы)")
      .refine((val) => val.trim().length >= 2, "Название должно содержать значимый текст"),
    hy: z.string()
      .max(100, "Армянское название не должно превышать 100 символов")
      .refine((val) => !val || !/^[ds]+$/i.test(val.trim()), "Недопустимое название (только повторяющиеся символы)")
      .optional().or(z.literal("")),
    en: z.string()
      .max(100, "Английское название не должно превышать 100 символов")
      .refine((val) => !val || !/^[ds]+$/i.test(val.trim()), "Недопустимое название (только повторяющиеся символы)")
      .optional().or(z.literal(""))
  }),
  slug: z.string()
    .min(1, "URL slug обязателен")
    .max(100, "URL slug не должен превышать 100 символов")
    .refine((val) => /^[a-z0-9\-]+$/i.test(val), "URL slug может содержать только буквы, цифры и дефисы")
    .refine((val) => val !== "dsdsds", "Недопустимый URL slug")
    .optional(), // Позволяем пустой slug, он будет сгенерирован автоматически
  description: z.object({
    ru: z.string().max(500, "Русское описание не должно превышать 500 символов").optional().or(z.literal("")),
    hy: z.string().max(500, "Армянское описание не должно превышать 500 символов").optional().or(z.literal("")),
    en: z.string().max(500, "Английское описание не должно превышать 500 символов").optional().or(z.literal(""))
  }).optional(),
  translations: z.object({
    ru: z.object({
      name: z.string().min(2, "Русское название обязательно"),
      slug: z.string().min(1, "Русский slug обязателен"),
      description: z.string().optional().or(z.literal(""))
    }),
    hy: z.object({
      name: z.string().optional().or(z.literal("")),
      slug: z.string().optional().or(z.literal("")),
      description: z.string().optional().or(z.literal(""))
    }).optional(),
    en: z.object({
      name: z.string().optional().or(z.literal("")),
      slug: z.string().optional().or(z.literal("")),
      description: z.string().optional().or(z.literal(""))
    }).optional()
  }).optional(),
  parentId: z.string().nullable().optional(), // Allow null for root categories
  productIds: z.array(z.string()).optional() // Product assignment array for frontend form
});

export const insertProductSchema = (createInsertSchema(products) as any).omit({
  id: true,
  createdAt: true,
} as any).extend({
  categoryId: z.string().min(1, "Выберите категорию").optional(),
  price: z.union([z.string(), z.number()]).transform((val) => String(val)),
  originalPrice: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? null : String(val)).optional(),
  additionalSpreadPrice: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? null : String(val)).optional(),
  minCustomPrice: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? null : String(val)).optional(),
  costPrice: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "0" : String(val)).optional(),
  hashtags: z.object({
    ru: z.array(z.string()).optional(),
    hy: z.array(z.string()).optional(),
    en: z.array(z.string()).optional()
  }).optional(),
  images: z.array(z.string()).optional(),
  videoUrl: z.string().refine((val) => {
    // Разрешаем пустые значения или null
    if (!val || val === "") return true;
    // Разрешаем относительные пути (например, /uploads/video.mp4)
    if (val.startsWith("/")) return true;
    // Разрешаем полные URL
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, "Некорректный URL видео или путь к файлу").nullable().optional(),
  videos: z.array(z.string()).optional(),
  specialPages: z.array(z.enum(['graduation-albums', 'premium-gifts', 'one-day-books'])).optional(),
});

export const insertOrderSchema = (createInsertSchema(orders) as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}) as any;

export const insertOrderItemSchema = (createInsertSchema(orderItems) as any).omit({
  id: true,
  createdAt: true,
}) as any;

export const insertBlogCategorySchema = (createInsertSchema(blogCategories) as any).omit({
  id: true,
  createdAt: true,
}) as any;

export const insertBlogPostSchema = (createInsertSchema(blogPosts) as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}) as any;

export const insertCommentSchema = (createInsertSchema(comments) as any).omit({
  id: true,
  createdAt: true,
}) as any;

export const insertAnalyticsEventSchema = (createInsertSchema(analyticsEvents) as any).omit({
  id: true,
  createdAt: true,
}) as any;

export const insertSettingSchema = (createInsertSchema(settings) as any).omit({
  id: true,
  updatedAt: true,
}) as any;

export const insertPromocodeSchema = (createInsertSchema(promocodes) as any).omit({
  id: true,
  createdAt: true,
}) as any;

export const insertUserThemeSchema = (createInsertSchema(userThemes) as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}) as any;

export const insertReviewSchema = (createInsertSchema(reviews) as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as any).extend({
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, "Отзыв должен содержать минимум 10 символов"),
});

export const insertBannerSchema = (createInsertSchema(banners) as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentImpressions: true,
  currentClicks: true,
}) as any;

export const insertBannerAnalyticsSchema = (createInsertSchema(bannerAnalytics) as any).omit({
  id: true,
  createdAt: true,
}) as any;

export const insertPopupSchema = (createInsertSchema(popups) as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentImpressions: true,
  currentClicks: true,
}) as any;

export const insertSpecialOfferSchema = (createInsertSchema(specialOffers) as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentUses: true,
}) as any;

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Currency = typeof currencies.$inferSelect;
export type InsertCurrency = z.infer<typeof insertCurrencySchema>;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
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
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Banner = typeof banners.$inferSelect;
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type BannerAnalytics = typeof bannerAnalytics.$inferSelect;
export type InsertBannerAnalytics = z.infer<typeof insertBannerAnalyticsSchema>;
export type Popup = typeof popups.$inferSelect;
export type InsertPopup = z.infer<typeof insertPopupSchema>;
export type SpecialOffer = typeof specialOffers.$inferSelect;
export type InsertSpecialOffer = z.infer<typeof insertSpecialOfferSchema>;

// Photobook format types and constants
// moved to public.ts

// moved to public.ts

// moved to public.ts

// Helper function to calculate additional spread price (10% of base price)
// moved to public.ts

// Helper function to format size as string
// moved to public.ts

// Color theme definitions
// moved to public.ts

// Currency definitions and helpers
// moved to public.ts

// moved to public.ts

// Currency formatting helper
// moved to public.ts

// moved to public.ts

// Constructor Pages
export const pages = pgTable("pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: jsonb("title").notNull(), // {ru: string, en: string, hy: string}
  slug: varchar("slug").notNull().unique(),
  description: jsonb("description"), // {ru: string, en: string, hy: string}
  metaTitle: varchar("meta_title"),
  metaDescription: text("meta_description"),
  keywords: text("keywords"), // SEO keywords
  canonicalUrl: varchar("canonical_url"), // Canonical URL
  ogImage: varchar("og_image"), // Open Graph image
  twitterCard: varchar("twitter_card").default("summary_large_image"), // Twitter card type
  structuredData: jsonb("structured_data"), // JSON-LD structured data
  noindex: boolean("noindex").default(false), // Noindex flag
  language: varchar("language").default("ru"), // Page language
  isPublished: boolean("is_published").default(false),
  isHomepage: boolean("is_homepage").default(false),
  showInHeaderNav: boolean("show_in_header_nav").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Constructor Blocks
export const blocks = pgTable("blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageId: varchar("page_id").references(() => pages.id, { onDelete: 'cascade' }).notNull(),
  type: varchar("type").notNull(), // hero, text, image, gallery, contact, etc
  title: varchar("title"),
  content: jsonb("content"), // Block-specific content
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Site Pages (static sections like catalog/editor/blog/about/contacts)
export const sitePages = pgTable("site_pages", {
  key: varchar("key").primaryKey(),
  title: jsonb("title").notNull().default(sql`'{}'::jsonb`),
  description: jsonb("description").notNull().default(sql`'{}'::jsonb`),
  seoTitle: jsonb("seo_title").notNull().default(sql`'{}'::jsonb`),
  seoDescription: jsonb("seo_description").notNull().default(sql`'{}'::jsonb`),
  heroImageUrl: varchar("hero_image_url"),
  isPublished: boolean("is_published").notNull().default(true),
  showInHeaderNav: boolean("show_in_header_nav").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for constructor
export const insertPageSchema = (createInsertSchema(pages) as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}) as any;

export const insertBlockSchema = (createInsertSchema(blocks) as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}) as any;

// Site pages types and helpers
export const SITE_PAGE_KEYS = ["catalog", "editor", "blog", "about", "contacts"] as const;
export type SitePageKey = typeof SITE_PAGE_KEYS[number];

export type SitePage = typeof sitePages.$inferSelect;
export const updateSitePageSchema = z.object({
  title: z.record(z.string()).optional(),
  description: z.record(z.string()).optional(),
  seoTitle: z.record(z.string()).optional(),
  seoDescription: z.record(z.string()).optional(),
  heroImageUrl: z.string().url().nullable().optional(),
  isPublished: z.boolean().optional(),
  showInHeaderNav: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// Types for constructor
export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;
export type Block = typeof blocks.$inferSelect;
export type InsertBlock = z.infer<typeof insertBlockSchema>;

// Block type definitions
export const BLOCK_TYPES = [
  { value: "hero", label: "Герой-секция", description: "Большая верхняя секция с заголовком и CTA" },
  { value: "text", label: "Текстовый блок", description: "Простой текстовый контент" },
  { value: "image", label: "Изображение", description: "Одиночное изображение" },
  { value: "gallery", label: "Галерея", description: "Коллекция изображений" },
  { value: "categories", label: "Категории товаров", description: "Блок с категориями товаров для навигации" },
  { value: "contact", label: "Контактная форма", description: "Форма для связи" },
  { value: "features", label: "Особенности", description: "Список преимуществ" },
  { value: "testimonials", label: "Отзывы", description: "Блок с отзывами клиентов" },
  { value: "pricing", label: "Цены", description: "Таблица цен" },
  { value: "faq", label: "FAQ", description: "Часто задаваемые вопросы" },
  { value: "cta", label: "Призыв к действию", description: "Блок с кнопкой CTA" },
] as const;

export type BlockType = typeof BLOCK_TYPES[number]['value'];

// Default content templates for each block type
export const BLOCK_DEFAULT_CONTENT: Record<BlockType, any> = {
  hero: {
    title: "Заголовок героя",
    subtitle: "Подзаголовок героя",
    buttonText: "Начать",
    buttonLink: "/",
    backgroundImage: null,
  },
  text: {
    content: "Текст вашего контента...",
    alignment: "left",
  },
  image: {
    imageUrl: null,
    altText: "",
    caption: "",
    alignment: "center",
  },
  gallery: {
    images: [],
    columns: 3,
  },
  categories: {
    title: { ru: "Категории товаров", en: "Product Categories", hy: "Ապրանքների կատեգորիաներ" },
    categories: [
      {
        id: "1",
        name: { ru: "Фотокниги", en: "Photobooks", hy: "Ֆոտոգրքեր" },
        imageUrl: null,
        link: "/category/photobooks",
        description: { ru: "Создайте уникальную фотокнигу", en: "Create unique photobook", hy: "Ստեղծեք եզակի ֆոտոգիրք" }
      },
      {
        id: "2",
        name: { ru: "Фотоальбомы", en: "Photo Albums", hy: "Ֆոտոէլբոմներ" },
        imageUrl: null,
        link: "/category/albums",
        description: { ru: "Классические фотоальбомы", en: "Classic photo albums", hy: "Դասական ֆոտոէլբոմներ" }
      },
      {
        id: "3",
        name: { ru: "Квадратные альбомы", en: "Square Albums", hy: "Քառակուսի էլբոմներ" },
        imageUrl: null,
        link: "/category/square",
        description: { ru: "Современные квадратные форматы", en: "Modern square formats", hy: "Ժամանակակից քառակուսի ձևաչափեր" }
      }
    ],
    columns: 3,
    showDescription: true,
  },
  contact: {
    title: "Свяжитесь с нами",
    email: "",
    phone: "",
    address: "",
    formFields: ["name", "email", "message"],
  },
  features: {
    title: "Наши преимущества",
    items: [
      { title: "Преимущество 1", description: "Описание преимущества", icon: "star" },
      { title: "Преимущество 2", description: "Описание преимущества", icon: "star" },
      { title: "Преимущество 3", description: "Описание преимущества", icon: "star" },
    ],
  },
  testimonials: {
    title: "Отзывы клиентов",
    reviews: [],
  },
  pricing: {
    title: "Наши цены",
    plans: [
      { name: "Базовый", price: "1000", features: ["Функция 1", "Функция 2"] },
      { name: "Профессиональный", price: "2000", features: ["Все функции", "Поддержка"] },
    ],
  },
  faq: {
    title: "Часто задаваемые вопросы",
    items: [
      { question: "Вопрос 1?", answer: "Ответ на вопрос 1" },
      { question: "Вопрос 2?", answer: "Ответ на вопрос 2" },
    ],
  },
  cta: {
    title: "Готовы начать?",
    subtitle: "Присоединяйтесь к нам сегодня",
    buttonText: "Начать сейчас",
    buttonLink: "/contact",
  },
};

// Upload photo sessions table
export const uploadStatusEnum = pgEnum("upload_status", [
  "pending",
  "uploaded", 
  "processing",
  "completed",
  "deleted",
  "scheduled_for_deletion"
]);

export const uploads = pgTable("uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar("phone", { length: 20 }).notNull(),
  format: varchar("format", { length: 20 }).notNull(), // square, album, book
  size: varchar("size", { length: 20 }).notNull(), // 20x20, 25x25, etc
  pages: integer("pages").default(24),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  comment: text("comment"),
  files: jsonb("files").$type<UploadFile[]>().default(sql`'[]'::jsonb`),
  status: uploadStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).default(sql`NOW() + INTERVAL '48 hours'`),
  adminNotified: boolean("admin_notified").default(false),
  telegramSent: boolean("telegram_sent").default(false),
  zipGeneratedAt: timestamp("zip_generated_at", { withTimezone: true }),
  zipDownloadedAt: timestamp("zip_downloaded_at", { withTimezone: true }),
  totalFileSize: bigint("total_file_size", { mode: "number" }).default(0),
  fileCount: integer("file_count").default(0),
  // Lifecycle management
  deleteAfterDays: integer("delete_after_days").default(30),
  deleteAt: timestamp("delete_at", { withTimezone: true }),
  deletionNotifiedAt: timestamp("deletion_notified_at", { withTimezone: true }),
  adminHold: boolean("admin_hold").default(false),
  postponedUntil: timestamp("postponed_until", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Types
export interface UploadFile {
  key: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = typeof uploads.$inferInsert;

// AR Projects table
export const arProjectStatusEnum = pgEnum("ar_project_status", [
  "pending",      // Ожидает обработки
  "processing",   // Компилируется маркер
  "ready",        // Готов к просмотру
  "error",        // Ошибка компиляции
  "archived"      // Архивирован
]);

export const arProjects = pgTable("ar_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  orderId: varchar("order_id").references(() => orders.id), // Связь с заказом (опционально)
  
  // Файлы
  photoUrl: varchar("photo_url").notNull(), // Оригинальное фото (маркер)
  videoUrl: varchar("video_url").notNull(), // Видео для AR
  // (Admin only) Маска поверх видео (PNG/WebP с прозрачностью)
  maskUrl: varchar("mask_url"), // Относительный путь к маске (опционально)
  maskWidth: integer("mask_width"), // Ширина маски (px) для UI предпросмотра
  maskHeight: integer("mask_height"), // Высота маски (px) для UI предпросмотра
  
  // Маркер NFT файлы (AR.js)
  markerFsetUrl: varchar("marker_fset_url"), // .fset файл
  markerFset3Url: varchar("marker_fset3_url"), // .fset3 файл
  markerIsetUrl: varchar("marker_iset_url"), // .iset файл
  
  // Статус и метаданные
  status: arProjectStatusEnum("status").default("pending").notNull(),
  errorMessage: text("error_message"), // Сообщение об ошибке
  
  // AR viewer
  viewUrl: varchar("view_url"), // https://ar.photobooksgallery.am/view/{id}
  viewerHtmlUrl: varchar("viewer_html_url"), // Путь к HTML файлу viewer
  
  // QR-код
  qrCodeUrl: varchar("qr_code_url"), // URL сгенерированного QR-кода
  
  // Метрики качества
  markerQuality: decimal("marker_quality", { precision: 3, scale: 2 }), // 0.00-1.00
  keyPointsCount: integer("key_points_count"), // Количество ключевых точек
  
  // Конфигурация AR
  config: jsonb("config").$type<ARProjectConfig | null>(), // Настройки позиционирования видео

  // --- Автоматическое вычисление размеров и пропорций ---
  photoWidth: integer("photo_width"),          // Ширина исходного фото (px)
  photoHeight: integer("photo_height"),        // Высота исходного фото (px)
  videoWidth: integer("video_width"),          // Ширина видео (px)
  videoHeight: integer("video_height"),        // Высота видео (px)
  videoDurationMs: integer("video_duration_ms"), // Длительность видео (ms)
  photoAspectRatio: decimal("photo_aspect_ratio", { precision: 8, scale: 4 }), // w/h фото
  videoAspectRatio: decimal("video_aspect_ratio", { precision: 8, scale: 4 }), // w/h видео
  fitMode: varchar("fit_mode").default('contain'), // contain | cover | stretch (пока только contain)
  scaleWidth: decimal("scale_width", { precision: 8, scale: 4 }),   // Итоговая ширина плоскости в A-Frame единицах
  scaleHeight: decimal("scale_height", { precision: 8, scale: 4 }), // Итоговая высота плоскости в A-Frame единицах
  isCalibrated: boolean("is_calibrated").default(false), // Применена ли ручная калибровка админом
  calibratedPosX: decimal("calibrated_pos_x", { precision: 8, scale: 4 }), // Позиция после калибровки (если применена)
  calibratedPosY: decimal("calibrated_pos_y", { precision: 8, scale: 4 }),
  calibratedPosZ: decimal("calibrated_pos_z", { precision: 8, scale: 4 }),
  
  // Время компиляции
  compilationStartedAt: timestamp("compilation_started_at"),
  compilationFinishedAt: timestamp("compilation_finished_at"),
  compilationTimeMs: integer("compilation_time_ms"), // Время компиляции в мс
  
  // Email уведомления
  notificationSent: boolean("notification_sent").default(false),
  notificationSentAt: timestamp("notification_sent_at"),
  
  // Product relation (for pricing and cart integration)
  productId: varchar("product_id").references(() => products.id), // Связь с продуктом (UUID)
  attachedToOrder: boolean("attached_to_order").default(false), // Прикреплён ли к заказу
  arPrice: decimal("ar_price", { precision: 10, scale: 2 }).default("500.00"), // Цена AR в AMD
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_ar_projects_user_id").on(table.userId),
  index("IDX_ar_projects_order_id").on(table.orderId),
  index("IDX_ar_projects_status").on(table.status),
  index("IDX_ar_projects_created_at").on(table.createdAt),
  index("IDX_ar_projects_product_id").on(table.productId), // NEW index
]);

// AR Project Configuration type
export interface ARProjectConfig {
  videoPosition?: { x: number; y: number; z: number };
  videoRotation?: { x: number; y: number; z: number };
  videoScale?: { width: number; height: number };
  videoOpacity?: number;
  autoPlay?: boolean;
  loop?: boolean;
  fitMode?: 'contain' | 'cover' | 'stretch';
}

export type ARProject = typeof arProjects.$inferSelect;
export type InsertARProject = typeof arProjects.$inferInsert;

export const insertARProjectSchema = createInsertSchema(arProjects).extend({
  photoUrl: z.string().url().min(1),
  videoUrl: z.string().url().min(1),
  config: z.object({
    videoPosition: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
    videoRotation: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
    videoScale: z.object({ width: z.number(), height: z.number() }).optional(),
    videoOpacity: z.number().min(0).max(1).optional(),
    autoPlay: z.boolean().optional(),
    loop: z.boolean().optional(),
  }).optional().nullable(),
});

/**
 * AR Project Items (Multi-Photo Support)
 * Каждый проект может содержать до 100 "живых фото" (фото-маркер + видео + маска + калибровка)
 */
export const arProjectItems = pgTable("ar_project_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => arProjects.id, { onDelete: 'cascade' }).notNull(),
  
  // Порядковый номер в проекте (используется как targetIndex в MindAR)
  targetIndex: integer("target_index").notNull(), // 0, 1, 2... (max 99)
  
  // Название слота (для удобства админа)
  name: varchar("name").notNull().default("Живое фото"), // "Фотография", "Фото 2"...
  
  // Файлы
  photoUrl: varchar("photo_url").notNull(), // Фото-маркер
  videoUrl: varchar("video_url").notNull(), // Видео
  maskUrl: varchar("mask_url"), // Маска (опционально)
  
  // Метаданные (копируются из основной таблицы для каждого слота)
  photoWidth: integer("photo_width"),
  photoHeight: integer("photo_height"),
  videoWidth: integer("video_width"),
  videoHeight: integer("video_height"),
  videoDurationMs: integer("video_duration_ms"),
  photoAspectRatio: decimal("photo_aspect_ratio", { precision: 8, scale: 4 }),
  videoAspectRatio: decimal("video_aspect_ratio", { precision: 8, scale: 4 }),
  
  // Калибровка для этого конкретного слота
  config: jsonb("config").$type<ARProjectConfig | null>(),
  fitMode: varchar("fit_mode").default('contain'),
  scaleWidth: decimal("scale_width", { precision: 8, scale: 4 }),
  scaleHeight: decimal("scale_height", { precision: 8, scale: 4 }),
  
  // Скомпилирован ли маркер для этого слота
  markerCompiled: boolean("marker_compiled").default(false),
  markerQuality: decimal("marker_quality", { precision: 3, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_ar_items_project_id").on(table.projectId),
  index("IDX_ar_items_target_index").on(table.targetIndex),
]);

export type ARProjectItem = typeof arProjectItems.$inferSelect;
export type InsertARProjectItem = typeof arProjectItems.$inferInsert;

export const insertARProjectItemSchema = createInsertSchema(arProjectItems).extend({
  photoUrl: z.string().min(1),
  videoUrl: z.string().min(1),
  name: z.string().min(1).max(100),
  targetIndex: z.number().int().min(0).max(99),
  config: z.object({
    videoPosition: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
    videoRotation: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
    videoScale: z.object({ width: z.number(), height: z.number() }).optional(),
    videoOpacity: z.number().min(0).max(1).optional(),
    autoPlay: z.boolean().optional(),
    loop: z.boolean().optional(),
  }).optional().nullable(),
});
