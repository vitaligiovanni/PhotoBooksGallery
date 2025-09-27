CREATE TYPE "public"."blog_status" AS ENUM('draft', 'published', 'scheduled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('USD', 'RUB', 'AMD');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."photobook_format" AS ENUM('album', 'book', 'square');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar NOT NULL,
	"entity_type" varchar,
	"entity_id" varchar,
	"user_id" varchar,
	"session_id" varchar,
	"metadata" jsonb,
	"user_agent" text,
	"ip_address" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"title" varchar,
	"content" jsonb,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blog_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" jsonb NOT NULL,
	"slug" varchar NOT NULL,
	"description" jsonb,
	"color" varchar DEFAULT '#6366f1',
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "blog_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" jsonb NOT NULL,
	"slug" varchar NOT NULL,
	"excerpt" jsonb,
	"content" jsonb NOT NULL,
	"featured_image" varchar,
	"author_id" varchar,
	"category_id" varchar,
	"status" "blog_status" DEFAULT 'draft',
	"published_at" timestamp,
	"seo_title" jsonb,
	"seo_description" jsonb,
	"tags" text[],
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" jsonb NOT NULL,
	"slug" varchar NOT NULL,
	"description" jsonb,
	"image_url" varchar,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar,
	"user_id" varchar,
	"author_name" varchar NOT NULL,
	"author_email" varchar NOT NULL,
	"content" text NOT NULL,
	"is_approved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "currency" NOT NULL,
	"name" jsonb NOT NULL,
	"symbol" varchar NOT NULL,
	"is_base_currency" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency_id" varchar NOT NULL,
	"to_currency_id" varchar NOT NULL,
	"rate" numeric(15, 8) NOT NULL,
	"source" varchar,
	"is_manual" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"customer_name" varchar NOT NULL,
	"customer_email" varchar NOT NULL,
	"customer_phone" varchar,
	"shipping_address" text NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"currency_id" varchar,
	"exchange_rate" numeric(15, 8),
	"status" "order_status" DEFAULT 'pending',
	"items" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"description" text,
	"meta_title" varchar,
	"meta_description" text,
	"is_published" boolean DEFAULT false,
	"is_homepage" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"price" numeric(10, 2) NOT NULL,
	"currency_id" varchar,
	"original_price" numeric(10, 2),
	"discount_percentage" integer DEFAULT 0,
	"in_stock" boolean DEFAULT true,
	"stock_quantity" integer DEFAULT 0,
	"is_on_sale" boolean DEFAULT false,
	"image_url" varchar,
	"images" text[],
	"category_id" varchar,
	"options" jsonb,
	"photobook_format" varchar,
	"photobook_size" varchar,
	"min_spreads" integer DEFAULT 10,
	"additional_spread_price" numeric(10, 2),
	"additional_spread_currency_id" varchar,
	"paper_type" varchar,
	"cover_material" varchar,
	"binding_type" varchar,
	"production_time" integer DEFAULT 7,
	"shipping_time" integer DEFAULT 3,
	"weight" numeric(5, 2),
	"allow_customization" boolean DEFAULT true,
	"min_custom_price" numeric(10, 2),
	"min_custom_price_currency_id" varchar,
	"cost_price" numeric(10, 2) DEFAULT '0',
	"cost_currency_id" varchar,
	"material_costs" numeric(10, 2) DEFAULT '0',
	"labor_costs" numeric(10, 2) DEFAULT '0',
	"overhead_costs" numeric(10, 2) DEFAULT '0',
	"shipping_costs" numeric(10, 2) DEFAULT '0',
	"other_costs" numeric(10, 2) DEFAULT '0',
	"expected_profit_margin" numeric(5, 2) DEFAULT '30',
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promocodes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar NOT NULL,
	"name" varchar NOT NULL,
	"discount_type" varchar NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"currency_id" varchar,
	"min_order_amount" numeric(10, 2),
	"min_order_currency_id" varchar,
	"max_uses" integer,
	"used_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "promocodes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"product_id" varchar,
	"author_name" varchar NOT NULL,
	"author_email" varchar,
	"profile_photo" varchar,
	"gender" varchar,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"status" "review_status" DEFAULT 'pending',
	"is_promoted" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar NOT NULL,
	"description" text,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "user_themes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"theme_name" varchar NOT NULL,
	"custom_colors" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'user',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_from_currency_id_currencies_id_fk" FOREIGN KEY ("from_currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_to_currency_id_currencies_id_fk" FOREIGN KEY ("to_currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_additional_spread_currency_id_currencies_id_fk" FOREIGN KEY ("additional_spread_currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_min_custom_price_currency_id_currencies_id_fk" FOREIGN KEY ("min_custom_price_currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_cost_currency_id_currencies_id_fk" FOREIGN KEY ("cost_currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocodes" ADD CONSTRAINT "promocodes_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocodes" ADD CONSTRAINT "promocodes_min_order_currency_id_currencies_id_fk" FOREIGN KEY ("min_order_currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_themes" ADD CONSTRAINT "user_themes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");