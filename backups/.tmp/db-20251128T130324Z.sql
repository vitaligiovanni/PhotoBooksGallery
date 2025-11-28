--
-- PostgreSQL database dump
--

\restrict AEhB6HFIcEiFu7BkuFyKUJovEdRWccFAge8AZaiE01ngyaD960BkV5ennvVKieF

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: ar_project_status; Type: TYPE; Schema: public; Owner: photobooks
--

CREATE TYPE public.ar_project_status AS ENUM (
    'pending',
    'processing',
    'ready',
    'error',
    'archived'
);


ALTER TYPE public.ar_project_status OWNER TO photobooks;

--
-- Name: banner_status; Type: TYPE; Schema: public; Owner: photobooks
--

CREATE TYPE public.banner_status AS ENUM (
    'draft',
    'active',
    'paused',
    'expired'
);


ALTER TYPE public.banner_status OWNER TO photobooks;

--
-- Name: banner_type; Type: TYPE; Schema: public; Owner: photobooks
--

CREATE TYPE public.banner_type AS ENUM (
    'header',
    'fullscreen',
    'sidebar',
    'inline',
    'popup'
);


ALTER TYPE public.banner_type OWNER TO photobooks;

--
-- Name: blog_status; Type: TYPE; Schema: public; Owner: photobooks
--

CREATE TYPE public.blog_status AS ENUM (
    'draft',
    'published',
    'scheduled',
    'archived'
);


ALTER TYPE public.blog_status OWNER TO photobooks;

--
-- Name: currency; Type: TYPE; Schema: public; Owner: photobooks
--

CREATE TYPE public.currency AS ENUM (
    'USD',
    'RUB',
    'AMD'
);


ALTER TYPE public.currency OWNER TO photobooks;

--
-- Name: order_status; Type: TYPE; Schema: public; Owner: photobooks
--

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
);


ALTER TYPE public.order_status OWNER TO photobooks;

--
-- Name: photobook_format; Type: TYPE; Schema: public; Owner: photobooks
--

CREATE TYPE public.photobook_format AS ENUM (
    'album',
    'book',
    'square'
);


ALTER TYPE public.photobook_format OWNER TO photobooks;

--
-- Name: popup_status; Type: TYPE; Schema: public; Owner: photobooks
--

CREATE TYPE public.popup_status AS ENUM (
    'draft',
    'active',
    'paused',
    'expired'
);


ALTER TYPE public.popup_status OWNER TO photobooks;

--
-- Name: popup_type; Type: TYPE; Schema: public; Owner: photobooks
--

CREATE TYPE public.popup_type AS ENUM (
    'welcome',
    'exit_intent',
    'newsletter',
    'special_offer',
    'cart_abandonment'
);


ALTER TYPE public.popup_type OWNER TO photobooks;

--
-- Name: review_status; Type: TYPE; Schema: public; Owner: photobooks
--

CREATE TYPE public.review_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.review_status OWNER TO photobooks;

--
-- Name: special_offer_status; Type: TYPE; Schema: public; Owner: photobooks
--

CREATE TYPE public.special_offer_status AS ENUM (
    'draft',
    'active',
    'paused',
    'expired'
);


ALTER TYPE public.special_offer_status OWNER TO photobooks;

--
-- Name: special_offer_type; Type: TYPE; Schema: public; Owner: photobooks
--

CREATE TYPE public.special_offer_type AS ENUM (
    'flash_sale',
    'limited_time',
    'personalized',
    'bundle',
    'free_shipping'
);


ALTER TYPE public.special_offer_type OWNER TO photobooks;

--
-- Name: upload_status; Type: TYPE; Schema: public; Owner: photobooks
--

CREATE TYPE public.upload_status AS ENUM (
    'pending',
    'uploaded',
    'processing',
    'completed',
    'deleted',
    'scheduled_for_deletion'
);


