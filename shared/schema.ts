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
  minCustomPriceCurrencyId: varchar("min_custom_price_currency_id").references(() => currencies.id), // валюта мин. цены
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

// Currencies
export const currencies = pgTable("currencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: currencyEnum("code").notNull().unique(), // USD, RUB, AMD
  name: jsonb("name").notNull(), // {ru: "Доллар США", hy: "Ամերիկյան դոլար", en: "US Dollar"}
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

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
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

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  currency: one(currencies, {
    fields: [orders.currencyId],
    references: [currencies.id],
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
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertCurrencySchema = createInsertSchema(currencies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = z.object({
  name: z.record(z.string()),
  description: z.record(z.string()).optional(),
  price: z.union([z.string(), z.number()]).transform((val) => String(val)),
  currencyId: z.string().optional(),
  originalPrice: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? null : String(val)).optional(),
  discountPercentage: z.number().optional(),
  inStock: z.boolean().optional(),
  stockQuantity: z.number().optional(),
  isOnSale: z.boolean().optional(),
  imageUrl: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  categoryId: z.string().min(1, "Выберите категорию"),
  options: z.record(z.any()).optional(),
  photobookFormat: z.string().nullable().optional(),
  photobookSize: z.string().nullable().optional(),
  minSpreads: z.number().optional(),
  additionalSpreadPrice: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? null : String(val)).optional(),
  additionalSpreadCurrencyId: z.string().nullable().optional(),
  paperType: z.string().nullable().optional(),
  coverMaterial: z.string().nullable().optional(),
  bindingType: z.string().nullable().optional(),
  productionTime: z.number().optional(),
  shippingTime: z.number().optional(),
  weight: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? null : String(val)).optional(),
  allowCustomization: z.boolean().optional(),
  minCustomPrice: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? null : String(val)).optional(),
  minCustomPriceCurrencyId: z.string().optional(),
  costPrice: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "0" : String(val)).optional(),
  costCurrencyId: z.string().optional(),
  materialCosts: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "0" : String(val)).optional(),
  laborCosts: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "0" : String(val)).optional(),
  overheadCosts: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "0" : String(val)).optional(),
  shippingCosts: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "0" : String(val)).optional(),
  otherCosts: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "0" : String(val)).optional(),
  expectedProfitMargin: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => val == null ? "30" : String(val)).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
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

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, "Отзыв должен содержать минимум 10 символов"),
});

export const insertBannerSchema = createInsertSchema(banners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentImpressions: true,
  currentClicks: true,
});

export const insertBannerAnalyticsSchema = createInsertSchema(bannerAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertPopupSchema = createInsertSchema(popups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentImpressions: true,
  currentClicks: true,
});

export const insertSpecialOfferSchema = createInsertSchema(specialOffers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentUses: true,
});

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

// Currency definitions and helpers
export const SUPPORTED_CURRENCIES = [
  {
    code: 'AMD' as const,
    name: { ru: 'Армянский драм', hy: 'Հայկական դրամ', en: 'Armenian Dram' },
    symbol: '֏',
    isBaseCurrency: true,
    sortOrder: 1,
  },
  {
    code: 'USD' as const,
    name: { ru: 'Доллар США', hy: 'ԱՄՆ դոլար', en: 'US Dollar' },
    symbol: '$',
    isBaseCurrency: false,
    sortOrder: 2,
  },
  {
    code: 'RUB' as const,
    name: { ru: 'Российский рубль', hy: 'Ռուսական ռուբլի', en: 'Russian Ruble' },
    symbol: '₽',
    isBaseCurrency: false,
    sortOrder: 3,
  },
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]['code'];

// Currency formatting helper
export const formatCurrency = (amount: number | string, currencyCode: SupportedCurrency, locale: string = 'en'): string => {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  if (!currency) return `${amount}`;
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `${amount}`;
  
  // Format with proper decimal places and symbol
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: currencyCode === 'USD' ? 2 : 0,
    maximumFractionDigits: currencyCode === 'USD' ? 2 : 0,
  }).format(numAmount);
  
  return `${formatted} ${currency.symbol}`;
};

export const BUILT_IN_THEMES: Record<string, ColorTheme> = {
  default: {
    name: "default",
    label: "По умолчанию",
    description: "Стандартная цветовая схема PhotoBooksGallery",
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
  premium: {
    name: "premium",
    label: "Премиум",
    description: "Editorial: ivory, graphite, gold",
    colors: {
      primary: "#1C1C1C",
      secondary: "#153E35",
      accent: "#C9A227",
      background: "#F6F3EE",
      surface: "#FFFFFF",
      text: "#1C1C1C",
      textMuted: "#8C8C8C",
      border: "#E6E1D9",
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
export const insertPageSchema = createInsertSchema(pages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlockSchema = createInsertSchema(blocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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
