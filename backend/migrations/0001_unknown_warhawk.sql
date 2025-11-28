CREATE TYPE "public"."ar_project_status" AS ENUM('pending', 'processing', 'ready', 'error', 'archived');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('pending', 'uploaded', 'processing', 'completed', 'deleted', 'scheduled_for_deletion');--> statement-breakpoint
CREATE TABLE "ar_project_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"target_index" integer NOT NULL,
	"name" varchar DEFAULT 'Живое фото' NOT NULL,
	"photo_url" varchar NOT NULL,
	"video_url" varchar NOT NULL,
	"mask_url" varchar,
	"photo_width" integer,
	"photo_height" integer,
	"video_width" integer,
	"video_height" integer,
	"video_duration_ms" integer,
	"photo_aspect_ratio" numeric(8, 4),
	"video_aspect_ratio" numeric(8, 4),
	"config" jsonb,
	"fit_mode" varchar DEFAULT 'contain',
	"scale_width" numeric(8, 4),
	"scale_height" numeric(8, 4),
	"marker_compiled" boolean DEFAULT false,
	"marker_quality" numeric(3, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ar_projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"order_id" varchar,
	"photo_url" varchar NOT NULL,
	"video_url" varchar NOT NULL,
	"mask_url" varchar,
	"mask_width" integer,
	"mask_height" integer,
	"marker_fset_url" varchar,
	"marker_fset3_url" varchar,
	"marker_iset_url" varchar,
	"status" "ar_project_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"view_url" varchar,
	"viewer_html_url" varchar,
	"qr_code_url" varchar,
	"marker_quality" numeric(3, 2),
	"key_points_count" integer,
	"config" jsonb,
	"photo_width" integer,
	"photo_height" integer,
	"video_width" integer,
	"video_height" integer,
	"video_duration_ms" integer,
	"photo_aspect_ratio" numeric(8, 4),
	"video_aspect_ratio" numeric(8, 4),
	"fit_mode" varchar DEFAULT 'contain',
	"scale_width" numeric(8, 4),
	"scale_height" numeric(8, 4),
	"is_calibrated" boolean DEFAULT false,
	"calibrated_pos_x" numeric(8, 4),
	"calibrated_pos_y" numeric(8, 4),
	"calibrated_pos_z" numeric(8, 4),
	"compilation_started_at" timestamp,
	"compilation_finished_at" timestamp,
	"compilation_time_ms" integer,
	"notification_sent" boolean DEFAULT false,
	"notification_sent_at" timestamp,
	"product_id" varchar,
	"attached_to_order" boolean DEFAULT false,
	"ar_price" numeric(10, 2) DEFAULT '500.00',
	"is_demo" boolean DEFAULT false,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "change_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"entity_type" varchar NOT NULL,
	"entity_ids" jsonb NOT NULL,
	"action" varchar NOT NULL,
	"details" jsonb,
	"ip_address" varchar,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"product_id" varchar,
	"product_name" varchar NOT NULL,
	"product_image_url" varchar,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"options" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"format" varchar(20) NOT NULL,
	"size" varchar(20) NOT NULL,
	"pages" integer DEFAULT 24,
	"price" numeric(10, 2) NOT NULL,
	"comment" text,
	"files" jsonb DEFAULT '[]'::jsonb,
	"status" "upload_status" DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone DEFAULT NOW() + INTERVAL '48 hours',
	"admin_notified" boolean DEFAULT false,
	"telegram_sent" boolean DEFAULT false,
	"zip_generated_at" timestamp with time zone,
	"zip_downloaded_at" timestamp with time zone,
	"total_file_size" bigint DEFAULT 0,
	"file_count" integer DEFAULT 0,
	"delete_after_days" integer DEFAULT 30,
	"delete_at" timestamp with time zone,
	"deletion_notified_at" timestamp with time zone,
	"admin_hold" boolean DEFAULT false,
	"postponed_until" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "translations" jsonb;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "parent_id" varchar;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "cover_image" varchar;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "banner_image" varchar;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "order" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "hashtags" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "subcategory_id" varchar;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_ready_made" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "ar_project_items" ADD CONSTRAINT "ar_project_items_project_id_ar_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ar_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_projects" ADD CONSTRAINT "ar_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_projects" ADD CONSTRAINT "ar_projects_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_projects" ADD CONSTRAINT "ar_projects_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_logs" ADD CONSTRAINT "change_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_ar_items_project_id" ON "ar_project_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "IDX_ar_items_target_index" ON "ar_project_items" USING btree ("target_index");--> statement-breakpoint
CREATE INDEX "IDX_ar_projects_user_id" ON "ar_projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_ar_projects_order_id" ON "ar_projects" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "IDX_ar_projects_status" ON "ar_projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_ar_projects_created_at" ON "ar_projects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_ar_projects_product_id" ON "ar_projects" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "IDX_change_logs_entity_type" ON "change_logs" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "IDX_change_logs_created_at" ON "change_logs" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_subcategory_id_categories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_categories_parent_id" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "IDX_categories_slug" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "IDX_categories_active" ON "categories" USING btree ("is_active");