ALTER TYPE public.upload_status OWNER TO photobooks;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.analytics_events (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying NOT NULL,
    entity_type character varying,
    entity_id character varying,
    user_id character varying,
    session_id character varying,
    metadata jsonb,
    user_agent text,
    ip_address character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.analytics_events OWNER TO photobooks;

--
-- Name: ar_project_items; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.ar_project_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    target_index integer NOT NULL,
    name character varying DEFAULT 'Живое фото'::character varying NOT NULL,
    photo_url character varying NOT NULL,
    video_url character varying NOT NULL,
    mask_url character varying,
    photo_width integer,
    photo_height integer,
    video_width integer,
    video_height integer,
    video_duration_ms integer,
    photo_aspect_ratio numeric(8,4),
    video_aspect_ratio numeric(8,4),
    config jsonb,
    fit_mode character varying DEFAULT 'contain'::character varying,
    scale_width numeric(8,4),
    scale_height numeric(8,4),
    marker_compiled boolean DEFAULT false,
    marker_quality numeric(3,2),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ar_project_items OWNER TO photobooks;

--
-- Name: ar_projects; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.ar_projects (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    order_id character varying,
    photo_url character varying NOT NULL,
    video_url character varying NOT NULL,
    marker_fset_url character varying,
    marker_fset3_url character varying,
    marker_iset_url character varying,
    status public.ar_project_status DEFAULT 'pending'::public.ar_project_status NOT NULL,
    error_message text,
    view_url character varying,
    viewer_html_url character varying,
    qr_code_url character varying,
    marker_quality numeric(3,2),
    key_points_count integer,
    config jsonb,
    compilation_started_at timestamp without time zone,
    compilation_finished_at timestamp without time zone,
    compilation_time_ms integer,
    notification_sent boolean DEFAULT false,
    notification_sent_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    photo_width integer,
    photo_height integer,
    video_width integer,
    video_height integer,
    video_duration_ms integer,
    photo_aspect_ratio numeric(8,4),
    video_aspect_ratio numeric(8,4),
    fit_mode character varying DEFAULT 'contain'::character varying,
    scale_width numeric(8,4),
    scale_height numeric(8,4),
    is_calibrated boolean DEFAULT false,
    calibrated_pos_x numeric(8,4),
    calibrated_pos_y numeric(8,4),
    calibrated_pos_z numeric(8,4),
    mask_url character varying,
    mask_width integer,
    mask_height integer,
    attached_to_order boolean DEFAULT false,
    ar_price numeric(10,2) DEFAULT 500.00,
    product_id character varying,
    is_demo boolean DEFAULT false,
    expires_at timestamp without time zone
);


ALTER TABLE public.ar_projects OWNER TO photobooks;

--
-- Name: COLUMN ar_projects.attached_to_order; Type: COMMENT; Schema: public; Owner: photobooks
--

COMMENT ON COLUMN public.ar_projects.attached_to_order IS 'True if this AR is included in a customer order';


--
-- Name: COLUMN ar_projects.ar_price; Type: COMMENT; Schema: public; Owner: photobooks
--

COMMENT ON COLUMN public.ar_projects.ar_price IS 'Price for AR feature in AMD (default 500)';


--
-- Name: COLUMN ar_projects.product_id; Type: COMMENT; Schema: public; Owner: photobooks
--

COMMENT ON COLUMN public.ar_projects.product_id IS 'Link to product (photobook, calendar, etc.) that this AR enhances';


--
-- Name: COLUMN ar_projects.is_demo; Type: COMMENT; Schema: public; Owner: photobooks
--

COMMENT ON COLUMN public.ar_projects.is_demo IS 'Temporary demo project (auto-deleted after expiration)';


--
-- Name: COLUMN ar_projects.expires_at; Type: COMMENT; Schema: public; Owner: photobooks
--

COMMENT ON COLUMN public.ar_projects.expires_at IS 'Expiration timestamp for demo projects (24h default)';


--
-- Name: banner_analytics; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.banner_analytics (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    banner_id character varying,
    event_type character varying NOT NULL,
    user_id character varying,
    session_id character varying,
    page_url character varying,
    user_agent text,
    ip_address character varying,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.banner_analytics OWNER TO photobooks;

--
-- Name: banners; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.banners (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    type public.banner_type NOT NULL,
    title jsonb,
    content jsonb,
    image_url character varying,
    button_text jsonb,
    button_link character varying,
    background_color character varying DEFAULT '#ffffff'::character varying,
    text_color character varying DEFAULT '#000000'::character varying,
    "position" character varying,
    size jsonb,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT false,
    status public.banner_status DEFAULT 'draft'::public.banner_status,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    target_pages text[],
    target_users character varying,
    max_impressions integer,
    max_clicks integer,
    current_impressions integer DEFAULT 0,
    current_clicks integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.banners OWNER TO photobooks;

--
-- Name: blocks; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.blocks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    page_id character varying NOT NULL,
    type character varying NOT NULL,
    title character varying,
    content jsonb,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.blocks OWNER TO photobooks;

--
-- Name: blog_categories; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.blog_categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name jsonb NOT NULL,
    slug character varying NOT NULL,
    description jsonb,
    color character varying DEFAULT '#6366f1'::character varying,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.blog_categories OWNER TO photobooks;

--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.blog_posts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title jsonb NOT NULL,
    slug character varying NOT NULL,
    excerpt jsonb,
    content jsonb NOT NULL,
    featured_image character varying,
    author_id character varying,
    category_id character varying,
    status public.blog_status DEFAULT 'draft'::public.blog_status,
    published_at timestamp without time zone,
    seo_title jsonb,
    seo_description jsonb,
    tags text[],
    view_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.blog_posts OWNER TO photobooks;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name jsonb NOT NULL,
    slug character varying NOT NULL,
    description jsonb,
    image_url character varying,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    translations jsonb,
    parent_id character varying,
    is_active boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT now(),
    cover_image character varying,
    banner_image character varying,
    "order" integer DEFAULT 1
);


ALTER TABLE public.categories OWNER TO photobooks;

--
-- Name: COLUMN categories.translations; Type: COMMENT; Schema: public; Owner: photobooks
--

COMMENT ON COLUMN public.categories.translations IS 'Multi-language support: {ru: {name, slug, description}, hy: {...}, en: {...}}';


--
-- Name: COLUMN categories.parent_id; Type: COMMENT; Schema: public; Owner: photobooks
--

COMMENT ON COLUMN public.categories.parent_id IS 'Self-referencing foreign key for category hierarchy';


--
-- Name: COLUMN categories.is_active; Type: COMMENT; Schema: public; Owner: photobooks
--

COMMENT ON COLUMN public.categories.is_active IS 'Flag to soft-delete categories';


--
-- Name: COLUMN categories.cover_image; Type: COMMENT; Schema: public; Owner: photobooks
--

COMMENT ON COLUMN public.categories.cover_image IS 'Cover image URL for subcategory cards and thumbnails';


--
-- Name: COLUMN categories.banner_image; Type: COMMENT; Schema: public; Owner: photobooks
--

COMMENT ON COLUMN public.categories.banner_image IS 'Banner image URL for subcategory page hero sections';


--
-- Name: COLUMN categories."order"; Type: COMMENT; Schema: public; Owner: photobooks
--

COMMENT ON COLUMN public.categories."order" IS 'Display order for categories (lower numbers appear first, 1 = default order)';


--
-- Name: change_logs; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.change_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying,
    entity_type character varying NOT NULL,
    entity_ids jsonb NOT NULL,
    action character varying NOT NULL,
    details jsonb,
    ip_address character varying,
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.change_logs OWNER TO photobooks;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.comments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    post_id character varying,
    user_id character varying,
    author_name character varying NOT NULL,
    author_email character varying NOT NULL,
    content text NOT NULL,
    is_approved boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.comments OWNER TO photobooks;

--
-- Name: currencies; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.currencies (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code public.currency NOT NULL,
    name jsonb NOT NULL,
    symbol character varying NOT NULL,
    is_base_currency boolean DEFAULT false,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.currencies OWNER TO photobooks;

--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.exchange_rates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    from_currency_id character varying NOT NULL,
    to_currency_id character varying NOT NULL,
    rate numeric(15,8) NOT NULL,
    source character varying,
    is_manual boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.exchange_rates OWNER TO photobooks;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.order_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_id character varying NOT NULL,
    product_id character varying,
    product_name character varying NOT NULL,
    product_image_url character varying,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    options jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.order_items OWNER TO photobooks;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying,
    customer_name character varying NOT NULL,
    customer_email character varying NOT NULL,
    customer_phone character varying,
    shipping_address text NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    currency_id character varying,
    exchange_rate numeric(15,8),
    status public.order_status DEFAULT 'pending'::public.order_status,
    items jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.orders OWNER TO photobooks;

--
-- Name: pages; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.pages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title jsonb NOT NULL,
    slug character varying NOT NULL,
    description jsonb,
    meta_title character varying,
    meta_description text,
    keywords text,
    canonical_url character varying,
    og_image character varying,
    twitter_card character varying DEFAULT 'summary_large_image'::character varying,
    structured_data jsonb,
    noindex boolean DEFAULT false,
    language character varying DEFAULT 'ru'::character varying,
    is_published boolean DEFAULT false,
    is_homepage boolean DEFAULT false,
    show_in_header_nav boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.pages OWNER TO photobooks;

--
-- Name: popups; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.popups (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    type public.popup_type NOT NULL,
    title jsonb,
    content jsonb,
    image_url character varying,
    button_text jsonb,
    button_link character varying,
    secondary_button_text jsonb,
    secondary_button_link character varying,
    background_color character varying DEFAULT '#ffffff'::character varying,
    text_color character varying DEFAULT '#000000'::character varying,
    size jsonb,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT false,
    status public.popup_status DEFAULT 'draft'::public.popup_status,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    target_pages text[],
    target_users character varying,
    show_delay integer DEFAULT 0,
    show_frequency character varying,
    max_impressions integer,
    max_clicks integer,
    current_impressions integer DEFAULT 0,
    current_clicks integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.popups OWNER TO photobooks;

--
-- Name: products; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.products (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name jsonb NOT NULL,
    description jsonb,
    price numeric(10,2) NOT NULL,
    currency_id character varying,
    original_price numeric(10,2),
    discount_percentage integer DEFAULT 0,
    in_stock boolean DEFAULT true,
    stock_quantity integer DEFAULT 0,
    is_on_sale boolean DEFAULT false,
    image_url character varying,
    images text[],
    video_url character varying,
    videos text[],
    category_id character varying,
    options jsonb,
    photobook_format character varying,
    photobook_size character varying,
    min_spreads integer DEFAULT 10,
    additional_spread_price numeric(10,2),
    additional_spread_currency_id character varying,
    paper_type character varying,
    cover_material character varying,
    binding_type character varying,
    production_time integer DEFAULT 7,
    shipping_time integer DEFAULT 3,
    weight numeric(5,2),
    allow_customization boolean DEFAULT true,
    min_custom_price numeric(10,2),
    min_custom_price_currency_id character varying,
    cost_price numeric(10,2) DEFAULT '0'::numeric,
    cost_currency_id character varying,
    material_costs numeric(10,2) DEFAULT '0'::numeric,
    labor_costs numeric(10,2) DEFAULT '0'::numeric,
    overhead_costs numeric(10,2) DEFAULT '0'::numeric,
    shipping_costs numeric(10,2) DEFAULT '0'::numeric,
    other_costs numeric(10,2) DEFAULT '0'::numeric,
    expected_profit_margin numeric(5,2) DEFAULT '30'::numeric,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    special_pages text[] DEFAULT '{}'::text[],
    created_at timestamp without time zone DEFAULT now(),
    hashtags jsonb,
    is_ready_made boolean DEFAULT false,
    subcategory_id character varying
);


ALTER TABLE public.products OWNER TO photobooks;

--
-- Name: COLUMN products.hashtags; Type: COMMENT; Schema: public; Owner: photobooks
--

COMMENT ON COLUMN public.products.hashtags IS 'SEO хэштеги для товара в формате {"ru": ["#тег1", "#тег2"], "hy": ["#տեգ1"], "en": ["#tag1", "#tag2"]}';


--
-- Name: COLUMN products.is_ready_made; Type: COMMENT; Schema: public; Owner: photobooks
--

COMMENT ON COLUMN public.products.is_ready_made IS 'Готовый товар (рамки, альбомы) vs кастомные товары (фотокниги). false = кастомный, true = готовый';


--
-- Name: promocodes; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.promocodes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code character varying NOT NULL,
    name character varying NOT NULL,
    discount_type character varying NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    currency_id character varying,
    min_order_amount numeric(10,2),
    min_order_currency_id character varying,
    max_uses integer,
    used_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.promocodes OWNER TO photobooks;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.reviews (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying,
    product_id character varying,
    author_name character varying NOT NULL,
    author_email character varying,
    profile_photo character varying,
    gender character varying,
    rating integer NOT NULL,
    comment text NOT NULL,
    status public.review_status DEFAULT 'pending'::public.review_status,
    is_promoted boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.reviews OWNER TO photobooks;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO photobooks;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    key character varying NOT NULL,
    description text,
    value jsonb NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.settings OWNER TO photobooks;

--
-- Name: site_pages; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.site_pages (
    key character varying NOT NULL,
    title jsonb DEFAULT '{}'::jsonb NOT NULL,
    description jsonb DEFAULT '{}'::jsonb NOT NULL,
    seo_title jsonb DEFAULT '{}'::jsonb NOT NULL,
    seo_description jsonb DEFAULT '{}'::jsonb NOT NULL,
    hero_image_url character varying,
    is_published boolean DEFAULT true NOT NULL,
    show_in_header_nav boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.site_pages OWNER TO photobooks;

--
-- Name: special_offers; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.special_offers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    type public.special_offer_type NOT NULL,
    title jsonb,
    description jsonb,
    image_url character varying,
    discount_type character varying,
    discount_value numeric(10,2),
    currency_id character varying,
    min_order_amount numeric(10,2),
    min_order_currency_id character varying,
    button_text jsonb,
    button_link character varying,
    background_color character varying DEFAULT '#ffffff'::character varying,
    text_color character varying DEFAULT '#000000'::character varying,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT false,
    status public.special_offer_status DEFAULT 'draft'::public.special_offer_status,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    target_products text[],
    target_categories text[],
    target_users character varying,
    max_uses integer,
    current_uses integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.special_offers OWNER TO photobooks;

--
-- Name: uploads; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.uploads (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    phone character varying(20) NOT NULL,
    format character varying(20) NOT NULL,
    size character varying(20) NOT NULL,
    pages integer DEFAULT 24,
    price numeric(10,2) NOT NULL,
    comment text,
    files jsonb DEFAULT '[]'::jsonb,
    status public.upload_status DEFAULT 'pending'::public.upload_status,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + '48:00:00'::interval),
    admin_notified boolean DEFAULT false,
    telegram_sent boolean DEFAULT false,
    zip_generated_at timestamp with time zone,
    zip_downloaded_at timestamp with time zone,
    total_file_size bigint DEFAULT 0,
    file_count integer DEFAULT 0,
    delete_after_days integer DEFAULT 30,
    delete_at timestamp with time zone,
    deletion_notified_at timestamp with time zone,
    admin_hold boolean DEFAULT false,
    postponed_until timestamp with time zone,
    deleted_at timestamp with time zone
);


ALTER TABLE public.uploads OWNER TO photobooks;

--
-- Name: user_themes; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.user_themes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    theme_name character varying NOT NULL,
    custom_colors jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_themes OWNER TO photobooks;

--
-- Name: users; Type: TABLE; Schema: public; Owner: photobooks
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    password_hash character varying,
    role character varying DEFAULT 'user'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO photobooks;

--
-- Data for Name: analytics_events; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.analytics_events (id, event_type, entity_type, entity_id, user_id, session_id, metadata, user_agent, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: ar_project_items; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.ar_project_items (id, project_id, target_index, name, photo_url, video_url, mask_url, photo_width, photo_height, video_width, video_height, video_duration_ms, photo_aspect_ratio, video_aspect_ratio, config, fit_mode, scale_width, scale_height, marker_compiled, marker_quality, created_at, updated_at) FROM stdin;
5bc514ec-53e4-49d2-a01e-b74a3d16b4ca	7b59e666-5d12-4780-9f26-1df21b22c2f1	0	Живое фото 1	objects/ar-uploads/7b59e666-5d12-4780-9f26-1df21b22c2f1/photo-1764013904888-rkgo5c.jpg	objects/ar-uploads/7b59e666-5d12-4780-9f26-1df21b22c2f1/video-1764013904888-he6haf.mp4	\N	\N	\N	\N	\N	\N	\N	\N	{"videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": -46}}	contain	\N	\N	f	\N	2025-11-24 19:51:44.914857	2025-11-24 19:52:04.42
17c86987-1061-4eb1-825b-0374415150cb	2542bf5b-2a5f-4cba-bdec-067b83c424fa	0	Живое фото 1	objects/ar-uploads/2542bf5b-2a5f-4cba-bdec-067b83c424fa/photo-1762678172395-x7ybxg.jpg	objects/ar-uploads/2542bf5b-2a5f-4cba-bdec-067b83c424fa/video-1762678172395-ehu3u.mp4	\N	\N	\N	\N	\N	\N	\N	\N	{"videoScale": {"width": 0.5880952380952389, "height": 0.75}, "videoPosition": {"x": 0.009523809523809523, "y": 0.016666666666666885, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	contain	\N	\N	f	\N	2025-11-09 08:49:32.448038	2025-11-09 08:49:48.284
b81c5816-6c4e-4a4f-b488-0b8bff4c53d2	ed24bac1-d8c1-4e2f-9c15-9dcb8533efd9	1	Живое фото 2	objects/ar-uploads/ed24bac1-d8c1-4e2f-9c15-9dcb8533efd9/photo-1762684268005-cxcka.jpg	objects/ar-uploads/ed24bac1-d8c1-4e2f-9c15-9dcb8533efd9/video-1762684268005-rkhqm.mp4	\N	\N	\N	\N	\N	\N	\N	\N	{"videoScale": {"width": 0.5261904761904771, "height": 0.6499999999999998}, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	contain	\N	\N	t	\N	2025-11-09 10:31:08.024934	2025-11-09 10:50:23.722
f950f889-3389-43bd-b8de-a625b773e08b	a9f2fc43-8f96-49ff-abb5-174ea4077eba	0	Живое фото 1	objects/ar-uploads/a9f2fc43-8f96-49ff-abb5-174ea4077eba/photo-1762686340992-jtvalf.jpg	objects/ar-uploads/a9f2fc43-8f96-49ff-abb5-174ea4077eba/video-1762686340992-cx0vsc.mp4	\N	\N	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	\N	2025-11-09 11:05:40.997574	2025-11-09 11:06:09.384
8c69b7b5-2165-4204-b311-35b9f31ca646	ed24bac1-d8c1-4e2f-9c15-9dcb8533efd9	0	Живое фото 1	objects/ar-uploads/ed24bac1-d8c1-4e2f-9c15-9dcb8533efd9/photo-1762684246410-1pkaib.jpg	objects/ar-uploads/ed24bac1-d8c1-4e2f-9c15-9dcb8533efd9/video-1762684246410-q4bmyc.mp4	\N	\N	\N	\N	\N	\N	\N	\N	{"videoScale": {"width": 0.6190476190476197, "height": 0.6023809523809524}, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	contain	\N	\N	t	\N	2025-11-09 10:30:46.424248	2025-11-09 11:26:33.232
70763b38-d4fd-4330-833d-8cf2dc877d09	bf6ef79a-ab47-4d78-9be7-32817effe46c	0	Живое фото 1	objects/ar-uploads/bf6ef79a-ab47-4d78-9be7-32817effe46c/photo-1762689184577-bzr3io.jpg	objects/ar-uploads/bf6ef79a-ab47-4d78-9be7-32817effe46c/video-1762689184577-fna2sp.mp4	\N	\N	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	\N	2025-11-09 11:53:04.591717	2025-11-09 11:53:38.267
\.


--
-- Data for Name: ar_projects; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.ar_projects (id, user_id, order_id, photo_url, video_url, marker_fset_url, marker_fset3_url, marker_iset_url, status, error_message, view_url, viewer_html_url, qr_code_url, marker_quality, key_points_count, config, compilation_started_at, compilation_finished_at, compilation_time_ms, notification_sent, notification_sent_at, created_at, updated_at, photo_width, photo_height, video_width, video_height, video_duration_ms, photo_aspect_ratio, video_aspect_ratio, fit_mode, scale_width, scale_height, is_calibrated, calibrated_pos_x, calibrated_pos_y, calibrated_pos_z, mask_url, mask_width, mask_height, attached_to_order, ar_price, product_id, is_demo, expires_at) FROM stdin;
0265dbe4-6ab1-4aa6-bd30-01d3696a82d0	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763483309492-yhpc6.png	objects/ar-uploads/video-1763483309492-kk7mnml.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/0265dbe4-6ab1-4aa6-bd30-01d3696a82d0	/api/ar/storage/0265dbe4-6ab1-4aa6-bd30-01d3696a82d0/index.html	/api/ar/storage/0265dbe4-6ab1-4aa6-bd30-01d3696a82d0/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 16:28:29.522	2025-11-18 16:29:25.322	55368	f	\N	2025-11-18 16:28:29.498698	2025-11-18 16:29:25.322	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
51c315c1-4b40-4878-8142-febbdfe7ad84	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762463337022-esnrd.png	objects/ar-uploads/video-1762463337022-yfhj7p.mp4	\N	\N	\N	error	Failed to execute NFT marker creator. Install by cloning https://github.com/Carnaux/NFT-Marker-Creator into tools/nft-marker-creator and run: npm install. Then set NFT_MARKER_CREATOR_CMD or ensure cli.js exists. Original: Command failed: nft-marker-creator -i "C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\backend\\objects\\ar-uploads\\photo-1762463337022-esnrd.png" -o "C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\backend\\objects\\ar-storage\\51c315c1-4b40-4878-8142-febbdfe7ad84\\marker" -w 200 -l 4\n"nft-marker-creator" �� ���� ����७��� ��� ���譥�\r\n��������, �ᯮ��塞�� �ணࠬ��� ��� ������ 䠩���.\r\n	\N	\N	\N	\N	\N	\N	2025-11-06 21:08:57.056	2025-11-06 21:08:57.219	\N	f	\N	2025-11-06 21:08:57.036565	2025-11-06 21:08:57.219	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
3ca81da3-525a-45ae-9f22-a7eba4cff96c	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763482119587-qf8s4c.png	objects/ar-uploads/video-1763482119587-d52al.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/3ca81da3-525a-45ae-9f22-a7eba4cff96c	/api/ar/storage/3ca81da3-525a-45ae-9f22-a7eba4cff96c/index.html	/api/ar/storage/3ca81da3-525a-45ae-9f22-a7eba4cff96c/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 16:08:39.621	2025-11-18 16:09:33.432	53506	f	\N	2025-11-18 16:08:39.594757	2025-11-18 16:09:33.432	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
5aaab6f9-0b08-4457-8afc-b22f87a8fecd	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763480272078-5zbmz.png	objects/ar-uploads/video-1763480272078-v421om.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/5aaab6f9-0b08-4457-8afc-b22f87a8fecd	/api/ar/storage/5aaab6f9-0b08-4457-8afc-b22f87a8fecd/index.html	/api/ar/storage/5aaab6f9-0b08-4457-8afc-b22f87a8fecd/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 15:37:52.39	2025-11-18 15:38:53.863	56596	f	\N	2025-11-18 15:37:52.0839	2025-11-18 15:38:53.863	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
c556e3d8-4ab0-460b-ab9b-d5fa244adef7	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762463550151-pvt58k.png	objects/ar-uploads/video-1762463550151-pf2ahj.mp4	\N	\N	\N	error	Failed to execute NFT marker creator. Install by cloning https://github.com/Carnaux/NFT-Marker-Creator into tools/nft-marker-creator and run: npm install. Then set NFT_MARKER_CREATOR_CMD or ensure cli.js exists. Original: Command failed: nft-marker-creator -i "C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\backend\\objects\\ar-uploads\\photo-1762463550151-pvt58k.png" -o "C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\backend\\objects\\ar-storage\\c556e3d8-4ab0-460b-ab9b-d5fa244adef7\\marker" -w 200 -l 4\n"nft-marker-creator" �� ���� ����७��� ��� ���譥�\r\n��������, �ᯮ��塞�� �ணࠬ��� ��� ������ 䠩���.\r\n	\N	\N	\N	\N	\N	\N	2025-11-06 21:12:30.188	2025-11-06 21:12:30.284	\N	f	\N	2025-11-06 21:12:30.156332	2025-11-06 21:12:30.284	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
3242f70d-3f20-4481-b467-13c3f5193da9	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762464326385-xuygp.png	objects/ar-uploads/video-1762464326385-0i737.mp4	\N	\N	\N	error	NFT Marker Creator CLI not found. Clone https://github.com/Carnaux/NFT-Marker-Creator into ./tools/nft-marker-creator then run npm install. Optionally set NFT_MARKER_CREATOR_CMD="node ./tools/nft-marker-creator/cli.js"	\N	\N	\N	\N	\N	\N	2025-11-06 21:25:26.454	2025-11-06 21:25:27.233	\N	f	\N	2025-11-06 21:25:26.435803	2025-11-06 21:25:27.233	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
816cb27a-6f87-40cb-a5ef-0c6aa941e40e	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762464703240-gpvb1j.png	objects/ar-uploads/video-1762464703240-ir84w.mp4	\N	\N	\N	error	ENOENT: no such file or directory, copyfile 'C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\objects\\ar-uploads\\video-1762464703240-ir84w.mp4' -> 'C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\objects\\ar-storage\\816cb27a-6f87-40cb-a5ef-0c6aa941e40e\\video.mp4'	\N	\N	\N	\N	\N	\N	2025-11-06 21:31:43.302	2025-11-06 21:31:43.322	\N	f	\N	2025-11-06 21:31:43.282938	2025-11-06 21:31:43.322	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
e9dd6f1a-ad7c-46c4-a92f-27b2bc6c29ef	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762464745913-2yviuf.png	objects/ar-uploads/video-1762464745913-rjj4y.mp4	\N	\N	\N	error	ENOENT: no such file or directory, copyfile 'C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\objects\\ar-uploads\\video-1762464745913-rjj4y.mp4' -> 'C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\objects\\ar-storage\\e9dd6f1a-ad7c-46c4-a92f-27b2bc6c29ef\\video.mp4'	\N	\N	\N	\N	\N	\N	2025-11-06 21:32:25.943	2025-11-06 21:32:25.973	\N	f	\N	2025-11-06 21:32:25.92313	2025-11-06 21:32:25.973	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
84cfad36-9fdf-45c2-abc9-a9dec354a63d	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762465103878-ttlnzb.png	objects/ar-uploads/video-1762465103878-vxijdd.mp4	\N	\N	\N	error	NFT Marker Creator CLI not found. Clone https://github.com/Carnaux/NFT-Marker-Creator into ./tools/nft-marker-creator then run npm install. Optionally set NFT_MARKER_CREATOR_CMD="node ./tools/nft-marker-creator/cli.js"	\N	\N	\N	\N	\N	\N	2025-11-06 21:38:24.061	2025-11-06 21:38:24.69	\N	f	\N	2025-11-06 21:38:23.886825	2025-11-06 21:38:24.69	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
0434cb6f-5700-4957-bad8-9d141c296be4	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762465329681-hrnkal.png	objects/ar-uploads/video-1762465329681-oabko.mp4	\N	\N	\N	error	NFT Marker Creator CLI not found. Clone https://github.com/Carnaux/NFT-Marker-Creator into ./tools/nft-marker-creator then run npm install. Optionally set NFT_MARKER_CREATOR_CMD="node ./tools/nft-marker-creator/cli.js"	\N	\N	\N	\N	\N	\N	2025-11-06 21:42:09.705	2025-11-06 21:42:10.369	\N	f	\N	2025-11-06 21:42:09.685673	2025-11-06 21:42:10.369	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
017160b7-5b28-4e3f-9460-bcb41760f5b5	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762465820627-jzanom.png	objects/ar-uploads/video-1762465820627-ivd5wi.mp4	/api/ar-storage/017160b7-5b28-4e3f-9460-bcb41760f5b5/marker.fset	/api/ar-storage/017160b7-5b28-4e3f-9460-bcb41760f5b5/marker.fset3	/api/ar-storage/017160b7-5b28-4e3f-9460-bcb41760f5b5/marker.iset	ready	\N	http://localhost:3000/ar/view/017160b7-5b28-4e3f-9460-bcb41760f5b5	/api/ar-storage/017160b7-5b28-4e3f-9460-bcb41760f5b5/index.html	/api/ar-storage/017160b7-5b28-4e3f-9460-bcb41760f5b5/qr-code.png	\N	\N	\N	2025-11-06 21:50:20.686	2025-11-06 21:52:46.671	145661	f	\N	2025-11-06 21:50:20.634473	2025-11-06 21:52:46.671	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
e5aebc96-bc52-45fd-8c9d-ca74ca1cc06a	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762467221420-09jp5c.png	objects/ar-uploads/video-1762467221420-cwh4y.mp4	/api/ar-storage/e5aebc96-bc52-45fd-8c9d-ca74ca1cc06a/marker.fset	/api/ar-storage/e5aebc96-bc52-45fd-8c9d-ca74ca1cc06a/marker.fset3	/api/ar-storage/e5aebc96-bc52-45fd-8c9d-ca74ca1cc06a/marker.iset	ready	\N	http://localhost:3000/ar/view/e5aebc96-bc52-45fd-8c9d-ca74ca1cc06a	/api/ar-storage/e5aebc96-bc52-45fd-8c9d-ca74ca1cc06a/index.html	/api/ar-storage/e5aebc96-bc52-45fd-8c9d-ca74ca1cc06a/qr-code.png	\N	\N	\N	2025-11-06 22:13:41.448	2025-11-06 22:16:21.145	159505	f	\N	2025-11-06 22:13:41.426006	2025-11-06 22:16:21.145	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
6c7712a6-a1cf-4292-95a9-0eae11b9d3e8	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762467235470-na6qjm.jpg	objects/ar-uploads/video-1762467235470-t6xilz.mp4	/api/ar-storage/6c7712a6-a1cf-4292-95a9-0eae11b9d3e8/marker.fset	/api/ar-storage/6c7712a6-a1cf-4292-95a9-0eae11b9d3e8/marker.fset3	/api/ar-storage/6c7712a6-a1cf-4292-95a9-0eae11b9d3e8/marker.iset	ready	\N	http://localhost:3000/ar/view/6c7712a6-a1cf-4292-95a9-0eae11b9d3e8	/api/ar-storage/6c7712a6-a1cf-4292-95a9-0eae11b9d3e8/index.html	/api/ar-storage/6c7712a6-a1cf-4292-95a9-0eae11b9d3e8/qr-code.png	\N	\N	\N	2025-11-06 22:13:55.486	2025-11-06 22:17:45.941	230189	f	\N	2025-11-06 22:13:55.474874	2025-11-06 22:17:45.941	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
48fc267d-0a30-412c-bd9d-082be2ef8394	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762540740919-5zpao6.jpg	objects/ar-uploads/video-1762540740919-xtwoop.mp4	/api/ar-storage/48fc267d-0a30-412c-bd9d-082be2ef8394/marker.fset	/api/ar-storage/48fc267d-0a30-412c-bd9d-082be2ef8394/marker.fset3	/api/ar-storage/48fc267d-0a30-412c-bd9d-082be2ef8394/marker.iset	ready	\N	http://localhost:3000/ar/view/48fc267d-0a30-412c-bd9d-082be2ef8394	/api/ar-storage/48fc267d-0a30-412c-bd9d-082be2ef8394/index.html	/api/ar-storage/48fc267d-0a30-412c-bd9d-082be2ef8394/qr-code.png	\N	\N	\N	2025-11-07 18:39:00.954	2025-11-07 18:44:56.589	355498	f	\N	2025-11-07 18:39:00.926143	2025-11-07 18:44:56.589	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
993d9473-47e9-422d-b50d-78a181aaa16d	88f01be3-2d4b-4186-a5f2-d06b58c943d2	\N	objects/ar-uploads/photo-1762607725626-8l9h99.png	objects/ar-uploads/video-1762607725626-kem6x.mp4	\N	\N	\N	error	Compilation timeout exceeded 4 minutes. Please use a shorter video (max 30 seconds) or smaller file size (max 50MB).	\N	\N	\N	\N	\N	{"progressPhase": "marker-compiling-web"}	2025-11-08 13:15:25.653	2025-11-08 13:19:25.652	\N	f	\N	2025-11-08 13:15:25.632788	2025-11-08 13:19:25.904	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
17f6a1b9-3d1c-46bd-b231-03afa420ae98	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762541102701-dj0ie.png	objects/ar-uploads/video-1762541102701-6jen7w.mp4	/api/ar-storage/17f6a1b9-3d1c-46bd-b231-03afa420ae98/marker.fset	/api/ar-storage/17f6a1b9-3d1c-46bd-b231-03afa420ae98/marker.fset3	/api/ar-storage/17f6a1b9-3d1c-46bd-b231-03afa420ae98/marker.iset	ready	\N	http://localhost:3000/ar/view/17f6a1b9-3d1c-46bd-b231-03afa420ae98	/api/ar-storage/17f6a1b9-3d1c-46bd-b231-03afa420ae98/index.html	/api/ar-storage/17f6a1b9-3d1c-46bd-b231-03afa420ae98/qr-code.png	\N	\N	\N	2025-11-07 18:45:02.719	2025-11-07 18:50:10.095	307288	f	\N	2025-11-07 18:45:02.705339	2025-11-07 18:50:10.095	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
d4070439-275e-488b-b7b7-18004c5bc0a7	88f01be3-2d4b-4186-a5f2-d06b58c943d2	\N	objects/ar-uploads/photo-1762608692905-5j4cys.png	objects/ar-uploads/video-1762608692905-7am54j.mp4	\N	\N	\N	error	MindAR compilation failed: Compilation timeout after 180000ms	\N	\N	\N	\N	\N	{"progressPhase": "marker-compiling"}	2025-11-08 13:31:32.937	2025-11-08 13:34:37.207	\N	f	\N	2025-11-08 13:31:32.912545	2025-11-08 13:34:37.207	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
0be8f4ff-8a4e-4099-a0d9-32a2a16610a6	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762549853060-75sofm.png	objects/ar-uploads/video-1762549853060-uzmu48.mp4	/api/ar-storage/0be8f4ff-8a4e-4099-a0d9-32a2a16610a6/marker.fset	/api/ar-storage/0be8f4ff-8a4e-4099-a0d9-32a2a16610a6/marker.fset3	/api/ar-storage/0be8f4ff-8a4e-4099-a0d9-32a2a16610a6/marker.iset	ready	\N	http://localhost:3000/ar/view/0be8f4ff-8a4e-4099-a0d9-32a2a16610a6	/api/ar-storage/0be8f4ff-8a4e-4099-a0d9-32a2a16610a6/index.html	/api/ar-storage/0be8f4ff-8a4e-4099-a0d9-32a2a16610a6/qr-code.png	\N	\N	\N	2025-11-07 21:10:53.076	2025-11-07 21:13:06.396	133228	f	\N	2025-11-07 21:10:53.064701	2025-11-07 21:13:06.396	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
b8115d9b-24fc-41bf-a0f4-c0d8db1d8d47	88f01be3-2d4b-4186-a5f2-d06b58c943d2	\N	objects/ar-uploads/photo-1762609378027-cadneb.png	objects/ar-uploads/video-1762609378027-3zda2.mp4	\N	\N	\N	processing	\N	\N	\N	\N	\N	\N	{"progressPhase": "marker-compiling"}	2025-11-08 13:42:58.064	\N	\N	f	\N	2025-11-08 13:42:58.039979	2025-11-08 13:42:58.197	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
c54c7a65-0e96-4740-ae70-433a5a47ec3c	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762551885212-9t6ljl.png	objects/ar-uploads/video-1762551885212-4gvs2.mp4	/api/ar-storage/c54c7a65-0e96-4740-ae70-433a5a47ec3c/marker.fset	/api/ar-storage/c54c7a65-0e96-4740-ae70-433a5a47ec3c/marker.fset3	/api/ar-storage/c54c7a65-0e96-4740-ae70-433a5a47ec3c/marker.iset	ready	\N	http://localhost:3000/ar/view/c54c7a65-0e96-4740-ae70-433a5a47ec3c	/api/ar-storage/c54c7a65-0e96-4740-ae70-433a5a47ec3c/index.html	/api/ar-storage/c54c7a65-0e96-4740-ae70-433a5a47ec3c/qr-code.png	\N	\N	\N	2025-11-07 21:44:45.235	2025-11-07 21:50:09.538	323157	f	\N	2025-11-07 21:44:45.221757	2025-11-07 21:50:09.538	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
f25e59b7-2750-4df3-9ce5-fe3f7320bc23	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762552570176-rpa46s.jpg	objects/ar-uploads/video-1762552570176-daqztg.mp4	\N	\N	\N	error	Failed to execute NFT marker creator. Install by cloning https://github.com/Carnaux/NFT-Marker-Creator into tools/nft-marker-creator and run: npm install. Then set NFT_MARKER_CREATOR_CMD or ensure app.js exists. Original: Command failed: node "C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\tools\\nft-marker-creator\\app.js" -i "C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\objects\\ar-uploads\\photo-1762552570176-rpa46s.jpg" -o "C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\objects\\ar-storage\\f25e59b7-2750-4df3-9ce5-fe3f7320bc23/"\nwasm streaming compile failed: TypeError [ERR_INVALID_ARG_TYPE]: The "source" argument must be an instance of Response or an Promise resolving to Response. Received an instance of Object\nfalling back to ArrayBuffer instantiation\n\nJpegError: JPEG error: SOI not found\n\n	\N	\N	\N	\N	\N	\N	2025-11-07 21:56:10.195	2025-11-07 21:56:10.918	\N	f	\N	2025-11-07 21:56:10.181413	2025-11-07 21:56:10.918	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
07a8ccc2-d779-4496-9262-de0fcee0f518	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762600086517-3bavif.png	objects/ar-uploads/video-1762600086517-99tvnj.mp4	/api/ar-storage/07a8ccc2-d779-4496-9262-de0fcee0f518/marker.fset	/api/ar-storage/07a8ccc2-d779-4496-9262-de0fcee0f518/marker.fset3	/api/ar-storage/07a8ccc2-d779-4496-9262-de0fcee0f518/marker.iset	ready	\N	http://localhost:3000/ar/view/07a8ccc2-d779-4496-9262-de0fcee0f518	/api/ar-storage/07a8ccc2-d779-4496-9262-de0fcee0f518/index.html	/api/ar-storage/07a8ccc2-d779-4496-9262-de0fcee0f518/qr-code.png	\N	\N	\N	2025-11-08 11:08:06.627	2025-11-08 11:13:52.347	344414	f	\N	2025-11-08 11:08:06.524603	2025-11-08 11:13:52.347	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
fec0bad7-c2ea-4575-8be1-e987c7e3ccf7	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762600997079-x7m2hd.png	objects/ar-uploads/video-1762600997079-ylxk37.mp4	/api/ar-storage/fec0bad7-c2ea-4575-8be1-e987c7e3ccf7/marker.fset	/api/ar-storage/fec0bad7-c2ea-4575-8be1-e987c7e3ccf7/marker.fset3	/api/ar-storage/fec0bad7-c2ea-4575-8be1-e987c7e3ccf7/marker.iset	ready	\N	http://localhost:3000/ar/view/fec0bad7-c2ea-4575-8be1-e987c7e3ccf7	/api/ar-storage/fec0bad7-c2ea-4575-8be1-e987c7e3ccf7/index.html	/api/ar-storage/fec0bad7-c2ea-4575-8be1-e987c7e3ccf7/qr-code.png	\N	\N	\N	2025-11-08 11:23:17.131	2025-11-08 11:28:38.412	321016	f	\N	2025-11-08 11:23:17.08936	2025-11-08 11:28:38.412	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
2b1360f1-36b3-42c8-8624-20bce59885cb	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762601089015-p6k1eg.png	objects/ar-uploads/video-1762601089015-thlx5.mp4	/api/ar-storage/2b1360f1-36b3-42c8-8624-20bce59885cb/marker.fset	/api/ar-storage/2b1360f1-36b3-42c8-8624-20bce59885cb/marker.fset3	/api/ar-storage/2b1360f1-36b3-42c8-8624-20bce59885cb/marker.iset	ready	\N	http://localhost:3000/ar/view/2b1360f1-36b3-42c8-8624-20bce59885cb	/api/ar-storage/2b1360f1-36b3-42c8-8624-20bce59885cb/index.html	/api/ar-storage/2b1360f1-36b3-42c8-8624-20bce59885cb/qr-code.png	\N	\N	\N	2025-11-08 11:24:49.036	2025-11-08 11:30:08.72	319510	f	\N	2025-11-08 11:24:49.022493	2025-11-08 11:30:08.72	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
1ebaddeb-5c10-4b59-97e1-3207b3903c11	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762601486220-8o5ly.png	objects/ar-uploads/video-1762601486220-oikhvc.mp4	/api/ar-storage/1ebaddeb-5c10-4b59-97e1-3207b3903c11/marker.fset	/api/ar-storage/1ebaddeb-5c10-4b59-97e1-3207b3903c11/marker.fset3	/api/ar-storage/1ebaddeb-5c10-4b59-97e1-3207b3903c11/marker.iset	ready	\N	http://localhost:3000/ar/view/1ebaddeb-5c10-4b59-97e1-3207b3903c11	/api/ar-storage/1ebaddeb-5c10-4b59-97e1-3207b3903c11/index.html	/api/ar-storage/1ebaddeb-5c10-4b59-97e1-3207b3903c11/qr-code.png	\N	\N	\N	2025-11-08 11:31:26.245	2025-11-08 11:36:51.678	324922	f	\N	2025-11-08 11:31:26.231446	2025-11-08 11:36:51.678	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
a9f2fc43-8f96-49ff-abb5-174ea4077eba	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762602413648-wg1bm.png	objects/ar-uploads/video-1762602413648-zk1d8u.mp4	/api/ar-storage/a9f2fc43-8f96-49ff-abb5-174ea4077eba/marker.fset	/api/ar-storage/a9f2fc43-8f96-49ff-abb5-174ea4077eba/marker.fset3	/api/ar-storage/a9f2fc43-8f96-49ff-abb5-174ea4077eba/marker.iset	ready	\N	http://localhost:3000/ar/view/a9f2fc43-8f96-49ff-abb5-174ea4077eba	/api/ar/storage/a9f2fc43-8f96-49ff-abb5-174ea4077eba/index.html	/api/ar/storage/a9f2fc43-8f96-49ff-abb5-174ea4077eba/qr-code.png	\N	\N	\N	2025-11-09 11:05:41.012	2025-11-09 11:06:09.475	28447	f	\N	2025-11-08 11:46:53.666349	2025-11-09 11:06:09.476	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
ce0c40e3-1bc5-45db-a950-33ec2cd9e97e	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762601626854-fm87fb.png	objects/ar-uploads/video-1762601626854-7ff24.mp4	/api/ar-storage/ce0c40e3-1bc5-45db-a950-33ec2cd9e97e/marker.fset	/api/ar-storage/ce0c40e3-1bc5-45db-a950-33ec2cd9e97e/marker.fset3	/api/ar-storage/ce0c40e3-1bc5-45db-a950-33ec2cd9e97e/marker.iset	ready	\N	http://localhost:3000/ar/view/ce0c40e3-1bc5-45db-a950-33ec2cd9e97e	/api/ar-storage/ce0c40e3-1bc5-45db-a950-33ec2cd9e97e/index.html	/api/ar-storage/ce0c40e3-1bc5-45db-a950-33ec2cd9e97e/qr-code.png	\N	\N	\N	2025-11-08 11:33:46.905	2025-11-08 11:39:47.304	360158	f	\N	2025-11-08 11:33:46.861461	2025-11-08 11:39:47.304	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
5b5b2c3f-24c2-4434-b38b-aeee7711550b	88f01be3-2d4b-4186-a5f2-d06b58c943d2	\N	objects/ar-uploads/photo-1762608138089-5cr38.png	objects/ar-uploads/video-1762608138089-4u1dsf.mp4	\N	\N	\N	error	MindAR compilation failed: Compilation timeout after 180000ms	\N	\N	\N	\N	\N	{"progressPhase": "marker-compiling"}	2025-11-08 13:22:18.118	2025-11-08 13:25:25.851	\N	f	\N	2025-11-08 13:22:18.099565	2025-11-08 13:25:25.851	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
b386c8ac-3127-4a6b-b65f-d4a4d405084e	88f01be3-2d4b-4186-a5f2-d06b58c943d2	\N	objects/ar-uploads/photo-1762609081089-5bpdb.png	objects/ar-uploads/video-1762609081089-udq7c.mp4	\N	\N	\N	error	MindAR compilation failed: Compilation timeout after 180000ms - download link never appeared	\N	\N	\N	\N	\N	{"progressPhase": "marker-compiling"}	2025-11-08 13:38:01.127	2025-11-08 13:41:11.419	\N	f	\N	2025-11-08 13:38:01.099121	2025-11-08 13:41:11.419	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
772bf7c7-4786-4e6f-aa1a-f48ecaa89603	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762601974807-70r2we.png	objects/ar-uploads/video-1762601974807-68t5j.mp4	/api/ar-storage/772bf7c7-4786-4e6f-aa1a-f48ecaa89603/marker.fset	/api/ar-storage/772bf7c7-4786-4e6f-aa1a-f48ecaa89603/marker.fset3	/api/ar-storage/772bf7c7-4786-4e6f-aa1a-f48ecaa89603/marker.iset	ready	\N	http://localhost:3000/ar/view/772bf7c7-4786-4e6f-aa1a-f48ecaa89603	/api/ar-storage/772bf7c7-4786-4e6f-aa1a-f48ecaa89603/index.html	/api/ar-storage/772bf7c7-4786-4e6f-aa1a-f48ecaa89603/qr-code.png	\N	\N	\N	2025-11-08 11:39:34.826	2025-11-08 11:45:00.437	325368	f	\N	2025-11-08 11:39:34.81477	2025-11-08 11:45:00.437	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
fd87ae69-c5d7-4e2e-b4d4-631786a89e15	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763481105900-rwkeej.png	objects/ar-uploads/video-1763481105900-0ttv2h.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/fd87ae69-c5d7-4e2e-b4d4-631786a89e15	/api/ar/storage/fd87ae69-c5d7-4e2e-b4d4-631786a89e15/index.html	/api/ar/storage/fd87ae69-c5d7-4e2e-b4d4-631786a89e15/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 15:51:46.963	2025-11-18 15:52:43.388	54608	f	\N	2025-11-18 15:51:45.90891	2025-11-18 15:52:43.388	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
214da0a9-bcb4-46a6-acc0-df788e5e48c0	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762602116247-j69n7c.png	objects/ar-uploads/video-1762602116247-ubv17p.mp4	/api/ar-storage/214da0a9-bcb4-46a6-acc0-df788e5e48c0/marker.fset	/api/ar-storage/214da0a9-bcb4-46a6-acc0-df788e5e48c0/marker.fset3	/api/ar-storage/214da0a9-bcb4-46a6-acc0-df788e5e48c0/marker.iset	ready	\N	http://localhost:3000/ar/view/214da0a9-bcb4-46a6-acc0-df788e5e48c0	/api/ar-storage/214da0a9-bcb4-46a6-acc0-df788e5e48c0/index.html	/api/ar-storage/214da0a9-bcb4-46a6-acc0-df788e5e48c0/qr-code.png	\N	\N	\N	2025-11-08 11:41:56.27	2025-11-08 11:47:24.44	327969	f	\N	2025-11-08 11:41:56.252467	2025-11-08 11:47:24.44	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
aa251425-dd7a-4c08-8e57-63d452d26b36	88f01be3-2d4b-4186-a5f2-d06b58c943d2	\N	objects/ar-uploads/photo-1762610274968-fvwide.png	objects/ar-uploads/video-1762610274968-l1gdlc.mp4	\N	\N	\N	error	MindAR compilation failed: Compilation timeout after 180000ms - no .mind file detected	\N	\N	\N	\N	\N	{"progressPhase": "marker-compiling"}	2025-11-08 13:57:55.016	2025-11-08 14:01:03.827	\N	f	\N	2025-11-08 13:57:54.974553	2025-11-08 14:01:03.827	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
7a7565f5-802a-4a6c-834a-f3823dec9cbf	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762605829114-riymfb.png	objects/ar-uploads/video-1762605829114-31hs5.mp4	\N	\N	\N	error	Failed to compile marker via web compiler: Compilation timeout after 90000ms	\N	\N	\N	\N	\N	{"progressPhase": "media-prepared"}	2025-11-08 12:43:49.158	2025-11-08 12:49:28.633	\N	f	\N	2025-11-08 12:43:49.123119	2025-11-08 12:49:28.633	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
4a6979a3-39ca-46d0-8d9b-68186fb4cd07	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762603557775-qsjla.png	objects/ar-uploads/video-1762603557775-sa1nz.mp4	\N	\N	\N	error	Failed to compile marker via web compiler: Compilation timeout after 90000ms	\N	\N	\N	\N	\N	{"progressPhase": "media-prepared"}	2025-11-08 12:05:57.802	2025-11-08 12:11:36.553	\N	f	\N	2025-11-08 12:05:57.783914	2025-11-08 12:11:36.553	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
6673c45d-a7cc-420e-81c5-a41d40c70ef5	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762605400714-ar4si.png	objects/ar-uploads/video-1762605400714-2l4pal.mp4	\N	\N	\N	error	Failed to compile marker via web compiler: Compilation timeout after 90000ms	\N	\N	\N	\N	\N	{"progressPhase": "media-prepared"}	2025-11-08 12:36:40.737	2025-11-08 12:42:17.367	\N	f	\N	2025-11-08 12:36:40.721961	2025-11-08 12:42:17.367	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
d45d5a9d-0276-4fd0-b19f-2581ace2e4dd	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762606261261-xdf399.png	objects/ar-uploads/video-1762606261261-ylk3dq.mp4	\N	\N	\N	error	Failed to compile marker via web compiler: Compilation timeout after 90000ms	\N	\N	\N	\N	\N	{"progressPhase": "media-prepared"}	2025-11-08 12:51:01.282	2025-11-08 12:56:36.721	\N	f	\N	2025-11-08 12:51:01.268457	2025-11-08 12:56:36.721	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
2602381c-c374-4505-a43d-109a608d73b1	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762606897088-1hzav.png	objects/ar-uploads/video-1762606897088-b4uwfa.mp4	\N	\N	\N	error	Compilation timeout exceeded 150 seconds. Try a shorter or smaller video.	\N	\N	\N	\N	\N	{"progressPhase": "media-prepared"}	2025-11-08 13:01:37.127	2025-11-08 13:04:07.169	\N	f	\N	2025-11-08 13:01:37.097446	2025-11-08 13:04:07.169	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
1549fcb7-8ff1-468d-978f-bf1c5c9c40a1	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762607272323-oyesn.png	objects/ar-uploads/video-1762607272323-4r4ddq.mp4	\N	\N	\N	processing	\N	\N	\N	\N	\N	\N	{"progressPhase": "media-prepared"}	2025-11-08 13:07:52.362	\N	\N	f	\N	2025-11-08 13:07:52.330542	2025-11-08 13:07:52.524	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
8d5475fb-d851-4535-94e0-68063e9ad033	88f01be3-2d4b-4186-a5f2-d06b58c943d2	\N	objects/ar-uploads/photo-1762611097560-t9p14i.png	objects/ar-uploads/video-1762611097560-jh2tj.mp4	\N	\N	\N	error	MindAR compilation failed: Compilation timeout after 180000ms - no .mind file detected	\N	\N	\N	\N	\N	{"progressPhase": "marker-compiling"}	2025-11-08 14:11:37.586	2025-11-08 14:14:47.517	\N	f	\N	2025-11-08 14:11:37.568322	2025-11-08 14:14:47.517	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
2542bf5b-2a5f-4cba-bdec-067b83c424fa	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762602836394-qipwx8.png	objects/ar-uploads/video-1762602836394-255xhth.mp4	/api/ar-storage/2542bf5b-2a5f-4cba-bdec-067b83c424fa/marker.fset	/api/ar-storage/2542bf5b-2a5f-4cba-bdec-067b83c424fa/marker.fset3	/api/ar-storage/2542bf5b-2a5f-4cba-bdec-067b83c424fa/marker.iset	pending	\N	http://localhost:3000/ar/view/2542bf5b-2a5f-4cba-bdec-067b83c424fa	/api/ar/storage/2542bf5b-2a5f-4cba-bdec-067b83c424fa/index.html	/api/ar/storage/2542bf5b-2a5f-4cba-bdec-067b83c424fa/qr-code.png	\N	\N	\N	2025-11-08 11:53:56.434	2025-11-08 11:59:17.373	320640	f	\N	2025-11-08 11:53:56.4039	2025-11-09 08:49:32.469	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
cc937609-80e5-425c-8cd6-85a85d076403	88f01be3-2d4b-4186-a5f2-d06b58c943d2	\N	objects/ar-uploads/photo-1762613126582-zjcsh9.png	objects/ar-uploads/video-1762613126582-gww14k.mp4	\N	\N	\N	error	MindAR compilation failed: Compilation timeout after 180000ms - no .mind file detected	\N	\N	\N	\N	\N	{"progressPhase": "marker-compiling"}	2025-11-08 14:45:26.623	2025-11-08 14:48:32.976	\N	f	\N	2025-11-08 14:45:26.589849	2025-11-08 14:48:32.976	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
7501847b-0f9c-4694-ad21-dc325633c091	88f01be3-2d4b-4186-a5f2-d06b58c943d2	\N	objects/ar-uploads/photo-1762613732104-ejs77m.png	objects/ar-uploads/video-1762613732104-dwlp0ak.mp4	\N	\N	\N	processing	\N	\N	\N	\N	\N	\N	{"progressPhase": "marker-compiling"}	2025-11-08 14:55:32.135	\N	\N	f	\N	2025-11-08 14:55:32.1111	2025-11-08 14:55:32.333	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
10ecbc3e-0751-4512-8848-849641f419c5	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763490159215-fso5lo.png	objects/ar-uploads/video-1763490159215-537qb.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/10ecbc3e-0751-4512-8848-849641f419c5	/api/ar/storage/10ecbc3e-0751-4512-8848-849641f419c5/index.html	/api/ar/storage/10ecbc3e-0751-4512-8848-849641f419c5/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 18:22:39.257	2025-11-18 18:23:42.802	62400	f	\N	2025-11-18 18:22:39.223977	2025-11-18 18:23:42.802	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
97463506-6e2a-4d26-a225-ae56c99da3e6	88f01be3-2d4b-4186-a5f2-d06b58c943d2	\N	objects/ar-uploads/photo-1762613945629-v16j9.jpg	objects/ar-uploads/video-1762613945629-mixsb2b.mp4	\N	\N	\N	error	MindAR compilation failed: Compilation timeout after 180000ms - no .mind file detected	\N	\N	\N	\N	\N	{"progressPhase": "marker-compiling"}	2025-11-08 14:59:05.672	2025-11-08 15:04:33.598	\N	f	\N	2025-11-08 14:59:05.63645	2025-11-08 15:04:33.598	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
b6d4b24e-79b8-47d6-baa8-248c7a70f859	88f01be3-2d4b-4186-a5f2-d06b58c943d2	\N	objects/ar-uploads/photo-1762614435615-30jkaf.png	objects/ar-uploads/video-1762614435615-jcht8.mp4	\N	\N	\N	processing	\N	\N	\N	\N	\N	\N	{"progressPhase": "marker-compiling"}	2025-11-08 15:07:15.668	\N	\N	f	\N	2025-11-08 15:07:15.624078	2025-11-08 15:07:15.87	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
79689aec-81c7-4296-b7a5-d4bc993ba847	88f01be3-2d4b-4186-a5f2-d06b58c943d2	\N	objects/ar-uploads/photo-1762614535898-v7avcq.png	objects/ar-uploads/video-1762614535898-jyqeug.mp4	\N	\N	\N	error	MindAR compilation failed: Compilation timeout after 180000ms - no .mind file detected	\N	\N	\N	\N	\N	{"progressPhase": "marker-compiling"}	2025-11-08 15:08:55.95	2025-11-08 15:14:29.87	\N	f	\N	2025-11-08 15:08:55.906161	2025-11-08 15:14:29.87	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
1937b868-baa9-490d-b034-51926d37730b	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763484332535-xwj54o.png	objects/ar-uploads/video-1763484332535-dxrg8.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/1937b868-baa9-490d-b034-51926d37730b	/api/ar/storage/1937b868-baa9-490d-b034-51926d37730b/index.html	/api/ar/storage/1937b868-baa9-490d-b034-51926d37730b/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 16:45:32.636	2025-11-18 16:46:47.745	68920	f	\N	2025-11-18 16:45:32.54121	2025-11-18 16:46:47.746	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
1ebe7e8e-718f-4223-bb2c-6cdf7fd91ac5	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763491557053-2t6e7.png	objects/ar-uploads/video-1763491557053-lvzzlk.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/1ebe7e8e-718f-4223-bb2c-6cdf7fd91ac5	/api/ar/storage/1ebe7e8e-718f-4223-bb2c-6cdf7fd91ac5/index.html	/api/ar/storage/1ebe7e8e-718f-4223-bb2c-6cdf7fd91ac5/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 18:45:57.149	2025-11-18 18:47:08.491	70661	f	\N	2025-11-18 18:45:57.071413	2025-11-18 18:47:08.491	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
0f309e55-598a-44ef-911c-d9c7c341232c	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763486142223-kyrpp.png	objects/ar-uploads/video-1763486142223-2yeb6t.mp4	\N	\N	\N	ready	\N	https://whole-webs-go.loca.lt/ar/view/0f309e55-598a-44ef-911c-d9c7c341232c	/api/ar/storage/0f309e55-598a-44ef-911c-d9c7c341232c/index.html	/api/ar/storage/0f309e55-598a-44ef-911c-d9c7c341232c/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 17:15:42.258	2025-11-18 17:16:34.48	51906	f	\N	2025-11-18 17:15:42.232409	2025-11-18 17:16:34.48	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
ebb15707-5a79-4433-adb0-10b533e08af3	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763492904520-uqui9p.png	objects/ar-uploads/video-1763492904520-hx2vu.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/ebb15707-5a79-4433-adb0-10b533e08af3	/api/ar/storage/ebb15707-5a79-4433-adb0-10b533e08af3/index.html	/api/ar/storage/ebb15707-5a79-4433-adb0-10b533e08af3/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 19:08:24.566	2025-11-18 19:09:22.8	56879	f	\N	2025-11-18 19:08:24.528637	2025-11-18 19:09:22.8	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
ed24bac1-d8c1-4e2f-9c15-9dcb8533efd9	88f01be3-2d4b-4186-a5f2-d06b58c943d2	\N	objects/ar-uploads/photo-1762615099427-tln21.png	objects/ar-uploads/video-1762615099427-q2zkyf.mp4	\N	\N	\N	error	Item Живое фото 1 marker compilation failed: Compilation timeout after 180000ms - no .mind file detected	http://localhost:3000/ar/view/ed24bac1-d8c1-4e2f-9c15-9dcb8533efd9	/api/ar/storage/ed24bac1-d8c1-4e2f-9c15-9dcb8533efd9/index.html	/api/ar/storage/ed24bac1-d8c1-4e2f-9c15-9dcb8533efd9/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-09 10:56:58.873	2025-11-09 11:02:16.917	75537	f	\N	2025-11-08 15:18:19.439998	2025-11-09 11:02:16.917	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
954ff67d-13df-4bb9-a55f-98ac06503f2d	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763481378439-m2t9tps.png	objects/ar-uploads/video-1763481378439-d8wwur.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/954ff67d-13df-4bb9-a55f-98ac06503f2d	/api/ar/storage/954ff67d-13df-4bb9-a55f-98ac06503f2d/index.html	/api/ar/storage/954ff67d-13df-4bb9-a55f-98ac06503f2d/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 15:56:18.476	2025-11-18 15:57:10.269	51429	f	\N	2025-11-18 15:56:18.445935	2025-11-18 15:57:10.269	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
8f74ccf0-fffd-4253-b866-9dde00a8f122	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763482324238-olhd29.png	objects/ar-uploads/video-1763482324238-r0hzz.mp4	\N	\N	\N	processing	\N	\N	\N	\N	\N	\N	{"progressPhase": "marker-compiling"}	2025-11-18 16:12:04.285	\N	\N	f	\N	2025-11-18 16:12:04.246793	2025-11-18 16:12:04.91	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
407deb24-f37d-4c2d-9377-582051c13cc9	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763490481311-uwntx8.png	objects/ar-uploads/video-1763490481311-lz6xft.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/407deb24-f37d-4c2d-9377-582051c13cc9	/api/ar/storage/407deb24-f37d-4c2d-9377-582051c13cc9/index.html	/api/ar/storage/407deb24-f37d-4c2d-9377-582051c13cc9/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "videoScale": {"width": 1, "height": 1.0394179894179898}, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0.03571428571428573, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-18 18:28:01.337	2025-11-18 18:28:58.447	56648	f	\N	2025-11-18 18:28:01.314787	2025-11-18 18:38:51.709	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	t	0.0000	0.0357	0.0000	\N	\N	\N	f	500.00	\N	f	\N
ef09d7a2-8f9d-4a48-a00f-445551de07d6	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763486454552-tw1yh.png	objects/ar-uploads/video-1763486454552-iyakv.mp4	\N	\N	\N	ready	\N	https://whole-webs-go.loca.lt/ar/view/ef09d7a2-8f9d-4a48-a00f-445551de07d6	/api/ar/storage/ef09d7a2-8f9d-4a48-a00f-445551de07d6/index.html	/api/ar/storage/ef09d7a2-8f9d-4a48-a00f-445551de07d6/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 17:20:54.587	2025-11-18 17:21:52.742	56524	f	\N	2025-11-18 17:20:54.560386	2025-11-18 17:21:52.742	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
e3ca3ca0-6290-419e-9c09-07d68a9059a2	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763484626301-834xqj.png	objects/ar-uploads/video-1763484626301-xmbzuvc.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/e3ca3ca0-6290-419e-9c09-07d68a9059a2	/api/ar/storage/e3ca3ca0-6290-419e-9c09-07d68a9059a2/index.html	/api/ar/storage/e3ca3ca0-6290-419e-9c09-07d68a9059a2/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "videoScale": {"width": 1, "height": 1.0037037037037035}, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0.02380952380952381, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-18 16:50:26.363	2025-11-18 16:51:25.463	57593	f	\N	2025-11-18 16:50:26.313282	2025-11-18 17:05:43.523	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	t	0.0000	0.0238	0.0000	\N	\N	\N	f	500.00	\N	f	\N
fbf98061-c0d0-4418-bf6e-e37ab95d60f1	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763493563839-i205gh.png	objects/ar-uploads/video-1763493563839-7fd86d.mp4	\N	\N	\N	ready	\N	http://192.168.42.157:5002/ar/view/fbf98061-c0d0-4418-bf6e-e37ab95d60f1	/api/ar/storage/fbf98061-c0d0-4418-bf6e-e37ab95d60f1/index.html	/api/ar/storage/fbf98061-c0d0-4418-bf6e-e37ab95d60f1/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 19:19:23.884	2025-11-18 19:20:18.094	52590	f	\N	2025-11-18 19:19:23.84845	2025-11-18 19:20:18.094	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
bf6ef79a-ab47-4d78-9be7-32817effe46c	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1762687120253-umpo6.jpg	objects/ar-uploads/video-1762687120253-vdyz9q.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/bf6ef79a-ab47-4d78-9be7-32817effe46c	/api/ar/storage/bf6ef79a-ab47-4d78-9be7-32817effe46c/index.html	/api/ar/storage/bf6ef79a-ab47-4d78-9be7-32817effe46c/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "videoScale": {"width": 1, "height": 1.25}, "progressPhase": "qr-generated", "videoPosition": {"x": -0.005952380952381098, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-09 11:53:04.793	2025-11-09 11:53:38.586	31668	f	\N	2025-11-09 11:18:40.262038	2025-11-09 11:53:38.586	1200	1500	1080	1920	11657	0.8000	0.5625	contain	0.7031	1.2500	t	-0.0060	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
0030aeb0-b5fc-48e1-bfee-d43c62e28767	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763481764881-28m1k.png	objects/ar-uploads/video-1763481764881-edbaaa.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/0030aeb0-b5fc-48e1-bfee-d43c62e28767	/api/ar/storage/0030aeb0-b5fc-48e1-bfee-d43c62e28767/index.html	/api/ar/storage/0030aeb0-b5fc-48e1-bfee-d43c62e28767/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 16:02:44.922	2025-11-18 16:03:34.502	49268	f	\N	2025-11-18 16:02:44.885829	2025-11-18 16:03:34.502	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
7f43a2f4-f60e-4362-ae5f-38257c41df48	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763491875236-cgg5j.png	objects/ar-uploads/video-1763491875236-rkt9u9.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/7f43a2f4-f60e-4362-ae5f-38257c41df48	/api/ar/storage/7f43a2f4-f60e-4362-ae5f-38257c41df48/index.html	/api/ar/storage/7f43a2f4-f60e-4362-ae5f-38257c41df48/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 18:51:15.294	2025-11-18 18:52:11.5	55771	f	\N	2025-11-18 18:51:15.249912	2025-11-18 18:52:11.5	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
261bb418-10e6-4be6-9712-918531520230	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763495073542-umc0xy.png	objects/ar-uploads/video-1763495073542-ygo7j.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/261bb418-10e6-4be6-9712-918531520230	/api/ar/storage/261bb418-10e6-4be6-9712-918531520230/index.html	/api/ar/storage/261bb418-10e6-4be6-9712-918531520230/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 19:44:33.569	2025-11-18 19:45:25.548	51600	f	\N	2025-11-18 19:44:33.548986	2025-11-18 19:45:25.548	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
04ce0d0e-d9fb-46e2-ad25-d89ad1c74a22	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763482554508-i2sox2.png	objects/ar-uploads/video-1763482554508-jozycc.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/04ce0d0e-d9fb-46e2-ad25-d89ad1c74a22	/api/ar/storage/04ce0d0e-d9fb-46e2-ad25-d89ad1c74a22/index.html	/api/ar/storage/04ce0d0e-d9fb-46e2-ad25-d89ad1c74a22/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 16:15:54.544	2025-11-18 16:16:55.836	60174	f	\N	2025-11-18 16:15:54.518222	2025-11-18 16:16:55.836	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
5b85a753-89c4-4295-8a39-94f1f829b395	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763497257377-h7hyjjq.png	objects/ar-uploads/video-1763497257377-btofx5.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/5b85a753-89c4-4295-8a39-94f1f829b395	/api/ar/storage/5b85a753-89c4-4295-8a39-94f1f829b395/index.html	/api/ar/storage/5b85a753-89c4-4295-8a39-94f1f829b395/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 20:20:57.743	2025-11-18 20:22:02.684	60076	f	\N	2025-11-18 20:20:57.638244	2025-11-18 20:22:02.684	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
a00f52ac-6ec9-4ff6-8c62-41dff27566d5	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763494511850-kgldh6.png	objects/ar-uploads/video-1763494511850-z9o9e.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/a00f52ac-6ec9-4ff6-8c62-41dff27566d5	/api/ar/storage/a00f52ac-6ec9-4ff6-8c62-41dff27566d5/index.html	/api/ar/storage/a00f52ac-6ec9-4ff6-8c62-41dff27566d5/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 19:35:11.887	2025-11-18 19:36:13.881	60852	f	\N	2025-11-18 19:35:11.859719	2025-11-18 19:36:13.881	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
16bdd3ca-0665-49a1-9333-1f4c8fbe3361	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763498962755-lnpn8.png	objects/ar-uploads/video-1763498962755-9yfggb.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/16bdd3ca-0665-49a1-9333-1f4c8fbe3361	/api/ar/storage/16bdd3ca-0665-49a1-9333-1f4c8fbe3361/index.html	/api/ar/storage/16bdd3ca-0665-49a1-9333-1f4c8fbe3361/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 20:49:22.833	2025-11-18 20:50:17.97	54034	f	\N	2025-11-18 20:49:22.766568	2025-11-18 20:50:17.97	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
4b2a03ec-ac59-42b3-b723-5c875621ab66	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763555145414-879h1c.png	objects/ar-uploads/video-1763555145414-mr8opf.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/4b2a03ec-ac59-42b3-b723-5c875621ab66	/api/ar/storage/4b2a03ec-ac59-42b3-b723-5c875621ab66/index.html	/api/ar/storage/4b2a03ec-ac59-42b3-b723-5c875621ab66/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 12:25:45.453	2025-11-19 12:26:28.815	42323	f	\N	2025-11-19 12:25:45.425194	2025-11-19 12:26:28.815	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
89181a30-8cbd-40c4-a2d3-6fdf99b5cd14	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763494719312-mgzq4r.png	objects/ar-uploads/video-1763494719312-83v7li.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/89181a30-8cbd-40c4-a2d3-6fdf99b5cd14	/api/ar/storage/89181a30-8cbd-40c4-a2d3-6fdf99b5cd14/index.html	/api/ar/storage/89181a30-8cbd-40c4-a2d3-6fdf99b5cd14/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 19:38:39.347	2025-11-18 19:39:38.703	57889	f	\N	2025-11-18 19:38:39.318803	2025-11-18 19:39:38.703	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
9727af99-416c-4348-94ae-398cb557848f	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763491185891-x8caym.png	objects/ar-uploads/video-1763491185891-k03oo.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/9727af99-416c-4348-94ae-398cb557848f	/api/ar/storage/9727af99-416c-4348-94ae-398cb557848f/index.html	/api/ar/storage/9727af99-416c-4348-94ae-398cb557848f/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 18:39:45.911	2025-11-18 18:40:37.385	51105	f	\N	2025-11-18 18:39:45.898646	2025-11-18 18:40:37.385	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
f8c2fd5f-07ba-4e5e-8c95-96ba090dfb38	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763485404398-9m5kb.jpg	objects/ar-uploads/video-1763485404398-z3ox8u.mp4	\N	\N	\N	ready	\N	https://whole-webs-go.loca.lt/ar/view/f8c2fd5f-07ba-4e5e-8c95-96ba090dfb38	/api/ar/storage/f8c2fd5f-07ba-4e5e-8c95-96ba090dfb38/index.html	/api/ar/storage/f8c2fd5f-07ba-4e5e-8c95-96ba090dfb38/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "videoScale": {"width": 1, "height": 1.25}, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-18 17:03:24.455	2025-11-18 17:05:03.342	96413	f	\N	2025-11-18 17:03:24.405204	2025-11-18 17:14:05.271	1200	1500	1080	1920	11657	0.8000	0.5625	contain	0.7031	1.2500	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
1bb82349-efb4-4531-b2a4-61e71820464a	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763482012187-1547ci.png	objects/ar-uploads/video-1763482012187-ea2hj5.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/1bb82349-efb4-4531-b2a4-61e71820464a	/api/ar/storage/1bb82349-efb4-4531-b2a4-61e71820464a/index.html	/api/ar/storage/1bb82349-efb4-4531-b2a4-61e71820464a/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 16:06:52.228	2025-11-18 16:07:47.774	55015	f	\N	2025-11-18 16:06:52.192774	2025-11-18 16:07:47.774	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
3936043b-c9d2-40ca-ba03-d1f3e0c2c9eb	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763494183786-gasmfp.png	objects/ar-uploads/video-1763494183786-izlwp.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/3936043b-c9d2-40ca-ba03-d1f3e0c2c9eb	/api/ar/storage/3936043b-c9d2-40ca-ba03-d1f3e0c2c9eb/index.html	/api/ar/storage/3936043b-c9d2-40ca-ba03-d1f3e0c2c9eb/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 19:29:43.829	2025-11-18 19:30:45.485	60065	f	\N	2025-11-18 19:29:43.799458	2025-11-18 19:30:45.486	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
bb0f63f2-fdbc-4be5-8f0f-6abcb1bd418f	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763489578053-k14ud8.png	objects/ar-uploads/video-1763489578053-j2lqam.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/bb0f63f2-fdbc-4be5-8f0f-6abcb1bd418f	/api/ar/storage/bb0f63f2-fdbc-4be5-8f0f-6abcb1bd418f/index.html	/api/ar/storage/bb0f63f2-fdbc-4be5-8f0f-6abcb1bd418f/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 18:12:58.186	2025-11-18 18:13:56.766	57317	f	\N	2025-11-18 18:12:58.062653	2025-11-18 18:13:56.766	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
dc2acde7-13ec-4b25-a9dd-2fd7b7f05893	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763499489973-f6xpqf.png	objects/ar-uploads/video-1763499489973-10x0zr.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/dc2acde7-13ec-4b25-a9dd-2fd7b7f05893	/api/ar/storage/dc2acde7-13ec-4b25-a9dd-2fd7b7f05893/index.html	/api/ar/storage/dc2acde7-13ec-4b25-a9dd-2fd7b7f05893/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 20:58:10.023	2025-11-18 20:58:58.105	47129	f	\N	2025-11-18 20:58:09.983856	2025-11-18 20:58:58.105	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
389a436e-10a6-4416-ac64-14a515d49fe5	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763492070410-roxvbm.png	objects/ar-uploads/video-1763492070410-pmkkv.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/389a436e-10a6-4416-ac64-14a515d49fe5	/api/ar/storage/389a436e-10a6-4416-ac64-14a515d49fe5/index.html	/api/ar/storage/389a436e-10a6-4416-ac64-14a515d49fe5/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 18:54:30.466	2025-11-18 18:55:31.047	58143	f	\N	2025-11-18 18:54:30.453558	2025-11-18 18:55:31.047	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
5986137e-31ff-44f8-a85e-ef5681447d78	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763496461515-adkqb.png	objects/ar-uploads/video-1763496461515-035z46.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/5986137e-31ff-44f8-a85e-ef5681447d78	/api/ar/storage/5986137e-31ff-44f8-a85e-ef5681447d78/index.html	/api/ar/storage/5986137e-31ff-44f8-a85e-ef5681447d78/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 20:07:41.57	2025-11-18 20:08:49.31	65876	f	\N	2025-11-18 20:07:41.522281	2025-11-18 20:08:49.31	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
92c3489b-660f-4bb3-98b1-bdedd4539cd8	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763536852443-xmazoc.png	objects/ar-uploads/video-1763536852443-sq7cnd.mp4	\N	\N	\N	ready	\N	https://wrote-rate-docs-expenses.trycloudflare.com/ar/view/92c3489b-660f-4bb3-98b1-bdedd4539cd8	/api/ar/storage/92c3489b-660f-4bb3-98b1-bdedd4539cd8/index.html	/api/ar/storage/92c3489b-660f-4bb3-98b1-bdedd4539cd8/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 07:20:52.471	2025-11-19 07:21:39.117	45458	f	\N	2025-11-19 07:20:52.452802	2025-11-19 07:21:39.117	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
281352a4-ce57-4d12-8861-1a39bf22d66d	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763498439962-sogry3.png	objects/ar-uploads/video-1763498439962-f0l71ll.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/281352a4-ce57-4d12-8861-1a39bf22d66d	/api/ar/storage/281352a4-ce57-4d12-8861-1a39bf22d66d/index.html	/api/ar/storage/281352a4-ce57-4d12-8861-1a39bf22d66d/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-18 20:40:39.99	2025-11-18 20:41:52.975	71355	f	\N	2025-11-18 20:40:39.969424	2025-11-18 20:41:52.975	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
3525e205-abe7-467a-bd64-a51494aa08f2	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763536554256-8sl7s4.png	objects/ar-uploads/video-1763536554256-fwafo.mp4	\N	\N	\N	ready	\N	https://wrote-rate-docs-expenses.trycloudflare.com/ar/view/3525e205-abe7-467a-bd64-a51494aa08f2	/api/ar/storage/3525e205-abe7-467a-bd64-a51494aa08f2/index.html	/api/ar/storage/3525e205-abe7-467a-bd64-a51494aa08f2/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 07:15:54.341	2025-11-19 07:16:51.086	51313	f	\N	2025-11-19 07:15:54.264514	2025-11-19 07:16:51.086	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
68601edf-8dcd-4ed7-b089-ae5b9b43c80a	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763537100250-zku69.png	objects/ar-uploads/video-1763537100250-kykpy.mp4	\N	\N	\N	ready	\N	https://wrote-rate-docs-expenses.trycloudflare.com/ar/view/68601edf-8dcd-4ed7-b089-ae5b9b43c80a	/api/ar/storage/68601edf-8dcd-4ed7-b089-ae5b9b43c80a/index.html	/api/ar/storage/68601edf-8dcd-4ed7-b089-ae5b9b43c80a/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 07:25:00.276	2025-11-19 07:25:40.083	39539	f	\N	2025-11-19 07:25:00.258427	2025-11-19 07:25:40.083	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
fb511f0d-1a4a-44a9-9410-302b5fb18057	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763667273393-dwi5zn.png	objects/ar-uploads/video-1763667273393-pwpis.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/fb511f0d-1a4a-44a9-9410-302b5fb18057	/api/ar/storage/fb511f0d-1a4a-44a9-9410-302b5fb18057/index.html	/api/ar/storage/fb511f0d-1a4a-44a9-9410-302b5fb18057/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 19:34:33.512	2025-11-20 19:35:17.651	41980	f	\N	2025-11-20 19:34:33.401271	2025-11-20 19:35:17.651	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
593948d7-5fbc-4b01-b52c-934f2c44e716	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763580080266-a9w9nm.png	objects/ar-uploads/video-1763580080266-to2fs6.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/593948d7-5fbc-4b01-b52c-934f2c44e716	/api/ar/storage/593948d7-5fbc-4b01-b52c-934f2c44e716/index.html	/api/ar/storage/593948d7-5fbc-4b01-b52c-934f2c44e716/qr-code.png	\N	\N	{"loop": true, "fitMode": "stretch", "autoPlay": true, "videoScale": {"width": 1, "height": 1}, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-19 19:21:20.292	2025-11-19 19:22:02.629	41287	f	\N	2025-11-19 19:21:20.275337	2025-11-19 20:19:48.637	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
c2e2840a-b8fa-48bf-86d1-4e9c81a26724	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763665583654-1ph3zc.png	objects/ar-uploads/video-1763665583654-znbsg.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/c2e2840a-b8fa-48bf-86d1-4e9c81a26724	/api/ar/storage/c2e2840a-b8fa-48bf-86d1-4e9c81a26724/index.html	/api/ar/storage/c2e2840a-b8fa-48bf-86d1-4e9c81a26724/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 19:06:23.679	2025-11-20 19:07:08.443	43398	f	\N	2025-11-20 19:06:23.662367	2025-11-20 19:07:08.443	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
c6e8ac02-c2fb-4b84-803c-cdb04e9374b9	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763640775230-9vl03l.png	objects/ar-uploads/video-1763640775230-m8rm7.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/c6e8ac02-c2fb-4b84-803c-cdb04e9374b9	/api/ar/storage/c6e8ac02-c2fb-4b84-803c-cdb04e9374b9/index.html	/api/ar/storage/c6e8ac02-c2fb-4b84-803c-cdb04e9374b9/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 12:12:55.266	2025-11-20 12:13:50.439	54026	f	\N	2025-11-20 12:12:55.24755	2025-11-20 12:13:50.439	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
74b7600d-bedf-4784-b795-707f67e1e0a4	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763556394130-pwsrt9.png	objects/ar-uploads/video-1763556394130-6ur8k.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/74b7600d-bedf-4784-b795-707f67e1e0a4	/api/ar/storage/74b7600d-bedf-4784-b795-707f67e1e0a4/index.html	/api/ar/storage/74b7600d-bedf-4784-b795-707f67e1e0a4/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 12:46:34.158	2025-11-19 12:47:25.913	51399	f	\N	2025-11-19 12:46:34.140275	2025-11-19 12:47:25.913	1024	1536	720	1280	14329	0.6667	0.5625	contain	0.8438	1.5000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
7fa6ac42-3024-4239-b61f-86fd9223ea39	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763668524713-3xys1b.png	objects/ar-uploads/video-1763668524713-ptys9l.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/7fa6ac42-3024-4239-b61f-86fd9223ea39	/api/ar/storage/7fa6ac42-3024-4239-b61f-86fd9223ea39/index.html	/api/ar/storage/7fa6ac42-3024-4239-b61f-86fd9223ea39/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 19:55:24.741	2025-11-20 19:56:09.729	44016	f	\N	2025-11-20 19:55:24.724304	2025-11-20 19:56:09.729	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
e010b0c9-9cdb-4e4f-95a2-c7506fc05086	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763587794000-987r1a.png	objects/ar-uploads/video-1763587794000-72ntfb.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/e010b0c9-9cdb-4e4f-95a2-c7506fc05086	/api/ar/storage/e010b0c9-9cdb-4e4f-95a2-c7506fc05086/index.html	/api/ar/storage/e010b0c9-9cdb-4e4f-95a2-c7506fc05086/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 21:29:54.057	2025-11-19 21:30:36.859	41447	f	\N	2025-11-19 21:29:54.013976	2025-11-19 21:30:36.86	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
b1566f3a-0f86-42b7-a80e-4f85ef743580	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763669155161-6v6ewx.png	objects/ar-uploads/video-1763669155161-rac05c.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/b1566f3a-0f86-42b7-a80e-4f85ef743580	/api/ar/storage/b1566f3a-0f86-42b7-a80e-4f85ef743580/index.html	/api/ar/storage/b1566f3a-0f86-42b7-a80e-4f85ef743580/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 20:05:55.181	2025-11-20 20:06:38.134	41619	f	\N	2025-11-20 20:05:55.16803	2025-11-20 20:06:38.134	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
2a54fd8e-ba86-4528-b10e-452086382957	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763558910240-65qrm.png	objects/ar-uploads/video-1763558910240-5t3okw.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/2a54fd8e-ba86-4528-b10e-452086382957	/api/ar/storage/2a54fd8e-ba86-4528-b10e-452086382957/index.html	/api/ar/storage/2a54fd8e-ba86-4528-b10e-452086382957/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 13:28:30.278	2025-11-19 13:29:15.025	42819	f	\N	2025-11-19 13:28:30.25239	2025-11-19 13:29:15.025	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
db6ab85a-504a-4eeb-8e30-b0bd5d41ce4f	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763669783529-izr5u.png	objects/ar-uploads/video-1763669783529-tmpmc.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/db6ab85a-504a-4eeb-8e30-b0bd5d41ce4f	/api/ar/storage/db6ab85a-504a-4eeb-8e30-b0bd5d41ce4f/index.html	/api/ar/storage/db6ab85a-504a-4eeb-8e30-b0bd5d41ce4f/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 20:16:23.551	2025-11-20 20:17:06.891	42408	f	\N	2025-11-20 20:16:23.537643	2025-11-20 20:17:06.891	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
65753f0d-6d91-4fe3-8e63-18c757c4dd39	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763662466976-1llm5d.png	objects/ar-uploads/video-1763662466976-qccak.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/65753f0d-6d91-4fe3-8e63-18c757c4dd39	/api/ar/storage/65753f0d-6d91-4fe3-8e63-18c757c4dd39/index.html	/api/ar/storage/65753f0d-6d91-4fe3-8e63-18c757c4dd39/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 18:14:27.004	2025-11-20 18:15:26.516	58607	f	\N	2025-11-20 18:14:26.988689	2025-11-20 18:15:26.516	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
demo-1763805518235-oazzomd	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763805518235-oazzomd/photo.jpg	objects/ar-storage/demo-1763805518235-oazzomd/video.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/demo-1763805518235-oazzomd	/api/ar/storage/demo-1763805518235-oazzomd/index.html	/api/ar/storage/demo-1763805518235-oazzomd/qr-code.png	\N	\N	\N	2025-11-22 09:58:38.276	2025-11-22 10:00:41.214	120143	f	\N	2025-11-22 09:58:38.254959	2025-11-22 10:00:41.214	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 09:58:38.251
deec9afa-bcf0-4cf2-be63-bcdb2f0c2d2d	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763539737091-le5i6w.png	objects/ar-uploads/video-1763539737091-u0jv6b.mp4	\N	\N	\N	ready	\N	https://chatty-jars-call.loca.lt/ar/view/deec9afa-bcf0-4cf2-be63-bcdb2f0c2d2d	/api/ar/storage/deec9afa-bcf0-4cf2-be63-bcdb2f0c2d2d/index.html	/api/ar/storage/deec9afa-bcf0-4cf2-be63-bcdb2f0c2d2d/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 08:08:57.162	2025-11-19 08:09:50.937	52712	f	\N	2025-11-19 08:08:57.101876	2025-11-19 08:09:50.937	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
78df212c-593b-4e3c-bf28-afb611df1388	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763540128313-fmqekc.png	objects/ar-uploads/video-1763540128313-c9hys.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/78df212c-593b-4e3c-bf28-afb611df1388	/api/ar/storage/78df212c-593b-4e3c-bf28-afb611df1388/index.html	/api/ar/storage/78df212c-593b-4e3c-bf28-afb611df1388/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 08:15:28.347	2025-11-19 08:16:13.917	44577	f	\N	2025-11-19 08:15:28.322053	2025-11-19 08:16:13.917	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
16632435-f7d1-4baa-974f-869b93806909	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763666050878-c6vwif.png	objects/ar-uploads/video-1763666050878-n632f.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/16632435-f7d1-4baa-974f-869b93806909	/api/ar/storage/16632435-f7d1-4baa-974f-869b93806909/index.html	/api/ar/storage/16632435-f7d1-4baa-974f-869b93806909/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 19:14:10.899	2025-11-20 19:14:54.794	42684	f	\N	2025-11-20 19:14:10.883443	2025-11-20 19:14:54.794	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
a2967e62-e469-4532-b58a-c9981641e0f4	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763641463305-xwyc9.png	objects/ar-uploads/video-1763641463305-s2m9rn.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/a2967e62-e469-4532-b58a-c9981641e0f4	/api/ar/storage/a2967e62-e469-4532-b58a-c9981641e0f4/index.html	/api/ar/storage/a2967e62-e469-4532-b58a-c9981641e0f4/qr-code.png	\N	\N	{"loop": true, "fitMode": "stretch", "autoPlay": true, "cropRegion": {"x": 0.0661376953125, "y": 0.0849420790506606, "width": 0.8677249000186013, "height": 0.7922781808035715}, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-20 12:24:23.35	2025-11-20 12:25:16.604	52212	f	\N	2025-11-20 12:24:23.313351	2025-11-20 12:43:03.165	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
a5b351ee-c508-4f03-ba82-2ff9b9e08aa1	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763585488252-qeajnb.png	objects/ar-uploads/video-1763585488252-1v463.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/a5b351ee-c508-4f03-ba82-2ff9b9e08aa1	/api/ar/storage/a5b351ee-c508-4f03-ba82-2ff9b9e08aa1/index.html	/api/ar/storage/a5b351ee-c508-4f03-ba82-2ff9b9e08aa1/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "videoScale": {"width": 0.998412214006697, "height": 1.3703703703703705}, "progressPhase": "qr-generated", "videoPosition": {"x": -0.023809523809523808, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-19 20:51:28.288	2025-11-19 20:52:11.343	42212	f	\N	2025-11-19 20:51:28.260451	2025-11-19 21:29:06.568	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	t	-0.0238	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
6b4c317c-af47-4537-ae85-0b0c8930ba7d	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763667595243-0f9opf.png	objects/ar-uploads/video-1763667595243-432s2o.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/6b4c317c-af47-4537-ae85-0b0c8930ba7d	/api/ar/storage/6b4c317c-af47-4537-ae85-0b0c8930ba7d/index.html	/api/ar/storage/6b4c317c-af47-4537-ae85-0b0c8930ba7d/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 19:39:55.269	2025-11-20 19:40:40.994	44198	f	\N	2025-11-20 19:39:55.250893	2025-11-20 19:40:40.994	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
4972ab1b-0730-4944-a273-983e1c9105ad	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763625469706-tsn1k.png	objects/ar-uploads/video-1763625469706-dg6e59.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/4972ab1b-0730-4944-a273-983e1c9105ad	/api/ar/storage/4972ab1b-0730-4944-a273-983e1c9105ad/index.html	/api/ar/storage/4972ab1b-0730-4944-a273-983e1c9105ad/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "cropRegion": {"x": 0.10228826063787, "y": 0.13667959559378012, "width": 0.8007152267711352, "height": 0.6397683279854914}, "videoScale": {"width": 1, "height": 1}, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-20 07:57:49.746	2025-11-20 07:58:52.887	57379	f	\N	2025-11-20 07:57:49.714586	2025-11-20 10:57:13.588	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
af874b70-a748-47e5-9405-0a290e91089a	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763588512172-73nb7d.png	objects/ar-uploads/video-1763588512172-fu2yw.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/af874b70-a748-47e5-9405-0a290e91089a	/api/ar/storage/af874b70-a748-47e5-9405-0a290e91089a/index.html	/api/ar/storage/af874b70-a748-47e5-9405-0a290e91089a/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 21:41:52.201	2025-11-19 21:42:38.63	45252	f	\N	2025-11-19 21:41:52.178185	2025-11-19 21:42:38.63	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
85f6457e-c98d-4842-8ee3-bdfbedcf3491	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763671664015-kkpple.png	objects/ar-uploads/video-1763671664015-81w56.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/85f6457e-c98d-4842-8ee3-bdfbedcf3491	/api/ar/storage/85f6457e-c98d-4842-8ee3-bdfbedcf3491/index.html	/api/ar/storage/85f6457e-c98d-4842-8ee3-bdfbedcf3491/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 20:47:44.04	2025-11-20 20:48:27.908	42875	f	\N	2025-11-20 20:47:44.023799	2025-11-20 20:48:27.908	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
aca9f0b4-4eda-4e98-81c6-79e0694eecda	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763659252975-3d810f.png	objects/ar-uploads/video-1763659252975-79acfj.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/aca9f0b4-4eda-4e98-81c6-79e0694eecda	/api/ar/storage/aca9f0b4-4eda-4e98-81c6-79e0694eecda/index.html	/api/ar/storage/aca9f0b4-4eda-4e98-81c6-79e0694eecda/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 17:20:53.044	2025-11-20 17:21:42.159	47818	f	\N	2025-11-20 17:20:52.985769	2025-11-20 17:21:42.159	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
9e5ccc9c-d75a-4f54-934f-b9c763547e8f	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763660677267-wikzpn.png	objects/ar-uploads/video-1763660677267-73qjvm.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/9e5ccc9c-d75a-4f54-934f-b9c763547e8f	/api/ar/storage/9e5ccc9c-d75a-4f54-934f-b9c763547e8f/index.html	/api/ar/storage/9e5ccc9c-d75a-4f54-934f-b9c763547e8f/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 17:44:37.296	2025-11-20 17:45:48.535	70085	f	\N	2025-11-20 17:44:37.277294	2025-11-20 17:45:48.536	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
c6d67d68-cf70-4983-bb00-1d28e62e95c9	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763663224974-ir5e4.png	objects/ar-uploads/video-1763663224974-eln3zs.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/c6d67d68-cf70-4983-bb00-1d28e62e95c9	/api/ar/storage/c6d67d68-cf70-4983-bb00-1d28e62e95c9/index.html	/api/ar/storage/c6d67d68-cf70-4983-bb00-1d28e62e95c9/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 18:27:05.013	2025-11-20 18:27:50.962	44781	f	\N	2025-11-20 18:27:04.980757	2025-11-20 18:27:50.962	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
233af8e0-8241-434e-ba75-a2dc5e6595fa	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763540665083-u3zrkp.png	objects/ar-uploads/video-1763540665083-6xzvyl.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/233af8e0-8241-434e-ba75-a2dc5e6595fa	/api/ar/storage/233af8e0-8241-434e-ba75-a2dc5e6595fa/index.html	/api/ar/storage/233af8e0-8241-434e-ba75-a2dc5e6595fa/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 08:24:25.107	2025-11-19 08:25:08.851	43483	f	\N	2025-11-19 08:24:25.091948	2025-11-19 08:25:08.851	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
403230f9-0f01-4b68-9c9f-af130ded8b4d	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763586077289-ei8kao.png	objects/ar-uploads/video-1763586077289-mac0neu.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/403230f9-0f01-4b68-9c9f-af130ded8b4d	/api/ar/storage/403230f9-0f01-4b68-9c9f-af130ded8b4d/index.html	/api/ar/storage/403230f9-0f01-4b68-9c9f-af130ded8b4d/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 21:01:17.324	2025-11-19 21:02:01.861	43596	f	\N	2025-11-19 21:01:17.296625	2025-11-19 21:02:01.861	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
c1d33e01-b832-406e-8fa7-b4ff596f04f8	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763666549143-dmfimf.png	objects/ar-uploads/video-1763666549143-6yjq7m.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/c1d33e01-b832-406e-8fa7-b4ff596f04f8	/api/ar/storage/c1d33e01-b832-406e-8fa7-b4ff596f04f8/index.html	/api/ar/storage/c1d33e01-b832-406e-8fa7-b4ff596f04f8/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 19:22:29.173	2025-11-20 19:23:16.612	46487	f	\N	2025-11-20 19:22:29.151943	2025-11-20 19:23:16.612	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
e7ef339f-3aba-421f-8d7a-c445e6c6f1a1	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763588861663-qsxd9f.png	objects/ar-uploads/video-1763588861663-dorx3.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/e7ef339f-3aba-421f-8d7a-c445e6c6f1a1	/api/ar/storage/e7ef339f-3aba-421f-8d7a-c445e6c6f1a1/index.html	/api/ar/storage/e7ef339f-3aba-421f-8d7a-c445e6c6f1a1/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "videoScale": {"width": 0.6994710286458334, "height": 0.6439151985935432}, "progressPhase": "qr-generated", "videoPosition": {"x": -0.00529145740327381, "y": 0.10846572149367562, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-19 21:47:41.692	2025-11-19 21:48:30.261	47740	f	\N	2025-11-19 21:47:41.672118	2025-11-19 22:00:42.031	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	t	-0.0053	0.1085	0.0000	\N	\N	\N	f	500.00	\N	f	\N
6cae31e8-2a1a-47f4-8315-190ed2a8b3d3	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763582205109-0p8xxb.png	objects/ar-uploads/video-1763582205109-9czaqb.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/6cae31e8-2a1a-47f4-8315-190ed2a8b3d3	/api/ar/storage/6cae31e8-2a1a-47f4-8315-190ed2a8b3d3/index.html	/api/ar/storage/6cae31e8-2a1a-47f4-8315-190ed2a8b3d3/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "videoScale": {"width": 1, "height": 1}, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0.014285714285714278, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-19 19:56:45.178	2025-11-19 19:57:45.999	54622	f	\N	2025-11-19 19:56:45.119085	2025-11-19 20:04:09.968	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	t	0.0000	0.0143	0.0000	\N	\N	\N	f	500.00	\N	f	\N
332af143-0d3d-483d-9f39-827c66231022	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763667947878-591cg.png	objects/ar-uploads/video-1763667947878-u7pd9b.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/332af143-0d3d-483d-9f39-827c66231022	/api/ar/storage/332af143-0d3d-483d-9f39-827c66231022/index.html	/api/ar/storage/332af143-0d3d-483d-9f39-827c66231022/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 19:45:47.907	2025-11-20 19:46:34.169	45020	f	\N	2025-11-20 19:45:47.888571	2025-11-20 19:46:34.169	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
a42fa3bc-ffca-41fe-be20-491cc655697f	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763636287450-4lj1xk.png	objects/ar-uploads/video-1763636287450-su2rhv.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/a42fa3bc-ffca-41fe-be20-491cc655697f	/api/ar/storage/a42fa3bc-ffca-41fe-be20-491cc655697f/index.html	/api/ar/storage/a42fa3bc-ffca-41fe-be20-491cc655697f/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "cropRegion": {"x": 0.0017589986401021496, "y": 0.09034751391318774, "width": 0.9982410013598979, "height": 0.7285713696571853}, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-20 10:58:07.502	2025-11-20 10:58:55.818	47349	f	\N	2025-11-20 10:58:07.460142	2025-11-20 12:25:16.383	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
ecf6641f-1b17-485a-af7f-0ab27dd3cd82	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763642515743-ourgg.png	objects/ar-uploads/video-1763642515743-mrg4l.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/ecf6641f-1b17-485a-af7f-0ab27dd3cd82	/api/ar/storage/ecf6641f-1b17-485a-af7f-0ab27dd3cd82/index.html	/api/ar/storage/ecf6641f-1b17-485a-af7f-0ab27dd3cd82/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 12:41:55.802	2025-11-20 12:42:53.1	56331	f	\N	2025-11-20 12:41:55.764122	2025-11-20 12:42:53.1	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
3250d6c5-1c53-4970-ab05-547115e839b6	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763659504051-h3102l.png	objects/ar-uploads/video-1763659504051-tmaf1r.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/3250d6c5-1c53-4970-ab05-547115e839b6	/api/ar/storage/3250d6c5-1c53-4970-ab05-547115e839b6/index.html	/api/ar/storage/3250d6c5-1c53-4970-ab05-547115e839b6/qr-code.png	\N	\N	{"loop": true, "fitMode": "contain", "autoPlay": true, "cropRegion": {"x": 0, "y": 0, "width": 1, "height": 1}, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-20 17:25:04.085	2025-11-20 17:25:43.928	38970	f	\N	2025-11-20 17:25:04.062112	2025-11-20 17:47:42.927	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
f2771a77-6e30-44f0-b004-7e6d9121682e	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763661057735-f7fw1.png	objects/ar-uploads/video-1763661057735-boark.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/f2771a77-6e30-44f0-b004-7e6d9121682e	/api/ar/storage/f2771a77-6e30-44f0-b004-7e6d9121682e/index.html	/api/ar/storage/f2771a77-6e30-44f0-b004-7e6d9121682e/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 17:50:57.785	2025-11-20 17:52:05.767	67577	f	\N	2025-11-20 17:50:57.744775	2025-11-20 17:52:05.767	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
230d482e-8884-486b-8067-4595240bf40c	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763664180840-s5q6ee.png	objects/ar-uploads/video-1763664180840-63u9ox.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/230d482e-8884-486b-8067-4595240bf40c	/api/ar/storage/230d482e-8884-486b-8067-4595240bf40c/index.html	/api/ar/storage/230d482e-8884-486b-8067-4595240bf40c/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 18:43:00.875	2025-11-20 18:43:45.396	43185	f	\N	2025-11-20 18:43:00.852955	2025-11-20 18:43:45.396	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
6988b12b-a0e0-472d-8a5d-1c9c1c9b05f2	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763541456883-gvzb9.png	objects/ar-uploads/video-1763541456883-gwq0cf.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/6988b12b-a0e0-472d-8a5d-1c9c1c9b05f2	/api/ar/storage/6988b12b-a0e0-472d-8a5d-1c9c1c9b05f2/index.html	/api/ar/storage/6988b12b-a0e0-472d-8a5d-1c9c1c9b05f2/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 08:37:36.909	2025-11-19 08:38:23.125	45307	f	\N	2025-11-19 08:37:36.891038	2025-11-19 08:38:23.125	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
3ad925ab-1dab-4bcf-ac15-75260e245927	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763554778762-l0q37f.png	objects/ar-uploads/video-1763554778762-okzqwi.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/3ad925ab-1dab-4bcf-ac15-75260e245927	/api/ar/storage/3ad925ab-1dab-4bcf-ac15-75260e245927/index.html	/api/ar/storage/3ad925ab-1dab-4bcf-ac15-75260e245927/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 12:19:38.805	2025-11-19 12:20:28.44	48659	f	\N	2025-11-19 12:19:38.772635	2025-11-19 12:20:28.44	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
demo-1763835586306-4a3sl9w	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763835586306-4a3sl9w/photo.jpg	objects/ar-storage/demo-1763835586306-4a3sl9w/video.mp4	\N	\N	\N	error	MindAR compilation failed: MindAR initialization failed. Make sure dependencies are installed:\nnpm install mind-ar@1.2.5 canvas@2.11.2 @tensorflow/tfjs-node@4.15.0 @msgpack/msgpack@3.0.0-beta2	\N	\N	\N	\N	\N	\N	2025-11-22 18:19:46.353466	2025-11-22 22:19:48.352	\N	f	\N	2025-11-22 18:19:46.317985	2025-11-22 22:19:48.352	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 18:19:46.312
5bda3a47-7342-4a3c-bb5e-26503c8b7a71	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763709657621-82j4mr.png	objects/ar-uploads/video-1763709657621-1l4ad.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/5bda3a47-7342-4a3c-bb5e-26503c8b7a71	/api/ar/storage/5bda3a47-7342-4a3c-bb5e-26503c8b7a71/index.html	/api/ar/storage/5bda3a47-7342-4a3c-bb5e-26503c8b7a71/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-21 07:20:57.688	2025-11-21 07:21:57.985	54614	f	\N	2025-11-21 07:20:57.629077	2025-11-21 07:21:57.985	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
6154e387-5e9a-47cf-b5f9-c04d083b7929	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763710833481-ad72i.png	objects/ar-uploads/video-1763710833481-dhju2.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/6154e387-5e9a-47cf-b5f9-c04d083b7929	/api/ar/storage/6154e387-5e9a-47cf-b5f9-c04d083b7929/index.html	/api/ar/storage/6154e387-5e9a-47cf-b5f9-c04d083b7929/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-21 07:40:33.513	2025-11-21 07:41:20.834	46775	f	\N	2025-11-21 07:40:33.490434	2025-11-21 07:41:20.834	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
c304be05-4004-4ce2-a7df-25708460857e	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763668285969-uzmrgc.png	objects/ar-uploads/video-1763668285969-kqp1p.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/c304be05-4004-4ce2-a7df-25708460857e	/api/ar/storage/c304be05-4004-4ce2-a7df-25708460857e/index.html	/api/ar/storage/c304be05-4004-4ce2-a7df-25708460857e/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 19:51:25.996	2025-11-20 19:52:10.295	43108	f	\N	2025-11-20 19:51:25.979402	2025-11-20 19:52:10.295	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
a8a2a7e9-5f98-40c3-b486-1f5f83a74179	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763661552967-4jm47.png	objects/ar-uploads/video-1763661552967-gsvrda.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/a8a2a7e9-5f98-40c3-b486-1f5f83a74179	/api/ar/storage/a8a2a7e9-5f98-40c3-b486-1f5f83a74179/index.html	/api/ar/storage/a8a2a7e9-5f98-40c3-b486-1f5f83a74179/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 17:59:12.991	2025-11-20 17:59:56.151	42380	f	\N	2025-11-20 17:59:12.973393	2025-11-20 17:59:56.151	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
9944ec74-bac9-4fd8-8c50-0002655bdec6	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763587059864-2jm29s.png	objects/ar-uploads/video-1763587059864-8wivoa.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/9944ec74-bac9-4fd8-8c50-0002655bdec6	/api/ar/storage/9944ec74-bac9-4fd8-8c50-0002655bdec6/index.html	/api/ar/storage/9944ec74-bac9-4fd8-8c50-0002655bdec6/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-19 21:17:39.902	2025-11-19 21:18:24.948	43994	f	\N	2025-11-19 21:17:39.87594	2025-11-19 21:18:24.948	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
56ca2e45-20b0-4571-ba50-78a936916bca	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763667074646-qggora.png	objects/ar-uploads/video-1763667074646-2f6gf.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/56ca2e45-20b0-4571-ba50-78a936916bca	/api/ar/storage/56ca2e45-20b0-4571-ba50-78a936916bca/index.html	/api/ar/storage/56ca2e45-20b0-4571-ba50-78a936916bca/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 19:31:14.67	2025-11-20 19:31:59.859	44179	f	\N	2025-11-20 19:31:14.651952	2025-11-20 19:31:59.859	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
03862fe6-984d-4c21-b97f-f23ec3b8480a	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763669400378-wbpvv.png	objects/ar-uploads/video-1763669400378-rxgrr.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/03862fe6-984d-4c21-b97f-f23ec3b8480a	/api/ar/storage/03862fe6-984d-4c21-b97f-f23ec3b8480a/index.html	/api/ar/storage/03862fe6-984d-4c21-b97f-f23ec3b8480a/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 20:10:00.401	2025-11-20 20:10:45.907	44590	f	\N	2025-11-20 20:10:00.387296	2025-11-20 20:10:45.907	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
ea7e1d7b-55ad-460c-bf17-e1fe3b49f603	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763668783171-pvwj4.png	objects/ar-uploads/video-1763668783171-wnipgf.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/ea7e1d7b-55ad-460c-bf17-e1fe3b49f603	/api/ar/storage/ea7e1d7b-55ad-460c-bf17-e1fe3b49f603/index.html	/api/ar/storage/ea7e1d7b-55ad-460c-bf17-e1fe3b49f603/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 19:59:43.198	2025-11-20 20:00:28.932	44278	f	\N	2025-11-20 19:59:43.182167	2025-11-20 20:00:28.932	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
6415ddad-af12-4796-a7fc-b8fbd97414b5	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763639887278-pzmbwp.png	objects/ar-uploads/video-1763639887278-319oq6.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/6415ddad-af12-4796-a7fc-b8fbd97414b5	/api/ar/storage/6415ddad-af12-4796-a7fc-b8fbd97414b5/index.html	/api/ar/storage/6415ddad-af12-4796-a7fc-b8fbd97414b5/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 11:58:07.328	2025-11-20 11:59:14.437	65846	f	\N	2025-11-20 11:58:07.289922	2025-11-20 11:59:14.437	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
a141d844-9c0b-4d79-8893-6dc85a7f8df6	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763671285779-df9vwh.png	objects/ar-uploads/video-1763671285779-w12t6.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/a141d844-9c0b-4d79-8893-6dc85a7f8df6	/api/ar/storage/a141d844-9c0b-4d79-8893-6dc85a7f8df6/index.html	/api/ar/storage/a141d844-9c0b-4d79-8893-6dc85a7f8df6/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 20:41:25.84	2025-11-20 20:42:12.566	45303	f	\N	2025-11-20 20:41:25.788117	2025-11-20 20:42:12.566	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
d7815e2f-fc1d-4e5f-80f0-94b41929ed6a	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763664569292-k1s4l4.png	objects/ar-uploads/video-1763664569292-mt9gnd.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/d7815e2f-fc1d-4e5f-80f0-94b41929ed6a	/api/ar/storage/d7815e2f-fc1d-4e5f-80f0-94b41929ed6a/index.html	/api/ar/storage/d7815e2f-fc1d-4e5f-80f0-94b41929ed6a/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-20 18:49:29.32	2025-11-20 18:50:18.283	48050	f	\N	2025-11-20 18:49:29.302354	2025-11-20 18:50:18.283	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
d422c5b2-d7f5-4bef-9109-e77cc6ba3ef2	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763711977279-76sibn.png	objects/ar-uploads/video-1763711977279-3yagkc.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/d422c5b2-d7f5-4bef-9109-e77cc6ba3ef2	/api/ar/storage/d422c5b2-d7f5-4bef-9109-e77cc6ba3ef2/index.html	/api/ar/storage/d422c5b2-d7f5-4bef-9109-e77cc6ba3ef2/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-21 07:59:37.309	2025-11-21 08:00:22.385	43616	f	\N	2025-11-21 07:59:37.291744	2025-11-21 08:00:22.385	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
demo-1763817973667-sswkgcc	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763817973667-sswkgcc/photo.jpg	objects/ar-storage/demo-1763817973667-sswkgcc/video.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/demo-1763817973667-sswkgcc	/api/ar/storage/demo-1763817973667-sswkgcc/index.html	/api/ar/storage/demo-1763817973667-sswkgcc/qr-code.png	\N	\N	\N	2025-11-22 13:26:13.803257	2025-11-22 17:28:02.823	106518	f	\N	2025-11-22 13:26:13.689526	2025-11-22 17:28:02.823	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 13:26:13.686
fd4b243b-56a2-4883-a56c-f19df5654609	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763735004505-fcs09.jpg	objects/ar-uploads/video-1763735004505-givz5p.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/fd4b243b-56a2-4883-a56c-f19df5654609	/api/ar/storage/fd4b243b-56a2-4883-a56c-f19df5654609/index.html	/api/ar/storage/fd4b243b-56a2-4883-a56c-f19df5654609/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-21 14:23:24.583	2025-11-21 14:25:18.657	110078	f	\N	2025-11-21 14:23:24.518295	2025-11-21 14:25:18.657	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
04663767-26a8-4a04-91c9-a3d04020ae07	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763751273105-bbd2eb.jpg	objects/ar-uploads/video-1763751273105-4yim18.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/04663767-26a8-4a04-91c9-a3d04020ae07	/api/ar/storage/04663767-26a8-4a04-91c9-a3d04020ae07/index.html	/api/ar/storage/04663767-26a8-4a04-91c9-a3d04020ae07/qr-code.png	\N	\N	{"fitMode": "cover", "forceSquare": true, "progressPhase": "qr-generated"}	2025-11-21 18:54:33.128	2025-11-21 18:56:40.621	123789	f	\N	2025-11-21 18:54:33.112029	2025-11-21 18:56:40.622	4961	4961	560	560	6042	1.0000	1.0000	cover	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
1d166e9b-1ce8-4ca8-b208-57d5c1e15cb4	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763755015021-t6vglo.jpg	objects/ar-uploads/video-1763755015021-uut3td.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/1d166e9b-1ce8-4ca8-b208-57d5c1e15cb4	/api/ar/storage/1d166e9b-1ce8-4ca8-b208-57d5c1e15cb4/index.html	/api/ar/storage/1d166e9b-1ce8-4ca8-b208-57d5c1e15cb4/qr-code.png	\N	\N	{"fitMode": "cover", "forceSquare": true, "progressPhase": "qr-generated"}	2025-11-21 19:56:55.056	2025-11-21 19:58:52.56	113306	f	\N	2025-11-21 19:56:55.039898	2025-11-21 19:58:52.56	4961	4961	560	560	6042	1.0000	1.0000	cover	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
1763797328905-lr5orm1	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/1763797328905-lr5orm1/photo.jpg	objects/ar-storage/1763797328905-lr5orm1/video.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/1763797328905-lr5orm1	/api/ar/storage/1763797328905-lr5orm1/index.html	/api/ar/storage/1763797328905-lr5orm1/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-22 07:42:08.925	2025-11-22 07:44:11.201	118998	f	\N	2025-11-22 07:42:08.912333	2025-11-22 07:44:11.201	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	8538bfec-eb00-46d3-950d-8cb82f28febf	f	\N
demo-1763802355566-ipw0p4j	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763802355566-ipw0p4j/photo.jpg	objects/ar-storage/demo-1763802355566-ipw0p4j/video.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/demo-1763802355566-ipw0p4j	/api/ar/storage/demo-1763802355566-ipw0p4j/index.html	/api/ar/storage/demo-1763802355566-ipw0p4j/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-22 09:05:55.608	2025-11-22 09:07:57.016	117928	f	\N	2025-11-22 09:05:55.596628	2025-11-22 09:08:36.44	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-24 09:05:55.591
demo-1763805960268-uumdhpb	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763805960268-uumdhpb/photo.jpg	objects/ar-storage/demo-1763805960268-uumdhpb/video.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/demo-1763805960268-uumdhpb	/api/ar/storage/demo-1763805960268-uumdhpb/index.html	/api/ar/storage/demo-1763805960268-uumdhpb/qr-code.png	\N	\N	\N	2025-11-22 10:06:01.002	2025-11-22 10:08:10.583	127206	f	\N	2025-11-22 10:06:00.300287	2025-11-22 10:08:10.583	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 10:06:00.295
demo-1763812430225-hr7mysw	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763812430225-hr7mysw/photo.jpg	objects/ar-storage/demo-1763812430225-hr7mysw/video.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/demo-1763812430225-hr7mysw	/api/ar/storage/demo-1763812430225-hr7mysw/index.html	/api/ar/storage/demo-1763812430225-hr7mysw/qr-code.png	\N	\N	\N	2025-11-22 11:53:50.409438	2025-11-22 15:55:54.257	120702	f	\N	2025-11-22 11:53:50.266554	2025-11-22 15:55:54.257	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 11:53:50.26
0bbd5556-43e0-4cc5-8a79-d7cfceb5da3b	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764099262239-mhez4hn-photo-0.jpg	/objects/uploads/demo-1764099262239-mhez4hn-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/0bbd5556-43e0-4cc5-8a79-d7cfceb5da3b	/objects/ar-storage/0bbd5556-43e0-4cc5-8a79-d7cfceb5da3b/index.html	/objects/ar-storage/0bbd5556-43e0-4cc5-8a79-d7cfceb5da3b/qr-code.png	\N	\N	\N	\N	\N	90306	f	\N	2025-11-25 19:34:22.291859	2025-11-25 19:37:27.061	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 19:34:22.259
b1dc70b4-11a2-46d6-9d88-c08366bb9dcd	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763894625415-z85pnb.jpg	objects/ar-uploads/video-1763894625415-mi6txi.mp4	\N	\N	\N	error	MindAR compilation failed: MindAR initialization failed. Make sure dependencies are installed:\nnpm install mind-ar@1.2.5 canvas@2.11.2 @tensorflow/tfjs-node@4.15.0 @msgpack/msgpack@3.0.0-beta2	\N	\N	\N	\N	\N	{"fitMode": "cover", "forceSquare": true}	2025-11-23 10:43:45.567052	2025-11-23 14:43:51.614	\N	f	\N	2025-11-23 10:43:45.423774	2025-11-23 14:43:51.614	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
7b59e666-5d12-4780-9f26-1df21b22c2f1	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764013047496-q21qv4t-photo.jpg	/objects/uploads/demo-1764013047496-q21qv4t-video.mp4	\N	\N	\N	error	The "path" argument must be of type string. Received undefined	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/7b59e666-5d12-4780-9f26-1df21b22c2f1	/objects/ar-storage/7b59e666-5d12-4780-9f26-1df21b22c2f1/index.html	/objects/ar-storage/7b59e666-5d12-4780-9f26-1df21b22c2f1/qr-code.png	\N	\N	\N	2025-11-24 19:51:45.685678	2025-11-24 23:51:45.94	2784	f	\N	2025-11-24 19:37:27.749618	2025-11-24 23:51:45.94	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-25 19:37:27.555
fcf8b613-17b5-4455-a914-30e6b90b23ed	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764059646890-v8ra0ga-photo-0.jpg	/objects/uploads/demo-1764059646890-v8ra0ga-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/fcf8b613-17b5-4455-a914-30e6b90b23ed	/objects/ar-storage/fcf8b613-17b5-4455-a914-30e6b90b23ed/index.html	/objects/ar-storage/fcf8b613-17b5-4455-a914-30e6b90b23ed/qr-code.png	\N	\N	\N	\N	\N	99492	f	\N	2025-11-25 08:34:07.084882	2025-11-25 08:38:26.711	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 08:34:06.955
d7a48603-d4c0-4c72-8a50-57b933c5da85	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763720996361-6vc1.jpg	objects/ar-uploads/video-1763720996361-dwktl9.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/d7a48603-d4c0-4c72-8a50-57b933c5da85	/api/ar/storage/d7a48603-d4c0-4c72-8a50-57b933c5da85/index.html	/api/ar/storage/d7a48603-d4c0-4c72-8a50-57b933c5da85/qr-code.png	\N	\N	{"loop": true, "zoom": 1.2, "fitMode": "cover", "offsetX": -0.2, "offsetY": -0.13, "autoPlay": true, "cropRegion": {"x": 0.08571428571428569, "y": 0.06190476190476189, "width": 0.8261904761904763, "height": 0.8833333333333333}, "aspectLocked": false, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-21 10:29:56.389	2025-11-21 10:30:31.997	33892	f	\N	2025-11-21 10:29:56.371157	2025-11-21 10:49:21.567	842	842	516	720	22998	1.0000	0.7167	contain	1.0000	1.0000	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
981112a6-2395-437f-a4e4-d8c032572171	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763712798562-7sf6o.png	objects/ar-uploads/video-1763712798562-37hh0b.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/981112a6-2395-437f-a4e4-d8c032572171	/api/ar/storage/981112a6-2395-437f-a4e4-d8c032572171/index.html	/api/ar/storage/981112a6-2395-437f-a4e4-d8c032572171/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "cropRegion": {"x": 0, "y": 0.11911196911196908, "width": 0.972844272844273, "height": 0.8208494208494206}, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-21 08:13:18.615	2025-11-21 08:14:02.944	42944	f	\N	2025-11-21 08:13:18.568964	2025-11-21 08:18:01.751	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
45f63d0e-3d5b-428a-8681-8817db56f4d9	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764099590804-i6puu7s-photo-0.jpg	/objects/uploads/demo-1764099590804-i6puu7s-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/45f63d0e-3d5b-428a-8681-8817db56f4d9	/objects/ar-storage/45f63d0e-3d5b-428a-8681-8817db56f4d9/index.html	/objects/ar-storage/45f63d0e-3d5b-428a-8681-8817db56f4d9/qr-code.png	\N	\N	\N	\N	\N	11056	f	\N	2025-11-25 19:39:50.868439	2025-11-25 19:40:15.005	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 19:39:50.83
demo-1763823765255-r4pwhgw	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763823765255-r4pwhgw/photo.jpg	objects/ar-storage/demo-1763823765255-r4pwhgw/video.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/demo-1763823765255-r4pwhgw	/api/ar/storage/demo-1763823765255-r4pwhgw/index.html	/api/ar/storage/demo-1763823765255-r4pwhgw/qr-code.png	\N	\N	\N	2025-11-22 15:02:45.368834	2025-11-22 19:04:43.196	115836	f	\N	2025-11-22 15:02:45.274835	2025-11-22 19:04:43.196	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 15:02:45.271
demo-1763811414437-3vboskh	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763811414437-3vboskh/photo.jpg	objects/ar-storage/demo-1763811414437-3vboskh/video.mp4	\N	\N	\N	error	The "path" argument must be of type string. Received undefined	\N	\N	\N	\N	\N	\N	2025-11-22 11:36:54.694543	2025-11-22 11:36:54.838	\N	f	\N	2025-11-22 11:36:54.458016	2025-11-22 11:36:54.838	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 11:36:54.453
5b5f683e-60d4-4182-87dc-e64b53264206	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763797512672-zpeuw9.jpg	objects/ar-uploads/video-1763797512672-g9wvd.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/5b5f683e-60d4-4182-87dc-e64b53264206	/api/ar/storage/5b5f683e-60d4-4182-87dc-e64b53264206/index.html	/api/ar/storage/5b5f683e-60d4-4182-87dc-e64b53264206/qr-code.png	\N	\N	{"fitMode": "cover", "forceSquare": true, "progressPhase": "qr-generated"}	2025-11-22 07:45:12.702	2025-11-22 07:47:17.881	122608	f	\N	2025-11-22 07:45:12.680918	2025-11-22 07:47:17.881	4961	4961	560	560	6042	1.0000	1.0000	cover	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
96c9913f-81e8-485d-9f39-ce8a2e9d7edb	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763742826167-inpom.jpg	objects/ar-uploads/video-1763742826167-nnuk.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/96c9913f-81e8-485d-9f39-ce8a2e9d7edb	/api/ar/storage/96c9913f-81e8-485d-9f39-ce8a2e9d7edb/index.html	/api/ar/storage/96c9913f-81e8-485d-9f39-ce8a2e9d7edb/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-21 16:33:46.231	2025-11-21 16:35:33.807	103831	f	\N	2025-11-21 16:33:46.174024	2025-11-21 16:35:33.807	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
4fc8e3d7-4eea-410c-a570-0aeb177ab2ec	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764055997502-j711yrj-photo-0.jpg	/objects/uploads/demo-1764055997502-j711yrj-video-0.mp4	\N	\N	\N	error	Invalid input	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	2025-11-25 07:33:18.080477	2025-11-25 07:33:35.166	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 07:33:17.52
2190b363-f512-412e-a8f0-3336680749ce	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763791645029-l0ndr.jpg	objects/ar-uploads/video-1763791645029-ndagfx.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/2190b363-f512-412e-a8f0-3336680749ce	/api/ar/storage/2190b363-f512-412e-a8f0-3336680749ce/index.html	/api/ar/storage/2190b363-f512-412e-a8f0-3336680749ce/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-22 06:07:25.092	2025-11-22 06:09:35.907	123009	f	\N	2025-11-22 06:07:25.037837	2025-11-22 06:09:35.907	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
17e95da9-1d68-434a-b82d-c0b7cb50a6bd	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764066166139-gu2ewmv-photo-0.jpg	/objects/uploads/demo-1764066166139-gu2ewmv-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/17e95da9-1d68-434a-b82d-c0b7cb50a6bd	/objects/ar-storage/17e95da9-1d68-434a-b82d-c0b7cb50a6bd/index.html	/objects/ar-storage/17e95da9-1d68-434a-b82d-c0b7cb50a6bd/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "videoScale": {"width": 0.02, "height": 1}, "aspectLocked": true, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	41192	f	\N	2025-11-25 10:22:46.605596	2025-11-25 11:27:44.374	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	t	2025-11-26 10:22:46.208
0c833cd5-65d3-4237-acdd-6a6d0969eb15	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763751765574-h8du6.jpg	objects/ar-uploads/video-1763751765574-jzkhk.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/0c833cd5-65d3-4237-acdd-6a6d0969eb15	/api/ar/storage/0c833cd5-65d3-4237-acdd-6a6d0969eb15/index.html	/api/ar/storage/0c833cd5-65d3-4237-acdd-6a6d0969eb15/qr-code.png	\N	\N	{"fitMode": "cover", "forceSquare": true, "progressPhase": "qr-generated"}	2025-11-21 19:02:45.641	2025-11-21 19:04:53.4	121579	f	\N	2025-11-21 19:02:45.581937	2025-11-21 19:04:53.4	4961	4961	560	560	6042	1.0000	1.0000	cover	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
e3cff6fb-a06e-4a32-8afc-c053acba8ae4	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763812596732-qlfvzi.jpg	objects/ar-uploads/video-1763812596732-0sgeti.mp4	\N	\N	\N	processing	\N	\N	\N	\N	\N	\N	\N	2025-11-22 11:56:36.812586	\N	\N	f	\N	2025-11-22 11:56:36.743067	2025-11-22 11:56:36.812586	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
demo-1763803179195-gen3puu	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763803179195-gen3puu/photo.jpg	objects/ar-storage/demo-1763803179195-gen3puu/video.mp4	\N	\N	\N	processing	\N	\N	\N	\N	\N	\N	{"progressPhase": "marker-compiling"}	2025-11-22 09:19:39.234	\N	\N	f	\N	2025-11-22 09:19:39.216661	2025-11-22 09:19:39.924	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 09:19:39.213
demo-1763812769128-hpzalz0	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763812769128-hpzalz0/photo.jpg	objects/ar-storage/demo-1763812769128-hpzalz0/video.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/demo-1763812769128-hpzalz0	/api/ar/storage/demo-1763812769128-hpzalz0/index.html	/api/ar/storage/demo-1763812769128-hpzalz0/qr-code.png	\N	\N	\N	2025-11-22 11:59:29.466511	2025-11-22 16:01:20.47	108886	f	\N	2025-11-22 11:59:29.148705	2025-11-22 16:01:20.47	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 11:59:29.143
180244a7-20e3-4ff7-963b-87e84b74946c	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763715125178-5gxqum.jpg	objects/ar-uploads/video-1763715125178-n25dn.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/180244a7-20e3-4ff7-963b-87e84b74946c	/api/ar/storage/180244a7-20e3-4ff7-963b-87e84b74946c/index.html	/api/ar/storage/180244a7-20e3-4ff7-963b-87e84b74946c/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "cropRegion": {"x": 0.016666666666666666, "y": 0.0000000000000002220446049250313, "width": 0.969047619047619, "height": 0.9999999999999998}, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-21 08:52:05.244	2025-11-21 08:52:37.977	32076	f	\N	2025-11-21 08:52:05.186086	2025-11-21 09:08:48.289	842	842	516	720	22998	1.0000	0.7167	contain	0.7167	1.0000	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
41c20310-822b-4c4c-abfa-540ec3037425	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764100218338-hkhf50x-photo-0.jpg	/objects/uploads/demo-1764100218338-hkhf50x-video-0.mp4	\N	\N	\N	processing	\N	\N	\N	\N	\N	\N	{"markersCount": 1}	\N	\N	\N	f	\N	2025-11-25 19:50:18.476407	2025-11-25 19:56:19.664	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-27 19:50:18.355
demo-1763832170606-0zbd3w7	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763832170606-0zbd3w7/photo.jpg	objects/ar-storage/demo-1763832170606-0zbd3w7/video.mp4	\N	\N	\N	error	MindAR compilation failed: MindAR initialization failed. Make sure dependencies are installed:\nnpm install mind-ar@1.2.5 canvas@2.11.2 @tensorflow/tfjs-node@4.15.0 @msgpack/msgpack@3.0.0-beta2	\N	\N	\N	\N	\N	\N	2025-11-22 17:22:50.749768	2025-11-22 21:22:54.133	\N	f	\N	2025-11-22 17:22:50.635301	2025-11-22 21:22:54.133	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 17:22:50.63
34126aaf-5eef-4a44-8bb9-58ea3314dbd0	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763753464353-bu4qpt.jpg	objects/ar-uploads/video-1763753464353-49fnjp.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/34126aaf-5eef-4a44-8bb9-58ea3314dbd0	/api/ar/storage/34126aaf-5eef-4a44-8bb9-58ea3314dbd0/index.html	/api/ar/storage/34126aaf-5eef-4a44-8bb9-58ea3314dbd0/qr-code.png	\N	\N	{"fitMode": "cover", "forceSquare": true, "progressPhase": "qr-generated"}	2025-11-21 19:31:04.383	2025-11-21 19:33:07.107	119255	f	\N	2025-11-21 19:31:04.360347	2025-11-21 19:33:07.107	4961	4961	560	560	6042	1.0000	1.0000	cover	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
ae9adff3-a9a3-410d-9ef3-523c8fa707c2	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763722493702-d4qk9j.jpg	objects/ar-uploads/video-1763722493702-uad208.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/ae9adff3-a9a3-410d-9ef3-523c8fa707c2	/api/ar/storage/ae9adff3-a9a3-410d-9ef3-523c8fa707c2/index.html	/api/ar/storage/ae9adff3-a9a3-410d-9ef3-523c8fa707c2/qr-code.png	\N	\N	{"fitMode": "cover", "forceSquare": true, "progressPhase": "qr-generated"}	2025-11-21 10:54:53.731	2025-11-21 10:55:32.812	33293	f	\N	2025-11-21 10:54:53.711476	2025-11-21 10:55:32.812	842	842	516	516	22998	1.0000	1.0000	cover	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
075127c2-08be-4cb3-b09b-cafabf2b4bae	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763744176033-am21yd.jpg	objects/ar-uploads/video-1763744176033-y4nsfr.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/075127c2-08be-4cb3-b09b-cafabf2b4bae	/api/ar/storage/075127c2-08be-4cb3-b09b-cafabf2b4bae/index.html	/api/ar/storage/075127c2-08be-4cb3-b09b-cafabf2b4bae/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "aspectLocked": true, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-21 16:56:16.063	2025-11-21 16:58:12.545	113177	f	\N	2025-11-21 16:56:16.043999	2025-11-21 19:43:04.504	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
faed611c-813c-4134-b0cc-8e4bbc3b4a1d	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764057879873-eogik65-photo-0.jpg	/objects/uploads/demo-1764057879873-eogik65-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/faed611c-813c-4134-b0cc-8e4bbc3b4a1d	/objects/ar-storage/faed611c-813c-4134-b0cc-8e4bbc3b4a1d/index.html	/objects/ar-storage/faed611c-813c-4134-b0cc-8e4bbc3b4a1d/qr-code.png	\N	\N	\N	\N	\N	878	f	\N	2025-11-25 08:04:40.397188	2025-11-25 08:04:42.87	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 08:04:39.89
1763796892542-8bmxiix	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/api/ar/storage/1763796892542-8bmxiix/photo.jpg	/api/ar/storage/1763796892542-8bmxiix/video.mp4	\N	\N	\N	error	ENOENT: no such file or directory, copyfile 'C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\api\\ar\\storage\\1763796892542-8bmxiix\\video.mp4' -> 'C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\objects\\ar-storage\\1763796892542-8bmxiix\\video.mp4'	\N	\N	\N	\N	\N	\N	2025-11-22 07:34:52.576	2025-11-22 07:34:53.469	\N	f	\N	2025-11-22 07:34:52.550867	2025-11-22 07:34:53.469	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	f3d7c5d5-901e-4200-a164-1256b0218952	f	\N
demo-1763811570266-7spab3t	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763811570266-7spab3t/photo.jpg	objects/ar-storage/demo-1763811570266-7spab3t/video.mp4	\N	\N	\N	error	The "path" argument must be of type string. Received undefined	\N	\N	\N	\N	\N	\N	2025-11-22 11:39:30.307904	2025-11-22 11:39:30.433	\N	f	\N	2025-11-22 11:39:30.282787	2025-11-22 11:39:30.433	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 11:39:30.279
demo-1763803337702-8qrs5w1	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763803337702-8qrs5w1/photo.jpg	objects/ar-storage/demo-1763803337702-8qrs5w1/video.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/demo-1763803337702-8qrs5w1	/api/ar/storage/demo-1763803337702-8qrs5w1/index.html	/api/ar/storage/demo-1763803337702-8qrs5w1/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-22 09:22:17.738	2025-11-22 09:24:18.533	116935	f	\N	2025-11-22 09:22:17.723341	2025-11-22 09:24:18.533	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 09:22:17.718
57da26d8-d09f-4e22-87e6-845bf150eeda	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763799407561-9pie5.jpg	objects/ar-uploads/video-1763799407561-2eymcv.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/57da26d8-d09f-4e22-87e6-845bf150eeda	/api/ar/storage/57da26d8-d09f-4e22-87e6-845bf150eeda/index.html	/api/ar/storage/57da26d8-d09f-4e22-87e6-845bf150eeda/qr-code.png	\N	\N	{"fitMode": "cover", "forceSquare": true, "progressPhase": "qr-generated"}	2025-11-22 08:16:47.588	2025-11-22 08:18:58.631	127346	f	\N	2025-11-22 08:16:47.567585	2025-11-22 08:18:58.631	4961	4961	560	560	6042	1.0000	1.0000	cover	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
demo-1763811530983-ti2gq1x	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763811530983-ti2gq1x/photo.jpg	objects/ar-storage/demo-1763811530983-ti2gq1x/video.mp4	\N	\N	\N	error	The "path" argument must be of type string. Received undefined	\N	\N	\N	\N	\N	\N	2025-11-22 11:38:51.027598	2025-11-22 11:38:51.146	\N	f	\N	2025-11-22 11:38:50.999573	2025-11-22 11:38:51.146	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 11:38:50.994
6d364adc-a7d0-4533-ac77-fb997fb447ec	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764100266006-k7se3q6-photo-0.jpg	/objects/uploads/demo-1764100266006-k7se3q6-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/6d364adc-a7d0-4533-ac77-fb997fb447ec	/objects/ar-storage/6d364adc-a7d0-4533-ac77-fb997fb447ec/index.html	/objects/ar-storage/6d364adc-a7d0-4533-ac77-fb997fb447ec/qr-code.png	\N	\N	{"markersCount": 2}	\N	\N	31925	f	\N	2025-11-25 19:51:06.176832	2025-11-25 19:52:10.754	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 19:51:06.015
demo-1763834707221-7ytoz3n	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763834707221-7ytoz3n/photo.jpg	objects/ar-storage/demo-1763834707221-7ytoz3n/video.mp4	\N	\N	\N	error	MindAR compilation failed: MindAR initialization failed. Make sure dependencies are installed:\nnpm install mind-ar@1.2.5 canvas@2.11.2 @tensorflow/tfjs-node@4.15.0 @msgpack/msgpack@3.0.0-beta2	\N	\N	\N	\N	\N	\N	2025-11-22 18:05:07.713571	2025-11-22 22:05:11.441	\N	f	\N	2025-11-22 18:05:07.454477	2025-11-22 22:05:11.441	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 18:05:07.444
8d892eaa-430e-4cad-8e71-1a0f6c29139d	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763716187261-9ueq7c.jpg	objects/ar-uploads/video-1763716187261-w0nvny.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/8d892eaa-430e-4cad-8e71-1a0f6c29139d	/api/ar/storage/8d892eaa-430e-4cad-8e71-1a0f6c29139d/index.html	/api/ar/storage/8d892eaa-430e-4cad-8e71-1a0f6c29139d/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "cropRegion": {"x": 0.08809523809523807, "y": 0.0833333333333333, "width": 0.8619047619047617, "height": 0.8333333333333333}, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-21 09:09:47.29	2025-11-21 09:10:20.251	32000	f	\N	2025-11-21 09:09:47.269423	2025-11-21 09:22:34.662	842	842	516	720	22998	1.0000	0.7167	contain	0.7167	1.0000	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
309dc8c1-886b-48c0-8009-0e6ef0d41b1b	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763723947801-dlxd4p.jpg	objects/ar-uploads/video-1763723947801-u1z3u.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/309dc8c1-886b-48c0-8009-0e6ef0d41b1b	/api/ar/storage/309dc8c1-886b-48c0-8009-0e6ef0d41b1b/index.html	/api/ar/storage/309dc8c1-886b-48c0-8009-0e6ef0d41b1b/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-21 11:19:07.841	2025-11-21 11:21:06.526	115765	f	\N	2025-11-21 11:19:07.807978	2025-11-21 11:21:06.526	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
f6f20aa6-3d35-42af-8834-9b03762a6ad2	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764058260667-k401w1g-photo-0.jpg	/objects/uploads/demo-1764058260667-k401w1g-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/f6f20aa6-3d35-42af-8834-9b03762a6ad2	/objects/ar-storage/f6f20aa6-3d35-42af-8834-9b03762a6ad2/index.html	/objects/ar-storage/f6f20aa6-3d35-42af-8834-9b03762a6ad2/qr-code.png	\N	\N	\N	\N	\N	1135	f	\N	2025-11-25 08:11:00.854148	2025-11-25 08:11:05.357	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 08:11:00.685
6600dbe5-52fc-4d09-b27a-af1676fd87ca	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763718071451-q53in.jpg	objects/ar-uploads/video-1763718071451-4sj2pb.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/6600dbe5-52fc-4d09-b27a-af1676fd87ca	/api/ar/storage/6600dbe5-52fc-4d09-b27a-af1676fd87ca/index.html	/api/ar/storage/6600dbe5-52fc-4d09-b27a-af1676fd87ca/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-21 09:41:11.476	2025-11-21 09:41:43.174	31250	f	\N	2025-11-21 09:41:11.460653	2025-11-21 09:41:43.174	842	842	516	720	22998	1.0000	0.7167	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
demo-1763811635577-17cq6ok	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763811635577-17cq6ok/photo.jpg	objects/ar-storage/demo-1763811635577-17cq6ok/video.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/demo-1763811635577-17cq6ok	/api/ar/storage/demo-1763811635577-17cq6ok/index.html	/api/ar/storage/demo-1763811635577-17cq6ok/qr-code.png	\N	\N	\N	2025-11-22 11:40:35.894605	2025-11-22 11:42:44.145	125994	f	\N	2025-11-22 11:40:35.588745	2025-11-22 11:42:44.145	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 11:40:35.582
5387ef54-5311-475e-95db-3b5148c97df0	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763754049175-cwegtm.jpg	objects/ar-uploads/video-1763754049175-270isw.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/5387ef54-5311-475e-95db-3b5148c97df0	/api/ar/storage/5387ef54-5311-475e-95db-3b5148c97df0/index.html	/api/ar/storage/5387ef54-5311-475e-95db-3b5148c97df0/qr-code.png	\N	\N	{"fitMode": "cover", "forceSquare": true, "progressPhase": "qr-generated"}	2025-11-21 19:40:49.207	2025-11-21 19:42:52.893	120001	f	\N	2025-11-21 19:40:49.186474	2025-11-21 19:42:52.893	4961	4961	560	560	6042	1.0000	1.0000	cover	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
1c12ce08-48aa-4a4d-bdf6-21ca6f881869	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763748146973-l05kgl.jpg	objects/ar-uploads/video-1763748146973-oca6cm.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/1c12ce08-48aa-4a4d-bdf6-21ca6f881869	/api/ar/storage/1c12ce08-48aa-4a4d-bdf6-21ca6f881869/index.html	/api/ar/storage/1c12ce08-48aa-4a4d-bdf6-21ca6f881869/qr-code.png	\N	\N	{"fitMode": "cover", "forceSquare": true, "progressPhase": "qr-generated"}	2025-11-21 18:02:27.014	2025-11-21 18:04:36.223	120259	f	\N	2025-11-21 18:02:26.981813	2025-11-21 18:04:36.223	4961	4961	560	560	6042	1.0000	1.0000	cover	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
1763797059029-tnce72f	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/api/ar/storage/1763797059029-tnce72f/photo.jpg	/api/ar/storage/1763797059029-tnce72f/video.mp4	\N	\N	\N	error	ENOENT: no such file or directory, copyfile 'C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\api\\ar\\storage\\1763797059029-tnce72f\\video.mp4' -> 'C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\objects\\ar-storage\\1763797059029-tnce72f\\video.mp4'	\N	\N	\N	\N	\N	\N	2025-11-22 07:37:39.064	2025-11-22 07:37:39.1	\N	f	\N	2025-11-22 07:37:39.048495	2025-11-22 07:37:39.1	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	f3d7c5d5-901e-4200-a164-1256b0218952	f	\N
demo-1763801074717-a3vdd44	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763801074717-a3vdd44/photo.jpg	objects/ar-storage/demo-1763801074717-a3vdd44/video.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/demo-1763801074717-a3vdd44	/api/ar/storage/demo-1763801074717-a3vdd44/index.html	/api/ar/storage/demo-1763801074717-a3vdd44/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-22 08:44:34.755	2025-11-22 08:46:38.825	120659	f	\N	2025-11-22 08:44:34.736587	2025-11-22 08:46:38.825	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 08:44:34.733
demo-1763804067470-45u31zr	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763804067470-45u31zr/photo.jpg	objects/ar-storage/demo-1763804067470-45u31zr/video.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/demo-1763804067470-45u31zr	/api/ar/storage/demo-1763804067470-45u31zr/index.html	/api/ar/storage/demo-1763804067470-45u31zr/qr-code.png	\N	\N	\N	2025-11-22 09:34:27.507	2025-11-22 09:36:21.148	110715	f	\N	2025-11-22 09:34:27.490818	2025-11-22 09:36:21.148	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 09:34:27.484
cac3f1f4-bf0c-4225-9a0c-915534f91530	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763716901656-f31gkr.jpg	objects/ar-uploads/video-1763716901656-q2ps6d.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/cac3f1f4-bf0c-4225-9a0c-915534f91530	/api/ar/storage/cac3f1f4-bf0c-4225-9a0c-915534f91530/index.html	/api/ar/storage/cac3f1f4-bf0c-4225-9a0c-915534f91530/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "cropRegion": {"x": 0.04523809523809523, "y": 0.033333333333333284, "width": 0.8809523809523808, "height": 0.9357142857142854}, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-21 09:21:41.69	2025-11-21 09:22:39.234	53471	f	\N	2025-11-21 09:21:41.664647	2025-11-21 09:40:00.796	842	842	516	720	22998	1.0000	0.7167	contain	1.0000	1.0000	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
f58b54d6-4e25-4b26-a0a1-afb5419605e3	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763750856763-shkvj.jpg	objects/ar-uploads/video-1763750856763-c62ez.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/f58b54d6-4e25-4b26-a0a1-afb5419605e3	/api/ar/storage/f58b54d6-4e25-4b26-a0a1-afb5419605e3/index.html	/api/ar/storage/f58b54d6-4e25-4b26-a0a1-afb5419605e3/qr-code.png	\N	\N	{"fitMode": "cover", "forceSquare": true, "progressPhase": "qr-generated"}	2025-11-21 18:47:36.811	2025-11-21 18:49:37.922	117110	f	\N	2025-11-21 18:47:36.790775	2025-11-21 18:49:37.922	4961	4961	560	560	6042	1.0000	1.0000	cover	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
demo-1763835151946-vyt4w84	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763835151946-vyt4w84/photo.jpg	objects/ar-storage/demo-1763835151946-vyt4w84/video.mp4	\N	\N	\N	error	MindAR compilation failed: MindAR initialization failed. Make sure dependencies are installed:\nnpm install mind-ar@1.2.5 canvas@2.11.2 @tensorflow/tfjs-node@4.15.0 @msgpack/msgpack@3.0.0-beta2	\N	\N	\N	\N	\N	\N	2025-11-22 18:12:32.1301	2025-11-22 22:12:34.213	\N	f	\N	2025-11-22 18:12:32.010991	2025-11-22 22:12:34.213	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 18:12:32.004
1763797207629-s86otal	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/api/ar/storage/1763797207629-s86otal/photo.jpg	/api/ar/storage/1763797207629-s86otal/video.mp4	\N	\N	\N	error	ENOENT: no such file or directory, copyfile 'C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\api\\ar\\storage\\1763797207629-s86otal\\video.mp4' -> 'C:\\Projects\\NextjsBlog\\NextjsBlog-broken-backup\\photobooksgallery\\backend\\objects\\ar-storage\\1763797207629-s86otal\\video.mp4'	\N	\N	\N	\N	\N	\N	2025-11-22 07:40:07.699	2025-11-22 07:40:07.769	\N	f	\N	2025-11-22 07:40:07.670854	2025-11-22 07:40:07.769	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	f3d7c5d5-901e-4200-a164-1256b0218952	f	\N
797e17f6-04f8-419b-ab85-9d4edb281ebb	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763730832138-yzqy7k.jpg	objects/ar-uploads/video-1763730832138-bu1rn.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/797e17f6-04f8-419b-ab85-9d4edb281ebb	/api/ar/storage/797e17f6-04f8-419b-ab85-9d4edb281ebb/index.html	/api/ar/storage/797e17f6-04f8-419b-ab85-9d4edb281ebb/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-21 13:13:52.236	2025-11-21 13:15:46.933	110974	f	\N	2025-11-21 13:13:52.145709	2025-11-21 13:15:46.933	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
dc28eac0-eafa-4957-961a-bb5a8e971fba	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763720236243-5blbl7.jpg	objects/ar-uploads/video-1763720236243-t65bj9.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/dc28eac0-eafa-4957-961a-bb5a8e971fba	/api/ar/storage/dc28eac0-eafa-4957-961a-bb5a8e971fba/index.html	/api/ar/storage/dc28eac0-eafa-4957-961a-bb5a8e971fba/qr-code.png	\N	\N	{"loop": true, "fitMode": "cover", "autoPlay": true, "cropRegion": {"x": 0.0023809523809523794, "y": 0.03333333333333331, "width": 0.9738095238095237, "height": 0.9404761904761904}, "forceSquare": true, "progressPhase": "qr-generated", "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	2025-11-21 10:17:16.281	2025-11-21 10:18:00.646	30730	f	\N	2025-11-21 10:17:16.250872	2025-11-21 10:21:17.802	842	842	516	516	22998	1.0000	1.0000	cover	1.0000	1.0000	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	f	\N
930ad758-3bde-4ec9-a7f2-ae8908f4c8e6	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763720889016-6m6ys.jpg	objects/ar-uploads/video-1763720889016-6cew8k.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/930ad758-3bde-4ec9-a7f2-ae8908f4c8e6	/api/ar/storage/930ad758-3bde-4ec9-a7f2-ae8908f4c8e6/index.html	/api/ar/storage/930ad758-3bde-4ec9-a7f2-ae8908f4c8e6/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-21 10:28:09.051	2025-11-21 10:28:37.799	28251	f	\N	2025-11-21 10:28:09.022499	2025-11-21 10:28:37.799	842	842	516	720	22998	1.0000	0.7167	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
1eb18e93-8a11-47a1-a92d-682b4da95174	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764058660942-1xcx2fh-photo-1.jpg	/objects/uploads/demo-1764058660942-1xcx2fh-video-1.mp4	\N	\N	\N	pending	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	2025-11-25 08:17:41.562093	2025-11-25 08:17:41.562093	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 08:17:40.959
9540a344-861b-4330-9631-b06efcab4a63	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764058660942-1xcx2fh-photo-0.jpg	/objects/uploads/demo-1764058660942-1xcx2fh-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/9540a344-861b-4330-9631-b06efcab4a63	/objects/ar-storage/9540a344-861b-4330-9631-b06efcab4a63/index.html	/objects/ar-storage/9540a344-861b-4330-9631-b06efcab4a63/qr-code.png	\N	\N	\N	\N	\N	2262	f	\N	2025-11-25 08:17:41.513259	2025-11-25 08:17:47.515	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 08:17:40.959
1b27923d-de9f-4a66-9e8b-b3e1449e1bee	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-uploads/photo-1763754650972-ujv24m.jpg	objects/ar-uploads/video-1763754650972-b5u9b.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/1b27923d-de9f-4a66-9e8b-b3e1449e1bee	/api/ar/storage/1b27923d-de9f-4a66-9e8b-b3e1449e1bee/index.html	/api/ar/storage/1b27923d-de9f-4a66-9e8b-b3e1449e1bee/qr-code.png	\N	\N	{"fitMode": "cover", "forceSquare": true, "progressPhase": "qr-generated"}	2025-11-21 19:50:51.003	2025-11-21 19:52:55.928	121500	f	\N	2025-11-21 19:50:50.982738	2025-11-21 19:52:55.928	4961	4961	560	560	6042	1.0000	1.0000	cover	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	f	\N
demo-1763801551611-fflol2l	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763801551611-fflol2l/photo.jpg	objects/ar-storage/demo-1763801551611-fflol2l/video.mp4	\N	\N	\N	ready	\N	http://localhost:3000/ar/view/demo-1763801551611-fflol2l	/api/ar/storage/demo-1763801551611-fflol2l/index.html	/api/ar/storage/demo-1763801551611-fflol2l/qr-code.png	\N	\N	{"progressPhase": "qr-generated"}	2025-11-22 08:52:31.65	2025-11-22 08:53:15.047	42645	f	\N	2025-11-22 08:52:31.641619	2025-11-22 08:53:15.047	864	1184	516	720	22998	0.7297	0.7167	contain	0.9821	1.3704	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 08:52:31.636
demo-1763812076140-phde0op	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763812076140-phde0op/photo.jpg	objects/ar-storage/demo-1763812076140-phde0op/video.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/demo-1763812076140-phde0op	/api/ar/storage/demo-1763812076140-phde0op/index.html	/api/ar/storage/demo-1763812076140-phde0op/qr-code.png	\N	\N	\N	2025-11-22 11:47:56.598273	2025-11-22 15:49:57.566	118196	f	\N	2025-11-22 11:47:56.157369	2025-11-22 15:49:57.566	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 11:47:56.148
demo-1763804755315-fl90gbk	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	objects/ar-storage/demo-1763804755315-fl90gbk/photo.jpg	objects/ar-storage/demo-1763804755315-fl90gbk/video.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/demo-1763804755315-fl90gbk	/api/ar/storage/demo-1763804755315-fl90gbk/index.html	/api/ar/storage/demo-1763804755315-fl90gbk/qr-code.png	\N	\N	\N	2025-11-22 09:45:55.35	2025-11-22 09:47:53.772	115724	f	\N	2025-11-22 09:45:55.327532	2025-11-22 09:47:53.772	4961	4961	560	560	6042	1.0000	1.0000	contain	1.0000	1.0000	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-23 09:45:55.323
e56907e0-991a-41bb-8ba0-6f6de087521e	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764084176501-ed5yfel-photo-0.jpg	/objects/uploads/demo-1764084176501-ed5yfel-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/e56907e0-991a-41bb-8ba0-6f6de087521e	/objects/ar-storage/e56907e0-991a-41bb-8ba0-6f6de087521e/index.html	/objects/ar-storage/e56907e0-991a-41bb-8ba0-6f6de087521e/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "shapeType": "circle", "cropRegion": {"x": 0.1380952380952381, "y": 0.19464285714285706, "width": 0.7071428571428583, "height": 0.5732142857142875}, "aspectLocked": true, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	70779	f	\N	2025-11-25 15:22:56.935601	2025-11-25 15:34:49.843	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	/objects/ar-storage/e56907e0-991a-41bb-8ba0-6f6de087521e/mask-0.png	\N	\N	f	500.00	\N	t	2025-11-26 15:22:56.508
a2587d77-e08a-4df7-bb8a-294cfeb3f856	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764100880033-rm4319e-photo-0.jpg	/objects/uploads/demo-1764100880033-rm4319e-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/a2587d77-e08a-4df7-bb8a-294cfeb3f856	/objects/ar-storage/a2587d77-e08a-4df7-bb8a-294cfeb3f856/index.html	/objects/ar-storage/a2587d77-e08a-4df7-bb8a-294cfeb3f856/qr-code.png	\N	\N	{"markersCount": 2}	\N	\N	28984	f	\N	2025-11-25 20:01:20.179973	2025-11-25 20:02:08.201	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 20:01:20.058
b30c11d4-db7a-41f1-bed1-256d724b9eca	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764081760404-j3mg0m8-photo-0.jpg	/objects/uploads/demo-1764081760404-j3mg0m8-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/b30c11d4-db7a-41f1-bed1-256d724b9eca	/objects/ar-storage/b30c11d4-db7a-41f1-bed1-256d724b9eca/index.html	/objects/ar-storage/b30c11d4-db7a-41f1-bed1-256d724b9eca/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "shapeType": "circle", "cropRegion": {"x": 0, "y": 0, "width": 0.9976190476190476, "height": 0.9892857142857143}, "aspectLocked": true, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	4260	f	\N	2025-11-25 14:42:40.776836	2025-11-25 15:02:08.717	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	/objects/ar-storage/b30c11d4-db7a-41f1-bed1-256d724b9eca/mask-0.png	\N	\N	f	500.00	\N	t	2025-11-26 14:42:40.419
515262cc-e8c3-4d9d-86c8-45f1aad4c689	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764096350933-jasnviw-photo-0.jpg	/objects/uploads/demo-1764096350933-jasnviw-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/515262cc-e8c3-4d9d-86c8-45f1aad4c689	/objects/ar-storage/515262cc-e8c3-4d9d-86c8-45f1aad4c689/index.html	/objects/ar-storage/515262cc-e8c3-4d9d-86c8-45f1aad4c689/qr-code.png	\N	\N	\N	\N	\N	61701	f	\N	2025-11-25 18:45:51.036939	2025-11-25 18:48:35.385	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 18:45:50.962
41146f91-a14d-454a-b37e-6b1407e8f0eb	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764098318315-hn30ts0-photo-0.jpg	/objects/uploads/demo-1764098318315-hn30ts0-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/41146f91-a14d-454a-b37e-6b1407e8f0eb	/objects/ar-storage/41146f91-a14d-454a-b37e-6b1407e8f0eb/index.html	/objects/ar-storage/41146f91-a14d-454a-b37e-6b1407e8f0eb/qr-code.png	\N	\N	\N	\N	\N	7609	f	\N	2025-11-25 19:18:38.414218	2025-11-25 19:18:58.953	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 19:18:38.339
018b44d1-ee66-4787-ad01-44308b146c8b	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764084928593-6nayrnd-photo-0.jpg	/objects/uploads/demo-1764084928593-6nayrnd-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/018b44d1-ee66-4787-ad01-44308b146c8b	/objects/ar-storage/018b44d1-ee66-4787-ad01-44308b146c8b/index.html	/objects/ar-storage/018b44d1-ee66-4787-ad01-44308b146c8b/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "shapeType": "circle", "cropRegion": {"x": 0, "y": 0, "width": 1, "height": 0.9964285714285714}, "aspectLocked": true, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	5740	f	\N	2025-11-25 15:35:28.863187	2025-11-25 15:50:58.188	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	/objects/ar-storage/018b44d1-ee66-4787-ad01-44308b146c8b/mask-0.png	\N	\N	f	500.00	\N	t	2025-11-26 15:35:28.599
11ed3cec-8e31-4eb1-a7d7-55d18ecab42c	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764096946676-ch04zd7-photo-0.jpg	/objects/uploads/demo-1764096946676-ch04zd7-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/11ed3cec-8e31-4eb1-a7d7-55d18ecab42c	/objects/ar-storage/11ed3cec-8e31-4eb1-a7d7-55d18ecab42c/index.html	/objects/ar-storage/11ed3cec-8e31-4eb1-a7d7-55d18ecab42c/qr-code.png	\N	\N	\N	\N	\N	7041	f	\N	2025-11-25 18:55:46.803511	2025-11-25 18:55:57.108	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 18:55:46.722
2d4b3fa6-6e4f-45d0-bb21-57a502c3c0b3	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764145393903-gpytn7p-photo-0.jpg	/objects/uploads/demo-1764145393903-gpytn7p-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/2d4b3fa6-6e4f-45d0-bb21-57a502c3c0b3	/objects/ar-storage/2d4b3fa6-6e4f-45d0-bb21-57a502c3c0b3/index.html	/objects/ar-storage/2d4b3fa6-6e4f-45d0-bb21-57a502c3c0b3/qr-code.png	\N	\N	{"markersCount": 2}	\N	\N	76603	f	\N	2025-11-26 08:23:13.979234	2025-11-26 08:32:06.649	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-27 08:23:13.913
e4f3474c-a826-4faf-8ecf-9b9a69685c8f	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764098067494-9g4000x-photo-0.jpg	/objects/uploads/demo-1764098067494-9g4000x-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/e4f3474c-a826-4faf-8ecf-9b9a69685c8f	/objects/ar-storage/e4f3474c-a826-4faf-8ecf-9b9a69685c8f/index.html	/objects/ar-storage/e4f3474c-a826-4faf-8ecf-9b9a69685c8f/qr-code.png	\N	\N	\N	\N	\N	6686	f	\N	2025-11-25 19:14:27.651754	2025-11-25 19:14:36.008	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 19:14:27.504
541226b6-da28-453d-8768-97d869dab7d2	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764098473886-0y9y29l-photo-0.jpg	/objects/uploads/demo-1764098473886-0y9y29l-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/541226b6-da28-453d-8768-97d869dab7d2	/objects/ar-storage/541226b6-da28-453d-8768-97d869dab7d2/index.html	/objects/ar-storage/541226b6-da28-453d-8768-97d869dab7d2/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "cropRegion": {"x": 0, "y": 0.0017857142857143904, "width": 1, "height": 0.9982142857142856}, "aspectLocked": true, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	43526	f	\N	2025-11-25 19:21:14.017928	2025-11-25 19:24:51.066	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	/api/ar/storage/541226b6-da28-453d-8768-97d869dab7d2/mask.png	4160	6240	f	500.00	\N	t	2025-11-26 19:21:13.92
b324cde8-d0e3-459e-ba2d-c6e0d584d4d6	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764152534728-cnvek7w-photo-0.jpg	/objects/uploads/demo-1764152534728-cnvek7w-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/b324cde8-d0e3-459e-ba2d-c6e0d584d4d6	/objects/ar-storage/b324cde8-d0e3-459e-ba2d-c6e0d584d4d6/index.html	/objects/ar-storage/b324cde8-d0e3-459e-ba2d-c6e0d584d4d6/qr-code.png	\N	\N	{"markersCount": 1}	\N	\N	10306	f	\N	2025-11-26 10:22:15.000693	2025-11-27 08:09:20.928	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-27 10:22:14.734
7f14c395-c27d-4770-97a3-7e3f1da7f72c	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764084075033-kaow2ca-photo-0.jpg	/objects/uploads/demo-1764084075033-kaow2ca-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/7f14c395-c27d-4770-97a3-7e3f1da7f72c	/objects/ar-storage/7f14c395-c27d-4770-97a3-7e3f1da7f72c/index.html	/objects/ar-storage/7f14c395-c27d-4770-97a3-7e3f1da7f72c/qr-code.png	\N	\N	\N	\N	\N	13567	f	\N	2025-11-25 15:21:15.415201	2025-11-25 15:21:32.233	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 15:21:15.092
0624cdca-02f7-4f8f-ae07-c678e329f986	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764085921959-b1jkvpw-photo-0.jpg	/objects/uploads/demo-1764085921959-b1jkvpw-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/0624cdca-02f7-4f8f-ae07-c678e329f986	/objects/ar-storage/0624cdca-02f7-4f8f-ae07-c678e329f986/index.html	/objects/ar-storage/0624cdca-02f7-4f8f-ae07-c678e329f986/qr-code.png	\N	\N	{"loop": true, "zoom": 0.5, "fitMode": "cover", "offsetX": -0.5, "offsetY": -0.5, "autoPlay": true, "shapeType": "circle", "cropRegion": {"x": 0, "y": 0, "width": 1, "height": 1}, "aspectLocked": false, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	16288	f	\N	2025-11-25 15:52:02.232425	2025-11-25 16:29:17.712	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	/objects/ar-storage/0624cdca-02f7-4f8f-ae07-c678e329f986/mask-0.png	\N	\N	f	500.00	\N	t	2025-11-26 15:52:02.041
27f96cb7-3e86-4185-ac61-5025cc2e1583	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764097170635-hcljti2-photo-0.jpg	/objects/uploads/demo-1764097170635-hcljti2-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/27f96cb7-3e86-4185-ac61-5025cc2e1583	/objects/ar-storage/27f96cb7-3e86-4185-ac61-5025cc2e1583/index.html	/objects/ar-storage/27f96cb7-3e86-4185-ac61-5025cc2e1583/qr-code.png	\N	\N	\N	\N	\N	7690	f	\N	2025-11-25 18:59:30.70259	2025-11-25 18:59:39.029	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 18:59:30.662
4263c2ba-e2ca-442a-87f7-a4e9982d3994	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764096068063-jzd1kbm-photo-0.jpg	/objects/uploads/demo-1764096068063-jzd1kbm-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/4263c2ba-e2ca-442a-87f7-a4e9982d3994	/objects/ar-storage/4263c2ba-e2ca-442a-87f7-a4e9982d3994/index.html	/objects/ar-storage/4263c2ba-e2ca-442a-87f7-a4e9982d3994/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "cropRegion": {"x": 0, "y": 0, "width": 0.9976190476190476, "height": 1}, "aspectLocked": true, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	7669	f	\N	2025-11-25 18:41:08.430056	2025-11-25 19:14:16.712	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	t	2025-11-26 18:41:08.081
0e23bd21-e387-4d28-84d9-48953e53915f	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764088535971-xi52wsf-photo-0.jpg	/objects/uploads/demo-1764088535971-xi52wsf-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/0e23bd21-e387-4d28-84d9-48953e53915f	/objects/ar-storage/0e23bd21-e387-4d28-84d9-48953e53915f/index.html	/objects/ar-storage/0e23bd21-e387-4d28-84d9-48953e53915f/qr-code.png	\N	\N	\N	\N	\N	46311	f	\N	2025-11-25 16:35:36.355394	2025-11-25 16:36:31.84	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 16:35:35.992
8810764c-f822-47f6-85b0-633b1fd30ec6	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764088806678-ytfuan8-photo-0.jpg	/objects/uploads/demo-1764088806678-ytfuan8-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/8810764c-f822-47f6-85b0-633b1fd30ec6	/objects/ar-storage/8810764c-f822-47f6-85b0-633b1fd30ec6/index.html	/objects/ar-storage/8810764c-f822-47f6-85b0-633b1fd30ec6/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "shapeType": "oval", "cropRegion": {"x": 0, "y": 0, "width": 0.9976190476190474, "height": 0.9999999999999998}, "aspectLocked": true, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	3256	f	\N	2025-11-25 16:40:06.713288	2025-11-25 17:38:44.402	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	/api/ar/storage/8810764c-f822-47f6-85b0-633b1fd30ec6/mask.png	1500	1500	f	500.00	\N	t	2025-11-26 16:40:06.683
d4707fe8-51f4-4315-88c0-e7b1b949b463	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764088776984-kg1t7h9-photo-0.jpg	/objects/uploads/demo-1764088776984-kg1t7h9-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/d4707fe8-51f4-4315-88c0-e7b1b949b463	/objects/ar-storage/d4707fe8-51f4-4315-88c0-e7b1b949b463/index.html	/objects/ar-storage/d4707fe8-51f4-4315-88c0-e7b1b949b463/qr-code.png	\N	\N	\N	\N	\N	4914	f	\N	2025-11-25 16:39:37.027028	2025-11-25 16:39:44.018	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 16:39:36.993
b65f3642-5be0-4bd6-8752-eddc6603350f	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764090395015-cxlgkl2-photo-0.jpg	/objects/uploads/demo-1764090395015-cxlgkl2-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/b65f3642-5be0-4bd6-8752-eddc6603350f	/objects/ar-storage/b65f3642-5be0-4bd6-8752-eddc6603350f/index.html	/objects/ar-storage/b65f3642-5be0-4bd6-8752-eddc6603350f/qr-code.png	\N	\N	\N	\N	\N	47779	f	\N	2025-11-25 17:06:35.348811	2025-11-25 17:07:34.638	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 17:06:35.036
ee8d4669-8cae-4d9b-a4a2-99b02c22bf48	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764092336153-dqlyn9h-photo-0.jpg	/objects/uploads/demo-1764092336153-dqlyn9h-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/ee8d4669-8cae-4d9b-a4a2-99b02c22bf48	/objects/ar-storage/ee8d4669-8cae-4d9b-a4a2-99b02c22bf48/index.html	/objects/ar-storage/ee8d4669-8cae-4d9b-a4a2-99b02c22bf48/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "shapeType": "circle", "cropRegion": {"x": 0, "y": 0, "width": 0.9976190476190476, "height": 1}, "aspectLocked": true, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	8723	f	\N	2025-11-25 17:38:56.233827	2025-11-25 17:59:21.117	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	/api/ar/storage/ee8d4669-8cae-4d9b-a4a2-99b02c22bf48/mask.png	595	893	f	500.00	\N	t	2025-11-26 17:38:56.169
a2fad531-1689-482a-bb78-31428607377a	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764093867366-zsw41y9-photo-0.jpg	/objects/uploads/demo-1764093867366-zsw41y9-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/a2fad531-1689-482a-bb78-31428607377a	/objects/ar-storage/a2fad531-1689-482a-bb78-31428607377a/index.html	/objects/ar-storage/a2fad531-1689-482a-bb78-31428607377a/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "cropRegion": {"x": 0, "y": 0, "width": 1, "height": 0.9928571428571429}, "aspectLocked": true, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	7378	f	\N	2025-11-25 18:04:27.47375	2025-11-25 18:19:01.473	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	/api/ar/storage/a2fad531-1689-482a-bb78-31428607377a/mask.png	595	893	f	500.00	\N	t	2025-11-26 18:04:27.404
4e7bb323-c82e-4ca9-a25b-c4e44df91900	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764094651171-0nsc6j7-photo-0.jpg	/objects/uploads/demo-1764094651171-0nsc6j7-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/4e7bb323-c82e-4ca9-a25b-c4e44df91900	/objects/ar-storage/4e7bb323-c82e-4ca9-a25b-c4e44df91900/index.html	/objects/ar-storage/4e7bb323-c82e-4ca9-a25b-c4e44df91900/qr-code.png	\N	\N	\N	\N	\N	15129	f	\N	2025-11-25 18:17:31.362251	2025-11-25 18:20:08.438	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 18:17:31.18
3502874c-db0b-4836-a62d-d9cf2b8e0c9e	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764094795923-57s8qaw-photo-0.jpg	/objects/uploads/demo-1764094795923-57s8qaw-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/3502874c-db0b-4836-a62d-d9cf2b8e0c9e	/objects/ar-storage/3502874c-db0b-4836-a62d-d9cf2b8e0c9e/index.html	/objects/ar-storage/3502874c-db0b-4836-a62d-d9cf2b8e0c9e/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "stretch", "offsetX": 0, "offsetY": 0, "autoPlay": true, "aspectLocked": true, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	7114	f	\N	2025-11-25 18:19:55.982332	2025-11-25 18:28:25.539	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	t	2025-11-26 18:19:55.942
2151a706-eee9-495b-9345-c9108d420f47	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764095357732-co6mez2-photo-0.jpg	/objects/uploads/demo-1764095357732-co6mez2-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/2151a706-eee9-495b-9345-c9108d420f47	/objects/ar-storage/2151a706-eee9-495b-9345-c9108d420f47/index.html	/objects/ar-storage/2151a706-eee9-495b-9345-c9108d420f47/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "cropRegion": {"x": 0, "y": 0, "width": 1, "height": 0.9964285714285714}, "aspectLocked": true, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	8164	f	\N	2025-11-25 18:29:17.808536	2025-11-25 18:31:52.283	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	t	2025-11-26 18:29:17.75
b409cbc6-2011-4546-984b-852b7113cf45	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764070150583-u0dz8ls-photo-0.jpg	/objects/uploads/demo-1764070150583-u0dz8ls-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/b409cbc6-2011-4546-984b-852b7113cf45	/objects/ar-storage/b409cbc6-2011-4546-984b-852b7113cf45/index.html	/objects/ar-storage/b409cbc6-2011-4546-984b-852b7113cf45/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "shapeType": "circle", "cropRegion": {"x": 0, "y": 0, "width": 0.9904761904761905, "height": 0.9982142857142857}, "aspectLocked": true, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	60941	f	\N	2025-11-25 11:29:11.031631	2025-11-25 14:15:51.426	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	/objects/ar-storage/b409cbc6-2011-4546-984b-852b7113cf45/mask-0.png	\N	\N	f	500.00	\N	t	2025-11-26 11:29:10.627
23b5d10a-67af-46e9-8eda-804fb26fb37a	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764078293881-3cnnjyu-photo-0.jpg	/objects/uploads/demo-1764078293881-3cnnjyu-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/23b5d10a-67af-46e9-8eda-804fb26fb37a	/objects/ar-storage/23b5d10a-67af-46e9-8eda-804fb26fb37a/index.html	/objects/ar-storage/23b5d10a-67af-46e9-8eda-804fb26fb37a/qr-code.png	\N	\N	\N	\N	\N	3187	f	\N	2025-11-25 13:44:54.776959	2025-11-25 13:45:26.704	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	f	\N	\N	\N	\N	\N	\N	f	500.00	\N	t	2025-11-26 13:44:53.942
55c1d563-18dc-458b-8f8f-3bf81315be4f	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764079582019-q949ytf-photo-0.jpg	/objects/uploads/demo-1764079582019-q949ytf-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/55c1d563-18dc-458b-8f8f-3bf81315be4f	/objects/ar-storage/55c1d563-18dc-458b-8f8f-3bf81315be4f/index.html	/objects/ar-storage/55c1d563-18dc-458b-8f8f-3bf81315be4f/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "shapeType": "circle", "cropRegion": {"x": 0, "y": 0, "width": 0.9904761904761903, "height": 0.9928571428571428}, "aspectLocked": true, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	930	f	\N	2025-11-25 14:06:22.143186	2025-11-25 14:41:37.572	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	/objects/ar-storage/55c1d563-18dc-458b-8f8f-3bf81315be4f/mask-0.png	\N	\N	f	500.00	\N	t	2025-11-26 14:06:22.04
e09fe9ee-7f83-4767-9523-9a0dc6546b8f	be34f57a-0def-4928-a50f-bd33f60d74c2	\N	/objects/uploads/demo-1764082946006-ul2syj0-photo-0.jpg	/objects/uploads/demo-1764082946006-ul2syj0-video-0.mp4	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/e09fe9ee-7f83-4767-9523-9a0dc6546b8f	/objects/ar-storage/e09fe9ee-7f83-4767-9523-9a0dc6546b8f/index.html	/objects/ar-storage/e09fe9ee-7f83-4767-9523-9a0dc6546b8f/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "cropRegion": {"x": 0, "y": 0, "width": 0.9904761904761905, "height": 1}, "aspectLocked": true, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	14823	f	\N	2025-11-25 15:02:26.429003	2025-11-25 15:18:31.257	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	\N	\N	\N	f	500.00	\N	t	2025-11-26 15:02:26.034
\.


--
-- Data for Name: banner_analytics; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.banner_analytics (id, banner_id, event_type, user_id, session_id, page_url, user_agent, ip_address, metadata, created_at) FROM stdin;
294269c4-d44d-4ae2-891b-546ed09384bf	a8f1e589-baac-4e6c-906c-b617f4d130ac	impression	be34f57a-0def-4928-a50f-bd33f60d74c2	62mh7ym5jckmhfzzpv4	http://localhost:8080/	\N	\N	\N	2025-11-01 08:05:56.188108
\.


--
-- Data for Name: banners; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.banners (id, name, type, title, content, image_url, button_text, button_link, background_color, text_color, "position", size, priority, is_active, status, start_date, end_date, target_pages, target_users, max_impressions, max_clicks, current_impressions, current_clicks, created_at, updated_at) FROM stdin;
a8f1e589-baac-4e6c-906c-b617f4d130ac	Тестовый баннер / 2025-11-01T08:05:45.493Z	header	{"en": "Test banner", "hy": "Թեստային բաններ", "ru": "Тестовый баннер"}	{"en": "Homepage visibility check", "hy": "Գլխավոր էջի տեսանելիության ստուգում", "ru": "Проверка показа на главной"}		{"en": "Open", "hy": "Բացել", "ru": "Открыть"}	/	#111827	#ffffff	top	\N	100	f	paused	\N	\N	{/,/home}	all	\N	\N	1	0	2025-11-01 08:05:45.557265	2025-11-01 08:06:09.78
\.


--
-- Data for Name: blocks; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.blocks (id, page_id, type, title, content, sort_order, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: blog_categories; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.blog_categories (id, name, slug, description, color, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: blog_posts; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.blog_posts (id, title, slug, excerpt, content, featured_image, author_id, category_id, status, published_at, seo_title, seo_description, tags, view_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.categories (id, name, slug, description, image_url, sort_order, created_at, translations, parent_id, is_active, updated_at, cover_image, banner_image, "order") FROM stdin;
8bccc07e-695b-4136-8028-59979b55774c	{"en": "Personalized Blank Photo Album", "hy": "Անհատականացված դատարկ ալբոմ", "ru": "Персональный фотоальбом без фото"}	personalniy-fotoalbom-bez-foto	{"en": "", "hy": "", "ru": ""}	/objects/local-upload/4a86b02a-6d6f-4079-a044-e79cb1ee7584.png	0	2025-10-11 21:38:11.937757	{"en": {"name": "Personalized Blank Photo Album", "slug": "personalized-blank-photo-album", "description": ""}, "hy": {"name": "Անհատականացված դատարկ ալբոմ", "slug": "datark-albom", "description": ""}, "ru": {"name": "Персональный фотоальбом без фото", "slug": "personalniy-fotoalbom-bez-foto", "description": ""}}	\N	t	2025-10-11 21:38:11.937757	\N	/objects/local-upload/2677471f-f412-4b62-b32b-090e605e85b7.png	2
8157f83f-422f-459f-a473-33ba75bc18c0	{"en": "Calendar", "hy": "Օրացույցեր", "ru": "Календари"}	kalendari	{"en": "", "hy": "", "ru": ""}	/objects/local-upload/dbd573ed-cd05-41df-85ad-22dc7973c5c8.jpg	0	2025-10-09 15:27:14.64201	{"en": {"name": "Calendar", "slug": "calendar", "description": ""}, "hy": {"name": "Օրացույցեր", "slug": "oracuyc", "description": ""}, "ru": {"name": "Календари", "slug": "kalendari", "description": ""}}	\N	t	2025-10-09 15:27:14.64201	\N	\N	3
2f8e2b3d-0773-4e1b-8137-15d90f357498	{"en": "Wish book", "hy": "Մաղթանքների գիրք", "ru": "Книга пожеланий"}	kniga-pozhelaniy	{"en": "", "hy": "", "ru": ""}	/objects/local-upload/2aa1f853-882d-4383-b1b1-6e4b1460b81b.png	0	2025-10-09 12:54:33.70883	{"en": {"name": "Wish book", "slug": "wish-book", "description": ""}, "hy": {"name": "Մաղթանքների գիրք", "slug": "maghtanqneri-girq", "description": ""}, "ru": {"name": "Книга пожеланий", "slug": "kniga-pozhelaniy", "description": ""}}	\N	t	2025-10-09 12:54:33.70883	\N	\N	4
cd5e2a70-d90a-403b-aa1c-9ccd8775e578	{"en": "Wedding Photobooks", "hy": "Հարսանեկան ֆոտոգրքեր", "ru": "Свадебные фотокниги"}	svadebnye-fotoknigi	{"en": "A wedding photobook is the perfect way to preserve the most precious moments of your special day. With premium printing quality, elegant design, and durable binding, it becomes a timeless family heirloom.", "hy": "Հարսանեկան ֆոտոգիրքը կատարյալ միջոց է ձեր տոնակատարության ամենաթանկ պահերը հավերժացնելու համար։ Բարձրակարգ տպագրություն, նրբագեղ ձևավորում և ամուր կազմակերպում՝ ստեղծելու իսկական ընտանեկան ժառանգություն։", "ru": "Свадебная фотокнига — это идеальный способ сохранить самые ценные мгновения вашего торжества. Профессиональная печать высочайшего качества, элегантный дизайн и прочный переплёт превращают её в настоящую семейную реликвию."}	https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	0	2025-10-08 18:14:33.217414	{"en": {"name": "Wedding Photobooks", "slug": "wedding-photobooks", "description": "A wedding photobook is the perfect way to preserve the most precious moments of your special day. With premium printing quality, elegant design, and durable binding, it becomes a timeless family heirloom."}, "hy": {"name": "Հարսանեկան ֆոտոգրքեր", "slug": "harsanekan-fotogrqer", "description": "Հարսանեկան ֆոտոգիրքը կատարյալ միջոց է ձեր տոնակատարության ամենաթանկ պահերը հավերժացնելու համար։ Բարձրակարգ տպագրություն, նրբագեղ ձևավորում և ամուր կազմակերպում՝ ստեղծելու իսկական ընտանեկան ժառանգություն։"}, "ru": {"name": "Свадебные фотокниги", "slug": "svadebnye-fotoknigi", "description": "Свадебная фотокнига — это идеальный способ сохранить самые ценные мгновения вашего торжества. Профессиональная печать высочайшего качества, элегантный дизайн и прочный переплёт превращают её в настоящую семейную реликвию."}}	f65c889f-211e-49dc-92c6-8d420b221d43	t	2025-10-08 18:14:33.217414	\N	\N	2
9866dd0d-538d-4054-a320-7d70e4658b59	{"en": "Travel Photobooks", "hy": "Ճանապարհորդական ֆոտոգրքեր", "ru": "Фотокниги о путешествиях"}	fotoknigi-o-puteshestviyakh	{"en": "A travel photobook is your personal guide to unforgettable adventures. Transform every journey into a captivating story with vibrant photos, route maps, and travel notes.", "hy": "Ճանապարհորդական ֆոտոգիրքը ձեր անձնական ուղեցույցն է դեպի անմոռանալի արկածներ։ Վերածեք յուրաքանչյուր ճանապարհորդությունը գրավիչ պատմության՝ վառ լուսանկարներով, երթուղիների քարտեզներով և տպավորությունների գրառումներով։", "ru": "Фотокнига путешествий — ваш личный путеводитель по незабываемым приключениям. Превратите каждую поездку в захватывающую историю с яркими фотографиями, картами маршрутов и записями впечатлений."}	https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	0	2025-10-08 18:14:33.281871	{"en": {"name": "Travel Photobooks", "slug": "travel-photobooks", "description": "A travel photobook is your personal guide to unforgettable adventures. Transform every journey into a captivating story with vibrant photos, route maps, and travel notes."}, "hy": {"name": "Ճանապարհորդական ֆոտոգրքեր", "slug": "chanaparhordakan-fotogrqer", "description": "Ճանապարհորդական ֆոտոգիրքը ձեր անձնական ուղեցույցն է դեպի անմոռանալի արկածներ։ Վերածեք յուրաքանչյուր ճանապարհորդությունը գրավիչ պատմության՝ վառ լուսանկարներով, երթուղիների քարտեզներով և տպավորությունների գրառումներով։"}, "ru": {"name": "Фотокниги о путешествиях", "slug": "fotoknigi-o-puteshestviyakh", "description": "Фотокнига путешествий — ваш личный путеводитель по незабываемым приключениям. Превратите каждую поездку в захватывающую историю с яркими фотографиями, картами маршрутов и записями впечатлений."}}	f65c889f-211e-49dc-92c6-8d420b221d43	t	2025-10-08 18:14:33.281871	http://localhost:8080/objects/local-upload/8b57aaec-7cd2-4f17-abcd-91cee88c3d4d.png	http://localhost:8080/objects/local-upload/fb197af7-3b19-43a0-865a-cdee9e4ce434.png	1
f65c889f-211e-49dc-92c6-8d420b221d43	{"en": "Photobook", "hy": "Ֆոտոգրքեր", "ru": "Фотокниги"}	fotoknigi	{"en": "", "hy": "", "ru": ""}	/objects/local-upload/d98a4728-6459-4d23-afbb-09edfb2f2db0.png	0	2025-10-08 14:50:41.887721	{"en": {"name": "Photobook", "slug": "photobook", "description": ""}, "hy": {"name": "Ֆոտոգրքեր", "slug": "fotogrqer-hy", "description": ""}, "ru": {"name": "Фотокниги", "slug": "fotoknigi", "description": ""}}	\N	t	2025-10-08 14:50:41.887721	\N	/objects/local-upload/ab704aba-a69c-406c-ade4-f9f89006df8b.png	1
8f22972a-9fcc-4193-8139-9af65b00600d	{"en": "Anniversary Photobooks", "hy": "Հոբելյանական ֆոտոգրքեր", "ru": "Юбилейные фотокниги"}	yubileynye-fotoknigi	{"en": "An anniversary photobook is a ceremonial chronicle of important achievements and memorable milestones. Create a magnificent album worthy of the significant date, featuring event chronology, historical photos, and congratulations from loved ones.", "hy": "Հոբելյանական ֆոտոգիրքը կարևոր ձեռքբերումների և հիշարժան կետերի հանդիսավոր քրոնիկան է։ Ստեղծեք վեհանձն ալբոմ, որը արժանի է նշանակալի ամսաթվին՝ իրադարձությունների քրոնոլոգիայով, պատմական լուսանկարներով և մերձավորների շնորհավորություններով։", "ru": "Юбилейная фотокнига — торжественная летопись важных достижений и памятных вех. Создайте величественный альбом, достойный значимой даты, с хронологией событий, историческими фотографиями и поздравлениями от близких."}	https://images.unsplash.com/photo-1464207687429-7505649dae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	0	2025-10-08 18:14:33.320271	{"en": {"name": "Anniversary Photobooks", "slug": "anniversary-photobooks", "description": "An anniversary photobook is a ceremonial chronicle of important achievements and memorable milestones. Create a magnificent album worthy of the significant date, featuring event chronology, historical photos, and congratulations from loved ones."}, "hy": {"name": "Հոբելյանական ֆոտոգրքեր", "slug": "hobelyanakan-fotogrqer", "description": "Հոբելյանական ֆոտոգիրքը կարևոր ձեռքբերումների և հիշարժան կետերի հանդիսավոր քրոնիկան է։ Ստեղծեք վեհանձն ալբոմ, որը արժանի է նշանակալի ամսաթվին՝ իրադարձությունների քրոնոլոգիայով, պատմական լուսանկարներով և մերձավորների շնորհավորություններով։"}, "ru": {"name": "Юбилейные фотокниги", "slug": "yubileynye-fotoknigi", "description": "Юбилейная фотокнига — торжественная летопись важных достижений и памятных вех. Создайте величественный альбом, достойный значимой даты, с хронологией событий, историческими фотографиями и поздравлениями от близких."}}	f65c889f-211e-49dc-92c6-8d420b221d43	t	2025-10-08 18:14:33.320271	\N	\N	1
2c8987b3-0a4e-4ef8-ac2e-4a7d0dec5147	{"en": "Corporate Photobooks", "hy": "Կորպորատիվ ֆոտոգրքեր", "ru": "Корпоративные фотокниги"}	korporativnye-fotoknigi	{"en": "A corporate photobook is a prestigious tool for presenting your company's history and achievements. Create a professional album featuring office spaces, team members, production processes, and corporate events.", "hy": "Կորպորատիվ ֆոտոգիրքը ձեր ընկերության պատմությունն ու ձեռքբերումները ներկայացնելու պրեստիժային գործիք է։ Ստեղծեք մասնագիտական ալբոմ գրասենյակների, թիմի, արտադրական գործընթացների և կորպորատիվ միջոցառումների լուսանկարներով։", "ru": "Корпоративная фотокнига — престижный инструмент для презентации истории и достижений вашей компании. Создайте профессиональный альбом с фотографиями офисов, команды, производственных процессов и корпоративных мероприятий."}	https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	0	2025-10-08 18:14:33.349659	{"en": {"name": "Corporate Photobooks", "slug": "corporate-photobooks", "description": "A corporate photobook is a prestigious tool for presenting your company's history and achievements. Create a professional album featuring office spaces, team members, production processes, and corporate events."}, "hy": {"name": "Կորպորատիվ ֆոտոգրքեր", "slug": "korporativ-fotogrqer", "description": "Կորպորատիվ ֆոտոգիրքը ձեր ընկերության պատմությունն ու ձեռքբերումները ներկայացնելու պրեստիժային գործիք է։ Ստեղծեք մասնագիտական ալբոմ գրասենյակների, թիմի, արտադրական գործընթացների և կորպորատիվ միջոցառումների լուսանկարներով։"}, "ru": {"name": "Корпоративные фотокниги", "slug": "korporativnye-fotoknigi", "description": "Корпоративная фотокнига — престижный инструмент для презентации истории и достижений вашей компании. Создайте профессиональный альбом с фотографиями офисов, команды, производственных процессов и корпоративных мероприятий."}}	f65c889f-211e-49dc-92c6-8d420b221d43	t	2025-10-08 18:14:33.349659	\N	\N	1
b161deed-cf28-4356-bff5-6ae3ba7b3d88	{"en": "Personalized Photobooks", "hy": "Անհատականացված ֆոտոգրքեր", "ru": "Персонализированные фотокниги"}	personalizirovannye-fotoknigi	{"en": "A personalized photobook is the embodiment of your individuality in every detail. Create an absolutely unique album with exclusive design, custom layout, and original decorative elements.", "hy": "Անհատականացված ֆոտոգիրքը ձեր անհատականության մարմնավորումն է յուրաքանչյուր մանրուքում։ Ստեղծեք բացարձակապես եզակի ալբոմ էքսկլյուզիվ դիզայնով, անհատական կոմպոզիցիայով և հեղինակային ձևավորման տարրերով։", "ru": "Персонализированная фотокнига — воплощение вашей индивидуальности в каждой детали. Создайте абсолютно уникальный альбом с эксклюзивным дизайном, индивидуальной вёрсткой и авторскими элементами оформления."}	https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	0	2025-10-08 18:14:33.389342	{"en": {"name": "Personalized Photobooks", "slug": "personalized-photobooks", "description": "A personalized photobook is the embodiment of your individuality in every detail. Create an absolutely unique album with exclusive design, custom layout, and original decorative elements."}, "hy": {"name": "Անհատականացված ֆոտոգրքեր", "slug": "anhatakanacvats-fotogrqer", "description": "Անհատականացված ֆոտոգիրքը ձեր անհատականության մարմնավորումն է յուրաքանչյուր մանրուքում։ Ստեղծեք բացարձակապես եզակի ալբոմ էքսկլյուզիվ դիզայնով, անհատական կոմպոզիցիայով և հեղինակային ձևավորման տարրերով։"}, "ru": {"name": "Персонализированные фотокниги", "slug": "personalizirovannye-fotoknigi", "description": "Персонализированная фотокнига — воплощение вашей индивидуальности в каждой детали. Создайте абсолютно уникальный альбом с эксклюзивным дизайном, индивидуальной вёрсткой и авторскими элементами оформления."}}	f65c889f-211e-49dc-92c6-8d420b221d43	t	2025-10-08 18:14:33.389342	\N	\N	1
cf618984-8260-4031-b522-9805cb1798a7	{"en": "Graduation Photobooks", "hy": "Ավարտական ֆոտոգրքեր", "ru": "Выпускные фотокниги"}	vypusknye-fotoknigi	{"en": "A graduation photobook is a bright memory of the best years of study and friendship. Collect unforgettable moments of school or student life in a stylish album with class photos, group shots, and personal messages from classmates.", "hy": "Ավարտական ֆոտոգիրքը ուսումների և բարեկամության լավագույն տարիների վառ հիշողությունն է։ Հավաքեք դպրոցական կամ ուսանողական կյանքի անմոռանալի պահերը ոճային ալբոմում դասարանային լուսանկարներով, խմբային նկարներով և դասընկերների անձնական նամակներով։", "ru": "Выпускная фотокнига — яркая память о лучших годах учёбы и дружбы. Соберите незабываемые моменты школьной или студенческой жизни в стильном альбоме с классными фотографиями, групповыми снимками и личными посланиями одноклассников."}	https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	0	2025-10-08 18:14:33.369694	{"en": {"name": "Graduation Photobooks", "slug": "graduation-photobooks", "description": "A graduation photobook is a bright memory of the best years of study and friendship. Collect unforgettable moments of school or student life in a stylish album with class photos, group shots, and personal messages from classmates."}, "hy": {"name": "Ավարտական ֆոտոգրքեր", "slug": "avartakan-fotogrqer", "description": "Ավարտական ֆոտոգիրքը ուսումների և բարեկամության լավագույն տարիների վառ հիշողությունն է։ Հավաքեք դպրոցական կամ ուսանողական կյանքի անմոռանալի պահերը ոճային ալբոմում դասարանային լուսանկարներով, խմբային նկարներով և դասընկերների անձնական նամակներով։"}, "ru": {"name": "Выпускные фотокниги", "slug": "vypusknye-fotoknigi", "description": "Выпускная фотокнига — яркая память о лучших годах учёбы и дружбы. Соберите незабываемые моменты школьной или студенческой жизни в стильном альбоме с классными фотографиями, групповыми снимками и личными посланиями одноклассников."}}	f65c889f-211e-49dc-92c6-8d420b221d43	t	2025-10-08 18:14:33.369694	http://localhost:8080/objects/local-upload/c50a3589-bffb-454f-b62d-3c41d2bc48f2.png	http://localhost:8080/objects/local-upload/87db08e9-af86-44d6-a2a8-bc80120bc372.png	1
25d862bb-da4f-4118-b8ce-308a6575f8b3	{"en": "Family Photobooks", "hy": "Ընտանեկան ֆոտոգրքեր", "ru": "Семейные фотокниги"}	semeynye-fotoknigi	{"en": "A family photobook brings generations together in one beautiful story. Gather your family's warmest moments — from celebrations to everyday joys — in an elegant premium album.", "hy": "Ընտանեկան ֆոտոգիրքը միավորում է սերունդները մեկ գեղեցիկ պատմության մեջ։ Հավաքեք ձեր ընտանիքի ամենջերմ պահերը՝ ընտանեկան տոներից մինչև ամենօրյա ուրախություններ՝ էլեգանտ պրեմիում ալբոմում։", "ru": "Семейная фотокнига объединяет поколения в одной прекрасной истории. Соберите самые тёплые моменты вашей семьи — от семейных праздников до повседневных радостей — в элегантном альбоме премиального качества."}	https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	0	2025-10-08 18:14:33.26176	{"en": {"name": "Family Photobooks", "slug": "family-photobooks", "description": "A family photobook brings generations together in one beautiful story. Gather your family's warmest moments — from celebrations to everyday joys — in an elegant premium album."}, "hy": {"name": "Ընտանեկան ֆոտոգրքեր", "slug": "yntanekan-fotogrqer", "description": "Ընտանեկան ֆոտոգիրքը միավորում է սերունդները մեկ գեղեցիկ պատմության մեջ։ Հավաքեք ձեր ընտանիքի ամենջերմ պահերը՝ ընտանեկան տոներից մինչև ամենօրյա ուրախություններ՝ էլեգանտ պրեմիում ալբոմում։"}, "ru": {"name": "Семейные фотокниги", "slug": "semeynye-fotoknigi", "description": "Семейная фотокнига объединяет поколения в одной прекрасной истории. Соберите самые тёплые моменты вашей семьи — от семейных праздников до повседневных радостей — в элегантном альбоме премиального качества."}}	f65c889f-211e-49dc-92c6-8d420b221d43	t	2025-10-08 18:14:33.26176	\N	\N	1
f2d6b43c-ba20-4fd1-aac7-b1eaf1b9ba1f	{"en": "Gift Photobooks", "hy": "Նվերային ֆոտոգրքեր", "ru": "Подарочные фотокниги"}	podarochnye-fotoknigi	{"en": "A gift photobook is the most personal and touching present you can create with your own hands. Surprise loved ones with a unique album filled with shared memories and warm wishes.", "hy": "Նվերային ֆոտոգիրքը ամենանկատական և շոշափելի նվերն է, որը կարելի է ստեղծել ձեր ձեռքերով։ Զարմացրեք սիրելիներին եզակի ալբոմով, լի համատեղ հիշողություններով և ջերմ մաղթանքներով։", "ru": "Подарочная фотокнига — это самый персональный и трогательный подарок, который можно создать своими руками. Удивите близких уникальным альбомом, наполненным общими воспоминаниями и тёплыми пожеланиями."}	https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	0	2025-10-08 18:14:33.30052	{"en": {"name": "Gift Photobooks", "slug": "gift-photobooks", "description": "A gift photobook is the most personal and touching present you can create with your own hands. Surprise loved ones with a unique album filled with shared memories and warm wishes."}, "hy": {"name": "Նվերային ֆոտոգրքեր", "slug": "nverayin-fotogrqer", "description": "Նվերային ֆոտոգիրքը ամենանկատական և շոշափելի նվերն է, որը կարելի է ստեղծել ձեր ձեռքերով։ Զարմացրեք սիրելիներին եզակի ալբոմով, լի համատեղ հիշողություններով և ջերմ մաղթանքներով։"}, "ru": {"name": "Подарочные фотокниги", "slug": "podarochnye-fotoknigi", "description": "Подарочная фотокнига — это самый персональный и трогательный подарок, который можно создать своими руками. Удивите близких уникальным альбомом, наполненным общими воспоминаниями и тёплыми пожеланиями."}}	f65c889f-211e-49dc-92c6-8d420b221d43	t	2025-10-08 18:14:33.30052	http://localhost:8080/objects/local-upload/a6e27138-9177-4111-99ef-d8681c314092.png	http://localhost:8080/objects/local-upload/006de6d5-eba0-444d-a59e-85f5a87f9453.png	1
ed5930e6-0add-44ed-a4fb-12672cd1bfb8	{"en": "Premium Photobooks", "hy": "Պրեմիում ֆոտոգրքեր", "ru": "Премиум фотокниги"}	premium-fotoknigi	{"en": "A premium photobook is the epitome of luxury and impeccable quality in the world of print production. Crafted from elite materials using cutting-edge printing technologies, it represents a true work of polygraphic art.", "hy": "Պրեմիում ֆոտոգիրքը շքեղության և անբասիր որակի չափանիշն է տպագրական արտադրության աշխարհում։ Պատրաստված էլիտար նյութերից առաջադեմ տպագրական տեխնոլոգիաների օգտագործմամբ՝ այն ներկայացնում է իսկական պոլիգրաֆիական արվեստի գործ։", "ru": "Премиум фотокнига — эталон роскоши и безупречного качества в мире печатной продукции. Изготовленная из элитных материалов с использованием передовых технологий печати, она представляет собой настоящее произведение полиграфического искусства."}	https://images.unsplash.com/photo-1542038784456-1ea8e935640e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	0	2025-10-08 18:14:33.40883	{"en": {"name": "Premium Photobooks", "slug": "premium-photobooks", "description": "A premium photobook is the epitome of luxury and impeccable quality in the world of print production. Crafted from elite materials using cutting-edge printing technologies, it represents a true work of polygraphic art."}, "hy": {"name": "Պրեմիում ֆոտոգրքեր", "slug": "premiom-fotogrqer", "description": "Պրեմիում ֆոտոգիրքը շքեղության և անբասիր որակի չափանիշն է տպագրական արտադրության աշխարհում։ Պատրաստված էլիտար նյութերից առաջադեմ տպագրական տեխնոլոգիաների օգտագործմամբ՝ այն ներկայացնում է իսկական պոլիգրաֆիական արվեստի գործ։"}, "ru": {"name": "Премиум фотокниги", "slug": "premium-fotoknigi", "description": "Премиум фотокнига — эталон роскоши и безупречного качества в мире печатной продукции. Изготовленная из элитных материалов с использованием передовых технологий печати, она представляет собой настоящее произведение полиграфического искусства."}}	f65c889f-211e-49dc-92c6-8d420b221d43	t	2025-10-08 18:14:33.40883	\N	\N	1
67b3ef53-3b2c-4eae-88d2-13bc72a701da	{"en": "Children's Photobooks ", "hy": "Մանկական ֆոտոգրքեր", "ru": "Детские фотокниги"}	detskie-fotoknigi	{"en": "Test description", "hy": "Մանկական ֆոտոգրքը ոչ միայն լուսանկարների հավաքածու է, այլ ստեղծագործական պատմություն ձեր փոքրիկի կյանքի մասին։ Ժամանակակից դիզայն, պայծառ գույներ և որակյալ տպագրություն՝ ամեն էջում։ Թող հիշողությունները դառնան արվեստ՝ ձեր ընտանիքի համար։", "ru": "Детская фотокнига — это нежный способ сохранить улыбки, первые шаги и самые тёплые воспоминания детства. Каждая страница наполнена любовью, яркими красками и эмоциями, которые невозможно повторить. Создайте уникальную фотокнигу для своего малыша — подарок, к которому вы будете возвращаться снова и снова."}	https://images.unsplash.com/photo-1544776527-f5e7dfe4e2d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	0	2025-10-08 18:14:33.243544	{"en": {"name": "Children's Photobooks ", "slug": "childrens-photobooks-test", "description": "Test description"}, "hy": {"name": "Մանկական ֆոտոգրքեր", "slug": "mankakan-fotogrqer", "description": "Մանկական ֆոտոգրքը ոչ միայն լուսանկարների հավաքածու է, այլ ստեղծագործական պատմություն ձեր փոքրիկի կյանքի մասին։ Ժամանակակից դիզայն, պայծառ գույներ և որակյալ տպագրություն՝ ամեն էջում։ Թող հիշողությունները դառնան արվեստ՝ ձեր ընտանիքի համար։"}, "ru": {"name": "Детские фотокниги", "slug": "detskie-fotoknigi", "description": "Детская фотокнига — это нежный способ сохранить улыбки, первые шаги и самые тёплые воспоминания детства. Каждая страница наполнена любовью, яркими красками и эмоциями, которые невозможно повторить. Создайте уникальную фотокнигу для своего малыша — подарок, к которому вы будете возвращаться снова и снова."}}	f65c889f-211e-49dc-92c6-8d420b221d43	t	2025-10-08 18:14:33.243544	http://localhost:5002/objects/local-upload/e6519d4f-2b24-4876-87ba-433c0a32c97c.png	http://localhost:5002/objects/local-upload/1b759273-2837-409e-9fda-ee486ea74b58.png	1
\.


--
-- Data for Name: change_logs; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.change_logs (id, user_id, entity_type, entity_ids, action, details, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.comments (id, post_id, user_id, author_name, author_email, content, is_approved, created_at) FROM stdin;
\.


--
-- Data for Name: currencies; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.currencies (id, code, name, symbol, is_base_currency, is_active, sort_order, created_at, updated_at) FROM stdin;
a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	AMD	{"en": "Armenian Dram", "hy": "Հայկական դրամ", "ru": "Армянский драм"}	֏	t	t	1	2025-10-27 08:20:13.855	2025-10-27 08:20:13.855
82b4fc95-6b07-4949-bb89-bba83b5ccdbc	USD	{"en": "US Dollar", "hy": "ԱՄՆ դոլար", "ru": "Доллар США"}	$	f	t	2	2025-10-27 08:20:13.884	2025-10-27 08:20:13.884
0cf40978-3f92-4024-82e1-91aec2fd256e	RUB	{"en": "Russian Ruble", "hy": "Ռուսական ռուբլի", "ru": "Российский рубль"}	₽	f	t	3	2025-10-27 08:20:13.892	2025-10-27 08:20:13.892
\.


--
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.exchange_rates (id, from_currency_id, to_currency_id, rate, source, is_manual, created_at, updated_at) FROM stdin;
af78ae12-70e2-4444-82da-e64e7133e86f	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	82b4fc95-6b07-4949-bb89-bba83b5ccdbc	0.00260000	manual	t	2025-10-27 08:20:13.901	2025-10-27 08:20:13.901
f9331755-9458-4675-9e27-27cfc3e3b4b8	82b4fc95-6b07-4949-bb89-bba83b5ccdbc	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	385.00000000	manual	t	2025-10-27 08:20:13.915	2025-10-27 08:20:13.915
120321b4-3afb-4840-b37e-9c9e9f5661a1	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	0cf40978-3f92-4024-82e1-91aec2fd256e	0.25000000	manual	t	2025-10-27 08:20:13.921	2025-10-27 08:20:13.921
9a7e9cee-3ff9-4105-9c60-789517e95186	0cf40978-3f92-4024-82e1-91aec2fd256e	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	4.00000000	manual	t	2025-10-27 08:20:13.929	2025-10-27 08:20:13.929
d41b8725-e2b9-442e-b58c-5edc30766e17	82b4fc95-6b07-4949-bb89-bba83b5ccdbc	0cf40978-3f92-4024-82e1-91aec2fd256e	96.00000000	manual	t	2025-10-27 08:20:13.934	2025-10-27 08:20:13.934
06020943-948c-4592-963a-54a005a0a5a5	0cf40978-3f92-4024-82e1-91aec2fd256e	82b4fc95-6b07-4949-bb89-bba83b5ccdbc	0.01040000	manual	t	2025-10-27 08:20:13.939	2025-10-27 08:20:13.939
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.order_items (id, order_id, product_id, product_name, product_image_url, quantity, unit_price, total_price, options, created_at) FROM stdin;
f09e1abd-40fb-4e90-a257-be565019db2e	655c0bc8-4def-4dff-bd96-aa7461753aa0	\N	Классическая фотокнига	\N	1	20700.00	20700.00	\N	2025-10-31 15:34:55.879558
fc380712-6833-458c-a909-642537fcf387	31178c6a-10d6-4611-87ed-a4d1a47bb6d4	\N	Классическая фотокнига	\N	1	360000.00	360000.00	\N	2025-11-04 11:12:53.976767
5d3899fb-980c-4850-ba92-1e90a3591756	dd23651a-445e-4533-b82c-bba0722d929e	\N	Классическая фотокнига	\N	1	360000.00	360000.00	\N	2025-11-05 19:44:37.288811
34ad31cf-d32a-41d1-a21b-f972c65d94e0	4e386088-4bf3-41b3-a016-138394787905	\N	Классическая фотокнига	\N	1	360000.00	360000.00	\N	2025-11-05 19:45:55.958804
9b5fd629-57e2-4315-bcbd-35d6dd6abc9d	0712da40-a238-4313-be4a-648f8b292151	\N	Классическая фотокнига	\N	1	360000.00	360000.00	\N	2025-11-05 19:55:32.789053
1cd4e22c-d370-46d4-b397-a90118ab2af4	fc1f5a49-8095-417d-ba98-22a9a4508b30	\N	Классическая фотокнига	\N	1	360000.00	360000.00	\N	2025-11-05 19:58:31.594947
2da9cfad-91f0-4fc3-9db2-6a737ee15503	ad7f43f6-d299-4d92-b0ba-9257fe6ea510	f3d7c5d5-901e-4200-a164-1256b0218952	Классическая фотокнига	/test-image.jpg	1	400000.00	400000.00	{"notes": "Тестовый заказ для проверки гостевого API", "paymentMethod": "cash"}	2025-11-05 20:03:04.282426
8a24c3b2-c99b-4218-a264-0d5e49ad671c	c339e07d-bf2b-472d-ae5b-5950e6d127f2	\N	Классическая фотокнига	\N	1	360000.00	360000.00	\N	2025-11-05 20:04:37.196454
49397e1c-7541-41a1-bb95-80585cdc466e	dd4d4ab1-73d2-43c1-982f-c40c129b035d	\N	Классическая фотокнига	\N	1	360000.00	360000.00	\N	2025-11-05 20:06:06.62622
d7d999d9-cece-4ffe-a79d-383d3cc69d68	9cc3f863-0238-4c09-a174-386576cce3de	8538bfec-eb00-46d3-950d-8cb82f28febf	Рамка	/objects/local-upload/dbb67f8f-b6ee-40c5-a456-ae8d3a403d60.jpg	1	4000.00	4000.00	{"notes": null, "paymentMethod": "cash"}	2025-11-05 20:34:25.199572
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.orders (id, user_id, customer_name, customer_email, customer_phone, shipping_address, total_amount, currency_id, exchange_rate, status, items, created_at, updated_at) FROM stdin;
655c0bc8-4def-4dff-bd96-aa7461753aa0	be34f57a-0def-4928-a50f-bd33f60d74c2	Администратор PhotoBooks	admin@photobooks.local	3024148567	Echmiadzin	20700.00	0cf40978-3f92-4024-82e1-91aec2fd256e	1.00000000	processing	[{"id": "5d9d9160-8acf-45d1-b359-856769ff60b3", "name": "Классическая фотокнига", "price": 20700, "quantity": 1}]	2025-10-31 15:34:55.844176	2025-10-31 15:35:24.855
31178c6a-10d6-4611-87ed-a4d1a47bb6d4	be34f57a-0def-4928-a50f-bd33f60d74c2	Администратор PhotoBooks	admin@photobooks.local	3024148567	11 Southgate Blvd C25\nY8911	360000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	1.00000000	pending	[{"id": "f3d7c5d5-901e-4200-a164-1256b0218952", "name": "Классическая фотокнига", "price": 360000, "quantity": 1}]	2025-11-04 11:12:53.966988	2025-11-04 11:12:53.966988
3be645a8-3271-49d6-a5f3-e3bf933baf5d	88f01be3-2d4b-4186-a5f2-d06b58c943d2	Karen Makaryan	photogirq@mail.ru	+374 55 480100	11 Southgate Blvd C25	360000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	\N	pending	[{"id": "f3d7c5d5-901e-4200-a164-1256b0218952", "name": "Классическая фотокнига", "price": 360000, "imageUrl": "/objects/local-upload/baffee78-7eff-4fcb-8d22-538081b0fe8c.png", "quantity": 1, "isReadyMade": false, "originalPrice": 400000, "discountPercentage": 10}]	2025-11-05 19:35:07.98	2025-11-05 19:35:07.98
dd23651a-445e-4533-b82c-bba0722d929e	be34f57a-0def-4928-a50f-bd33f60d74c2	Администратор PhotoBooks	admin@photobooks.local	3024148567	Echmiadzin	360000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	1.00000000	pending	[{"id": "f3d7c5d5-901e-4200-a164-1256b0218952", "name": "Классическая фотокнига", "price": 360000, "quantity": 1}]	2025-11-05 19:44:37.2432	2025-11-05 19:44:37.2432
4e386088-4bf3-41b3-a016-138394787905	be34f57a-0def-4928-a50f-bd33f60d74c2	Администратор PhotoBooks	admin@photobooks.local	3024148567	Echmiadzin	360000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	1.00000000	pending	[{"id": "f3d7c5d5-901e-4200-a164-1256b0218952", "name": "Классическая фотокнига", "price": 360000, "quantity": 1}]	2025-11-05 19:45:55.95178	2025-11-05 19:45:55.95178
0712da40-a238-4313-be4a-648f8b292151	be34f57a-0def-4928-a50f-bd33f60d74c2	Администратор PhotoBooks	admin@photobooks.local	3024148567	Echmiadzin	360000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	1.00000000	pending	[{"id": "f3d7c5d5-901e-4200-a164-1256b0218952", "name": "Классическая фотокнига", "price": 360000, "quantity": 1}]	2025-11-05 19:55:32.771112	2025-11-05 19:55:32.771112
fc1f5a49-8095-417d-ba98-22a9a4508b30	be34f57a-0def-4928-a50f-bd33f60d74c2	Администратор PhotoBooks	admin@photobooks.local	3024148567	Echmiadzin	360000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	1.00000000	pending	[{"id": "f3d7c5d5-901e-4200-a164-1256b0218952", "name": "Классическая фотокнига", "price": 360000, "quantity": 1}]	2025-11-05 19:58:31.579564	2025-11-05 19:58:31.579564
f361fe81-d1bb-4f99-b2ff-e9e5dac40417	\N	Тест Гостевой Заказ	guest.test@example.com	+374 99 123456	ул. Тестовая, дом 1, кв. 1, Ереван	35000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	1.00000000	pending	[{"id": "test-product-1", "name": "Тестовый фотобук", "price": 15000, "imageUrl": "/test-image.jpg", "quantity": 2}, {"id": "test-product-2", "name": "Календарь 2026", "price": 5000, "imageUrl": "/calendar.jpg", "quantity": 1}]	2025-11-05 20:00:32.434757	2025-11-05 20:00:32.434757
0dd598f9-193b-4c38-954f-c51bbed31bee	\N	Тест Гостевой Заказ	guest.test@example.com	+374 99 123456	ул. Тестовая, дом 1, кв. 1, Ереван	35000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	1.00000000	pending	[{"id": "test-product-1", "name": "Тестовый фотобук", "price": 15000, "imageUrl": "/test-image.jpg", "quantity": 2}, {"id": "test-product-2", "name": "Календарь 2026", "price": 5000, "imageUrl": "/calendar.jpg", "quantity": 1}]	2025-11-05 20:01:22.767707	2025-11-05 20:01:22.767707
cd596be9-a146-4d93-b590-43240a23097a	\N	Тест Гостевой Заказ	guest.test@example.com	+374 99 123456	ул. Тестовая, дом 1, кв. 1, Ереван	35000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	1.00000000	pending	[{"id": "test-product-1", "name": "Тестовый фотобук", "price": 15000, "imageUrl": "/test-image.jpg", "quantity": 2}, {"id": "test-product-2", "name": "Календарь 2026", "price": 5000, "imageUrl": "/calendar.jpg", "quantity": 1}]	2025-11-05 20:02:04.57663	2025-11-05 20:02:04.57663
ad7f43f6-d299-4d92-b0ba-9257fe6ea510	\N	Тест Гостевой Заказ	guest.test@example.com	+374 99 123456	ул. Тестовая, дом 1, кв. 1, Ереван	400000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	1.00000000	pending	[{"id": "f3d7c5d5-901e-4200-a164-1256b0218952", "name": "Классическая фотокнига", "price": 400000, "imageUrl": "/test-image.jpg", "quantity": 1}]	2025-11-05 20:03:04.255154	2025-11-05 20:03:04.255154
c339e07d-bf2b-472d-ae5b-5950e6d127f2	be34f57a-0def-4928-a50f-bd33f60d74c2	Администратор PhotoBooks	admin@photobooks.local	3024148567	Echmiadzin	360000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	1.00000000	pending	[{"id": "f3d7c5d5-901e-4200-a164-1256b0218952", "name": "Классическая фотокнига", "price": 360000, "quantity": 1}]	2025-11-05 20:04:37.188085	2025-11-05 20:04:37.188085
dd4d4ab1-73d2-43c1-982f-c40c129b035d	be34f57a-0def-4928-a50f-bd33f60d74c2	Администратор PhotoBooks	admin@photobooks.local	+37455480100	11 Southgate Blvd C25\nY8911	360000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	1.00000000	pending	[{"id": "f3d7c5d5-901e-4200-a164-1256b0218952", "name": "Классическая фотокнига", "price": 360000, "quantity": 1}]	2025-11-05 20:06:06.621418	2025-11-05 20:06:06.621418
9cc3f863-0238-4c09-a174-386576cce3de	\N	Tereza Tosunyan	tusunyan@mail.ru	13024148567	Echmiadzin	4000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	1.00000000	pending	[{"id": "8538bfec-eb00-46d3-950d-8cb82f28febf", "name": "Рамка", "price": 4000, "imageUrl": "/objects/local-upload/dbb67f8f-b6ee-40c5-a456-ae8d3a403d60.jpg", "quantity": 1, "isReadyMade": true, "originalPrice": 4000}]	2025-11-05 20:34:25.19227	2025-11-05 20:34:25.19227
6f8b6c16-0264-4061-ac92-7892439f20bf	be34f57a-0def-4928-a50f-bd33f60d74c2	Администратор PhotoBooks	admin@photobooks.local	+374 55 480100	11 Southgate Blvd C25	724000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	1.00000000	delivered	[{"id": "8538bfec-eb00-46d3-950d-8cb82f28febf", "name": "Рамка", "price": 4000, "imageUrl": "/objects/local-upload/dbb67f8f-b6ee-40c5-a456-ae8d3a403d60.jpg", "quantity": 1, "isReadyMade": true, "originalPrice": 4000}, {"id": "f3d7c5d5-901e-4200-a164-1256b0218952", "name": "Классическая фотокнига", "price": 360000, "imageUrl": "/objects/local-upload/baffee78-7eff-4fcb-8d22-538081b0fe8c.png", "quantity": 1, "isReadyMade": false, "originalPrice": 400000, "discountPercentage": 10}, {"id": "f3d7c5d5-901e-4200-a164-1256b0218952", "name": "Классическая фотокнига", "price": 360000, "options": {"hasARAddon": true}, "imageUrl": "/objects/local-upload/baffee78-7eff-4fcb-8d22-538081b0fe8c.png", "quantity": 1, "isReadyMade": false, "originalPrice": 400000, "discountPercentage": 10}]	2025-11-06 20:22:26.605142	2025-11-14 14:45:23.728
\.


--
-- Data for Name: pages; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.pages (id, title, slug, description, meta_title, meta_description, keywords, canonical_url, og_image, twitter_card, structured_data, noindex, language, is_published, is_homepage, show_in_header_nav, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: popups; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.popups (id, name, type, title, content, image_url, button_text, button_link, secondary_button_text, secondary_button_link, background_color, text_color, size, priority, is_active, status, start_date, end_date, target_pages, target_users, show_delay, show_frequency, max_impressions, max_clicks, current_impressions, current_clicks, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.products (id, name, description, price, currency_id, original_price, discount_percentage, in_stock, stock_quantity, is_on_sale, image_url, images, video_url, videos, category_id, options, photobook_format, photobook_size, min_spreads, additional_spread_price, additional_spread_currency_id, paper_type, cover_material, binding_type, production_time, shipping_time, weight, allow_customization, min_custom_price, min_custom_price_currency_id, cost_price, cost_currency_id, material_costs, labor_costs, overhead_costs, shipping_costs, other_costs, expected_profit_margin, is_active, sort_order, special_pages, created_at, hashtags, is_ready_made, subcategory_id) FROM stdin;
f3d7c5d5-901e-4200-a164-1256b0218952	{"en": "Classic Photobook", "hy": "Դասական լուսանկարների գիրք", "ru": "Классическая фотокнига"}	{"en": "", "hy": "", "ru": ""}	400000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	40000.00	10	t	1000	t		{/objects/local-upload/baffee78-7eff-4fcb-8d22-538081b0fe8c.png}		{/objects/local-upload/59f1fe74-2469-4b16-aed8-5b711bbd0252.mp4}	f65c889f-211e-49dc-92c6-8d420b221d43	\N	\N	\N	10	40000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8				7	3	0.00	t	0.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	0.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	0.00	0.00	0.00	0.00	0.00	30.00	t	0	{}	2025-10-31 17:54:36.315223	{"en": [], "hy": [], "ru": []}	f	\N
8538bfec-eb00-46d3-950d-8cb82f28febf	{"en": "Frame", "hy": "Շրջանակներ", "ru": "Рамка"}	{"en": "", "hy": "", "ru": ""}	4000.00	a0a8cd36-08aa-44d3-8d39-ee0f80b4f4c8	\N	0	f	0	f		{/objects/local-upload/dbb67f8f-b6ee-40c5-a456-ae8d3a403d60.jpg}		{}	f65c889f-211e-49dc-92c6-8d420b221d43	\N	\N	\N	10	400.00	\N	\N	\N	\N	7	3	\N	t	\N	\N	0.00	\N	0.00	0.00	0.00	0.00	0.00	30.00	t	0	{}	2025-11-05 20:33:23.25858	{"en": [], "hy": [], "ru": []}	t	\N
\.


--
-- Data for Name: promocodes; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.promocodes (id, code, name, discount_type, discount_value, currency_id, min_order_amount, min_order_currency_id, max_uses, used_count, is_active, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.reviews (id, user_id, product_id, author_name, author_email, profile_photo, gender, rating, comment, status, is_promoted, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.sessions (sid, sess, expire) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.settings (id, key, description, value, updated_at) FROM stdin;
\.


--
-- Data for Name: site_pages; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.site_pages (key, title, description, seo_title, seo_description, hero_image_url, is_published, show_in_header_nav, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: special_offers; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.special_offers (id, name, type, title, description, image_url, discount_type, discount_value, currency_id, min_order_amount, min_order_currency_id, button_text, button_link, background_color, text_color, priority, is_active, status, start_date, end_date, target_products, target_categories, target_users, max_uses, current_uses, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: uploads; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.uploads (id, phone, format, size, pages, price, comment, files, status, created_at, completed_at, expires_at, admin_notified, telegram_sent, zip_generated_at, zip_downloaded_at, total_file_size, file_count, delete_after_days, delete_at, deletion_notified_at, admin_hold, postponed_until, deleted_at) FROM stdin;
60d225d5-7c70-4d6b-b364-25c4531668bf	334343	square	20x20	24	15000.00	\N	[]	deleted	2025-11-02 08:01:22.267257+00	2025-11-02 08:01:35.932+00	2025-11-04 08:01:22.264+00	f	t	2025-11-02 14:48:30.864+00	2025-11-02 14:48:30.864+00	7940760	5	3	2025-11-05 08:01:35.932+00	\N	f	\N	2025-11-05 19:45:00.848+00
1462260b-2c51-4947-9cc1-042048d68f20	34343434343	square	20x20	24	15000.00	\N	[]	deleted	2025-11-01 11:03:49.093191+00	2025-11-01 11:03:59.667+00	2025-11-03 11:03:49.092+00	f	t	\N	\N	0	0	3	2025-11-04 11:03:59.667+00	2025-11-04 08:15:00.17+00	f	\N	2025-11-05 19:45:00.858+00
3eb59652-26eb-49d1-92d4-00079d5430bc	3323232	square	20x20	24	15000.00	\N	[]	deleted	2025-11-01 11:04:40.898358+00	2025-11-01 11:04:51.168+00	2025-11-03 11:04:40.896+00	f	t	2025-11-02 08:00:42.696+00	2025-11-02 08:00:42.696+00	6093316	4	3	2025-11-04 11:04:51.168+00	2025-11-04 08:15:00.179+00	f	\N	2025-11-05 19:45:00.871+00
080bad3b-8473-4f9e-b043-751ae0d1fd54	54545445	square	20x20	24	15000.00	\N	[]	deleted	2025-11-05 19:48:47.722753+00	2025-11-05 19:49:01.974+00	2025-11-07 19:48:47.72+00	f	t	2025-11-05 19:49:19.552+00	2025-11-05 19:49:19.552+00	4586576	3	3	2025-11-08 19:49:01.973+00	2025-11-08 14:15:00.738+00	f	\N	2025-11-09 08:45:00.481+00
a3e73b77-354e-46bc-bf94-4368f06823f0	565665656	square	20x20	24	15000.00	\N	[]	deleted	2025-11-06 09:39:39.249694+00	2025-11-06 09:39:44.439+00	2025-11-08 09:39:39.245+00	f	t	\N	\N	128068	1	3	2025-11-09 09:39:44.439+00	2025-11-09 08:15:00.821+00	f	\N	2025-11-09 09:45:00.193+00
079b4bed-2598-4636-8c39-68ebf08bc655	45545454	square	20x20	24	15000.00	\N	[]	deleted	2025-11-17 17:34:33.429269+00	2025-11-17 17:34:39.613+00	2025-11-19 17:34:33.423+00	f	t	2025-11-17 17:34:59.042+00	2025-11-17 17:34:59.042+00	130321	1	3	2025-11-20 17:34:39.613+00	2025-11-20 12:15:00.065+00	f	\N	2025-11-20 18:45:00.98+00
\.


--
-- Data for Name: user_themes; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.user_themes (id, user_id, theme_name, custom_colors, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.users (id, email, first_name, last_name, profile_image_url, password_hash, role, created_at, updated_at) FROM stdin;
local-admin	admin@local.test	Админ	Локальный	\N	\N	user	2025-10-27 08:25:19.663231	2025-10-27 08:25:19.663231
be34f57a-0def-4928-a50f-bd33f60d74c2	admin@photobooks.local	Администратор	PhotoBooks	\N	$2b$12$HFDW6.w1pygxMQd.DB3No.c1Wp3KZMmm6d9.izlV6MwDusnPI0RCi	admin	2025-10-31 13:25:03.707419	2025-10-31 13:25:03.707419
88f01be3-2d4b-4186-a5f2-d06b58c943d2	photogirq@mail.ru	Karen	Makaryan	\N	$2b$12$e970V9fRdccoBNlFrhgsU.Bd2Hn1vpI6AzHJ7xMezXsuIYcfW9Cb6	user	2025-11-04 11:11:19.83709	2025-11-04 11:11:19.83709
\.


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: ar_project_items ar_project_items_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.ar_project_items
    ADD CONSTRAINT ar_project_items_pkey PRIMARY KEY (id);


--
-- Name: ar_projects ar_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.ar_projects
    ADD CONSTRAINT ar_projects_pkey PRIMARY KEY (id);


--
-- Name: banner_analytics banner_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.banner_analytics
    ADD CONSTRAINT banner_analytics_pkey PRIMARY KEY (id);


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- Name: blocks blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_slug_unique; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_slug_unique UNIQUE (slug);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_unique; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_unique UNIQUE (slug);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_unique; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_unique UNIQUE (slug);


--
-- Name: change_logs change_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.change_logs
    ADD CONSTRAINT change_logs_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: currencies currencies_code_unique; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_code_unique UNIQUE (code);


--
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: pages pages_slug_unique; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_slug_unique UNIQUE (slug);


--
-- Name: popups popups_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.popups
    ADD CONSTRAINT popups_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: promocodes promocodes_code_unique; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.promocodes
    ADD CONSTRAINT promocodes_code_unique UNIQUE (code);


--
-- Name: promocodes promocodes_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.promocodes
    ADD CONSTRAINT promocodes_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: settings settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_unique UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: site_pages site_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.site_pages
    ADD CONSTRAINT site_pages_pkey PRIMARY KEY (key);


--
-- Name: special_offers special_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.special_offers
    ADD CONSTRAINT special_offers_pkey PRIMARY KEY (id);


--
-- Name: uploads uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.uploads
    ADD CONSTRAINT uploads_pkey PRIMARY KEY (id);


--
-- Name: user_themes user_themes_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.user_themes
    ADD CONSTRAINT user_themes_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_ar_items_project_id; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX "IDX_ar_items_project_id" ON public.ar_project_items USING btree (project_id);


--
-- Name: IDX_ar_items_target_index; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX "IDX_ar_items_target_index" ON public.ar_project_items USING btree (target_index);


--
-- Name: IDX_ar_projects_created_at; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX "IDX_ar_projects_created_at" ON public.ar_projects USING btree (created_at);


--
-- Name: IDX_ar_projects_order_id; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX "IDX_ar_projects_order_id" ON public.ar_projects USING btree (order_id);


--
-- Name: IDX_ar_projects_product_id; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX "IDX_ar_projects_product_id" ON public.ar_projects USING btree (product_id);


--
-- Name: IDX_ar_projects_status; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX "IDX_ar_projects_status" ON public.ar_projects USING btree (status);


--
-- Name: IDX_ar_projects_user_id; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX "IDX_ar_projects_user_id" ON public.ar_projects USING btree (user_id);


--
-- Name: IDX_categories_active; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX "IDX_categories_active" ON public.categories USING btree (is_active);


--
-- Name: IDX_categories_parent_id; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX "IDX_categories_parent_id" ON public.categories USING btree (parent_id);


--
-- Name: IDX_categories_slug; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX "IDX_categories_slug" ON public.categories USING btree (slug);


--
-- Name: IDX_change_logs_created_at; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX "IDX_change_logs_created_at" ON public.change_logs USING btree (created_at);


--
-- Name: IDX_change_logs_entity_type; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX "IDX_change_logs_entity_type" ON public.change_logs USING btree (entity_type);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: idx_ar_projects_expires_at; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX idx_ar_projects_expires_at ON public.ar_projects USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_ar_projects_is_demo; Type: INDEX; Schema: public; Owner: photobooks
--

CREATE INDEX idx_ar_projects_is_demo ON public.ar_projects USING btree (is_demo);


--
-- Name: analytics_events analytics_events_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ar_project_items ar_project_items_project_id_ar_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.ar_project_items
    ADD CONSTRAINT ar_project_items_project_id_ar_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.ar_projects(id) ON DELETE CASCADE;


--
-- Name: ar_projects ar_projects_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.ar_projects
    ADD CONSTRAINT ar_projects_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: ar_projects ar_projects_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.ar_projects
    ADD CONSTRAINT ar_projects_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: ar_projects ar_projects_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.ar_projects
    ADD CONSTRAINT ar_projects_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: banner_analytics banner_analytics_banner_id_banners_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.banner_analytics
    ADD CONSTRAINT banner_analytics_banner_id_banners_id_fk FOREIGN KEY (banner_id) REFERENCES public.banners(id) ON DELETE CASCADE;


--
-- Name: banner_analytics banner_analytics_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.banner_analytics
    ADD CONSTRAINT banner_analytics_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: blocks blocks_page_id_pages_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT blocks_page_id_pages_id_fk FOREIGN KEY (page_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: blog_posts blog_posts_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: blog_posts blog_posts_category_id_blog_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_category_id_blog_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.blog_categories(id);


--
-- Name: categories categories_parent_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_categories_id_fk FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: change_logs change_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.change_logs
    ADD CONSTRAINT change_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: comments comments_post_id_blog_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_blog_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.blog_posts(id);


--
-- Name: comments comments_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: exchange_rates exchange_rates_from_currency_id_currencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_from_currency_id_currencies_id_fk FOREIGN KEY (from_currency_id) REFERENCES public.currencies(id);


--
-- Name: exchange_rates exchange_rates_to_currency_id_currencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_to_currency_id_currencies_id_fk FOREIGN KEY (to_currency_id) REFERENCES public.currencies(id);


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_currency_id_currencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_currency_id_currencies_id_fk FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: orders orders_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: products products_additional_spread_currency_id_currencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_additional_spread_currency_id_currencies_id_fk FOREIGN KEY (additional_spread_currency_id) REFERENCES public.currencies(id);


--
-- Name: products products_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: products products_cost_currency_id_currencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_cost_currency_id_currencies_id_fk FOREIGN KEY (cost_currency_id) REFERENCES public.currencies(id);


--
-- Name: products products_currency_id_currencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_currency_id_currencies_id_fk FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: products products_min_custom_price_currency_id_currencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_min_custom_price_currency_id_currencies_id_fk FOREIGN KEY (min_custom_price_currency_id) REFERENCES public.currencies(id);


--
-- Name: products products_subcategory_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_subcategory_id_categories_id_fk FOREIGN KEY (subcategory_id) REFERENCES public.categories(id);


--
-- Name: promocodes promocodes_currency_id_currencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.promocodes
    ADD CONSTRAINT promocodes_currency_id_currencies_id_fk FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: promocodes promocodes_min_order_currency_id_currencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.promocodes
    ADD CONSTRAINT promocodes_min_order_currency_id_currencies_id_fk FOREIGN KEY (min_order_currency_id) REFERENCES public.currencies(id);


--
-- Name: reviews reviews_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: reviews reviews_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: special_offers special_offers_currency_id_currencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.special_offers
    ADD CONSTRAINT special_offers_currency_id_currencies_id_fk FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: special_offers special_offers_min_order_currency_id_currencies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.special_offers
    ADD CONSTRAINT special_offers_min_order_currency_id_currencies_id_fk FOREIGN KEY (min_order_currency_id) REFERENCES public.currencies(id);


--
-- Name: user_themes user_themes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: photobooks
--

ALTER TABLE ONLY public.user_themes
    ADD CONSTRAINT user_themes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict AEhB6HFIcEiFu7BkuFyKUJovEdRWccFAge8AZaiE01ngyaD960BkV5ennvVKieF

