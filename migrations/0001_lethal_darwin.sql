CREATE TYPE "public"."banner_status" AS ENUM('draft', 'active', 'paused', 'expired');--> statement-breakpoint
CREATE TYPE "public"."banner_type" AS ENUM('header', 'fullscreen', 'sidebar', 'inline', 'popup');--> statement-breakpoint
CREATE TYPE "public"."popup_status" AS ENUM('draft', 'active', 'paused', 'expired');--> statement-breakpoint
CREATE TYPE "public"."popup_type" AS ENUM('welcome', 'exit_intent', 'newsletter', 'special_offer', 'cart_abandonment');--> statement-breakpoint
CREATE TYPE "public"."special_offer_status" AS ENUM('draft', 'active', 'paused', 'expired');--> statement-breakpoint
CREATE TYPE "public"."special_offer_type" AS ENUM('flash_sale', 'limited_time', 'personalized', 'bundle', 'free_shipping');--> statement-breakpoint
CREATE TABLE "banner_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"banner_id" varchar,
	"event_type" varchar NOT NULL,
	"user_id" varchar,
	"session_id" varchar,
	"page_url" varchar,
	"user_agent" text,
	"ip_address" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"type" "banner_type" NOT NULL,
	"title" jsonb,
	"content" jsonb,
	"image_url" varchar,
	"button_text" jsonb,
	"button_link" varchar,
	"background_color" varchar DEFAULT '#ffffff',
	"text_color" varchar DEFAULT '#000000',
	"position" varchar,
	"size" jsonb,
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT false,
	"status" "banner_status" DEFAULT 'draft',
	"start_date" timestamp,
	"end_date" timestamp,
	"target_pages" text[],
	"target_users" varchar,
	"max_impressions" integer,
	"max_clicks" integer,
	"current_impressions" integer DEFAULT 0,
	"current_clicks" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "popups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"type" "popup_type" NOT NULL,
	"title" jsonb,
	"content" jsonb,
	"image_url" varchar,
	"button_text" jsonb,
	"button_link" varchar,
	"secondary_button_text" jsonb,
	"secondary_button_link" varchar,
	"background_color" varchar DEFAULT '#ffffff',
	"text_color" varchar DEFAULT '#000000',
	"size" jsonb,
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT false,
	"status" "popup_status" DEFAULT 'draft',
	"start_date" timestamp,
	"end_date" timestamp,
	"target_pages" text[],
	"target_users" varchar,
	"show_delay" integer DEFAULT 0,
	"show_frequency" varchar,
	"max_impressions" integer,
	"max_clicks" integer,
	"current_impressions" integer DEFAULT 0,
	"current_clicks" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "special_offers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"type" "special_offer_type" NOT NULL,
	"title" jsonb,
	"description" jsonb,
	"image_url" varchar,
	"discount_type" varchar,
	"discount_value" numeric(10, 2),
	"currency_id" varchar,
	"min_order_amount" numeric(10, 2),
	"min_order_currency_id" varchar,
	"button_text" jsonb,
	"button_link" varchar,
	"background_color" varchar DEFAULT '#ffffff',
	"text_color" varchar DEFAULT '#000000',
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT false,
	"status" "special_offer_status" DEFAULT 'draft',
	"start_date" timestamp,
	"end_date" timestamp,
	"target_products" text[],
	"target_categories" text[],
	"target_users" varchar,
	"max_uses" integer,
	"current_uses" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "pages" ALTER COLUMN "title" SET DATA TYPE jsonb USING title::jsonb;--> statement-breakpoint
ALTER TABLE "pages" ALTER COLUMN "description" SET DATA TYPE jsonb USING description::jsonb;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "keywords" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "canonical_url" varchar;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "og_image" varchar;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "twitter_card" varchar DEFAULT 'summary_large_image';--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "structured_data" jsonb;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "noindex" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "language" varchar DEFAULT 'ru';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "video_url" varchar;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "videos" text[];--> statement-breakpoint
ALTER TABLE "banner_analytics" ADD CONSTRAINT "banner_analytics_banner_id_banners_id_fk" FOREIGN KEY ("banner_id") REFERENCES "public"."banners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banner_analytics" ADD CONSTRAINT "banner_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_offers" ADD CONSTRAINT "special_offers_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_offers" ADD CONSTRAINT "special_offers_min_order_currency_id_currencies_id_fk" FOREIGN KEY ("min_order_currency_id") REFERENCES "public"."currencies"("id") ON DELETE no action ON UPDATE no action;