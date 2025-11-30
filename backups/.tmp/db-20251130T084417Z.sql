--
-- PostgreSQL database dump
--

\restrict eJ6UNNa7HpPZ9sbxFKYCzHIIC1mux2V6dSuxHVPXg8TrlIdOIaEtcRAmNWg2Dsf

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
    mask_url character varying,
    mask_width integer,
    mask_height integer,
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
    compilation_started_at timestamp without time zone,
    compilation_finished_at timestamp without time zone,
    compilation_time_ms integer,
    notification_sent boolean DEFAULT false,
    notification_sent_at timestamp without time zone,
    product_id character varying,
    attached_to_order boolean DEFAULT false,
    ar_price numeric(10,2) DEFAULT 500.00,
    is_demo boolean DEFAULT false,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ar_projects OWNER TO photobooks;

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
    translations jsonb,
    parent_id character varying,
    image_url character varying,
    cover_image character varying,
    banner_image character varying,
    sort_order integer DEFAULT 0,
    "order" integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO photobooks;

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
    hashtags jsonb,
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
    subcategory_id character varying,
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
    is_ready_made boolean DEFAULT false,
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
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.products OWNER TO photobooks;

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
\.


--
-- Data for Name: ar_projects; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.ar_projects (id, user_id, order_id, photo_url, video_url, mask_url, mask_width, mask_height, marker_fset_url, marker_fset3_url, marker_iset_url, status, error_message, view_url, viewer_html_url, qr_code_url, marker_quality, key_points_count, config, photo_width, photo_height, video_width, video_height, video_duration_ms, photo_aspect_ratio, video_aspect_ratio, fit_mode, scale_width, scale_height, is_calibrated, calibrated_pos_x, calibrated_pos_y, calibrated_pos_z, compilation_started_at, compilation_finished_at, compilation_time_ms, notification_sent, notification_sent_at, product_id, attached_to_order, ar_price, is_demo, expires_at, created_at, updated_at) FROM stdin;
0e1c37b9-9315-46e4-b154-2518104f4537	local-admin	\N	/objects/uploads/demo-1764427896016-gb66rzm-photo-0.jpg	/objects/uploads/demo-1764427896016-gb66rzm-video-0.mp4	/api/ar/storage/0e1c37b9-9315-46e4-b154-2518104f4537/mask.png	595	893	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/0e1c37b9-9315-46e4-b154-2518104f4537	/objects/ar-storage/0e1c37b9-9315-46e4-b154-2518104f4537/index.html	/objects/ar-storage/0e1c37b9-9315-46e4-b154-2518104f4537/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "shapeType": "circle", "cropRegion": {"x": 0, "y": 0, "width": 1, "height": 0.9999999999999999}, "aspectLocked": true, "markersCount": 1, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	\N	\N	12512	f	\N	\N	f	500.00	t	2025-11-30 14:51:36.024	2025-11-29 14:51:36.2532	2025-11-29 14:54:15.44
27f8a22f-f7b6-449c-9f35-20c4ee07c1cc	local-admin	\N	/objects/uploads/demo-1764489288894-a64u4nr-photo-0.jpg	/objects/uploads/demo-1764489288894-a64u4nr-video-0.mp4	/api/ar/storage/27f8a22f-f7b6-449c-9f35-20c4ee07c1cc/mask.png	595	893	\N	\N	\N	ready	\N	https://intertransversal-delisa-yappingly.ngrok-free.dev/ar/view/27f8a22f-f7b6-449c-9f35-20c4ee07c1cc	/objects/ar-storage/27f8a22f-f7b6-449c-9f35-20c4ee07c1cc/index.html	/objects/ar-storage/27f8a22f-f7b6-449c-9f35-20c4ee07c1cc/qr-code.png	\N	\N	{"loop": true, "zoom": 1, "fitMode": "cover", "offsetX": 0, "offsetY": 0, "autoPlay": true, "cropRegion": {"x": 0, "y": 0, "width": 0.992857142857143, "height": 0.9982142857142855}, "aspectLocked": true, "markersCount": 1, "videoPosition": {"x": 0, "y": 0, "z": 0}, "videoRotation": {"x": 0, "y": 0, "z": 0}}	\N	\N	\N	\N	\N	\N	\N	contain	\N	\N	t	0.0000	0.0000	0.0000	\N	\N	13248	f	\N	\N	f	500.00	t	2025-12-01 07:54:48.907	2025-11-30 07:54:49.394238	2025-11-30 08:30:54.227
\.


--
-- Data for Name: banner_analytics; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.banner_analytics (id, banner_id, event_type, user_id, session_id, page_url, user_agent, ip_address, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: banners; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.banners (id, name, type, title, content, image_url, button_text, button_link, background_color, text_color, "position", size, priority, is_active, status, start_date, end_date, target_pages, target_users, max_impressions, max_clicks, current_impressions, current_clicks, created_at, updated_at) FROM stdin;
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

COPY public.categories (id, name, slug, description, translations, parent_id, image_url, cover_image, banner_image, sort_order, "order", is_active, created_at, updated_at) FROM stdin;
8bccc07e-695b-4136-8028-59979b55774c	{"en": "Personalized Blank Photo Album", "hy": "Անհատականացված դատարկ ֆոտոալբոմ", "ka": "პერსონალიზებული ცარიელი ფოტოალბომი", "ru": "Персональный фотоальбом без фото"}	personalniy-fotoalbom-bez-foto	{"en": "Create your unique photo album", "hy": "Ստեղծեք ձեր եզակի ֆոտոալբոմը", "ka": "შექმენით თქვენი უნიკალური ფოტოალბომი", "ru": "Создайте свой уникальный фотоальбом"}	\N	\N	/objects/local-upload/4a86b02a-6d6f-4079-a044-e79cb1ee7584.png	\N	/objects/local-upload/2677471f-f412-4b62-b32b-090e605e85b7.png	2	1	t	2025-10-11 21:38:11.937	2025-11-29 16:51:52.114147
f65c889f-211e-49dc-92c6-8d420b221d43	{"en": "Photobooks", "hy": "Ֆոտոգրքեր", "ru": "Фотокниги"}	fotoknigi	{"en": "Premium photobooks for special moments", "hy": "Պրեմիում ֆոտոգրքեր հատուկ պահերի համար", "ru": "Премиальные фотокниги для особых моментов"}	{"en": {"name": "Photobooks", "slug": "photobooks", "description": "Premium photobooks for special moments"}, "hy": {"name": "Ֆոտոգրքեր", "slug": "fotogrqer", "description": "Պրեմիում ֆոտոգրքեր հատուկ պահերի համար"}, "ru": {"name": "Фотокниги", "slug": "fotoknigi", "description": "Премиальные фотокниги для особых моментов"}}	\N	/objects/local-upload/7ba03af2-2519-4fb0-bfaf-93b6ba359eea.png	\N	/objects/local-upload/d0e36118-9512-44c2-ad3f-3a1f922eb002.png	1	1	t	2025-10-08 14:50:41.887	2025-11-29 16:51:52.114147
8157f83f-422f-459f-a473-33ba75bc18c0	{"en": "Calendars", "hy": "Օրացույցներ", "ka": "კალენდრები", "ru": "Календари"}	kalendari	{"en": "Personalized calendars for every taste", "hy": "Անհատականացված օրացույցներ յուրաքանչյուր ճաշակի համար", "ka": "პერსონალიზებული კალენდრები ყველა გემოვნებისთვის", "ru": "Персонализированные календари на любой вкус"}	\N	\N	/objects/local-upload/dbd573ed-cd05-41df-85ad-22dc7973c5c8.jpg	\N	\N	3	1	t	2025-10-09 15:27:14.642	2025-11-29 16:51:52.114147
2f8e2b3d-0773-4e1b-8137-15d90f357498	{"en": "Wish Book", "hy": "Մաղթանքների գիրք", "ka": "სურვილების წიგნი", "ru": "Книга пожеланий"}	kniga-pozhelaniy	{"en": "Wish book for special events", "hy": "Մաղթանքների գիրք հատուկ իրադարձությունների համար", "ka": "სურვილების წიგნი განსაკუთრებული მოვლენებისთვის", "ru": "Книга пожеланий для особых событий"}	\N	\N	/objects/local-upload/2aa1f853-882d-4383-b1b1-6e4b1460b81b.png	\N	\N	4	1	t	2025-10-09 12:54:33.708	2025-11-29 16:51:52.114147
cd5e2a70-d90a-403b-aa1c-9ccd8775e578	{"en": "Wedding Photobooks", "hy": "Հարսանեկան ֆոտոգրքեր", "ka": "საქორწინო ფოტოწიგნები", "ru": "Свадебные фотокниги"}	svadebnye-fotoknigi	{"en": "A wedding photobook is the perfect way to preserve the most precious moments of your special day. With premium printing quality, elegant design, and durable binding, it becomes a timeless family heirloom.", "hy": "Հարսանեկան ֆոտոգիրքը կատարյալ միջոց է ձեր տոնակատարության ամենաթանկ պահերը հավերժացնելու համար։ Բարձրակարգ տպագրություն, նրբագեղ ձևավորում և ամուր կազմակերպում՝ ստեղծելու իսկական ընտանեկան ժառանգություն։", "ka": "საქორწინო ფოტოწიგნი თქვენი ზეიმის ყველაზე ძვირფასი მომენტების შენარჩუნების იდეალური გზაა.", "ru": "Свадебная фотокнига — это идеальный способ сохранить самые ценные мгновения вашего торжества. Профессиональная печать высочайшего качества, элегантный дизайн и прочный переплёт превращают её в настоящую семейную реликвию."}	\N	f65c889f-211e-49dc-92c6-8d420b221d43	https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	\N	\N	1	1	t	2025-10-08 18:14:33.217	2025-11-29 16:51:52.131163
67b3ef53-3b2c-4eae-88d2-13bc72a701da	{"en": "Children's Photobooks", "hy": "Մանկական ֆոտոգրքեր", "ka": "საბავშვო ფოტოწიგნები", "ru": "Детские фотокниги"}	detskie-fotoknigi	{"en": "Photobooks for newborns and children — capture every important moment of growing up", "hy": "Ֆոտոգրքեր նորածինների և երեխաների համար — հավերժացրեք աճի յուրաքանչյուր կարևոր պահ", "ka": "ფოტოწიგნები ახალშობილებისა და ბავშვებისთვის", "ru": "Фотокниги для новорожденных и детей — запечатлейте каждый важный момент взросления"}	\N	f65c889f-211e-49dc-92c6-8d420b221d43	https://images.unsplash.com/photo-1544776527-f5e7dfe4e2d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	http://localhost:5002/objects/local-upload/7c493309-8ed3-4b78-89aa-9d4aa069098a.jpg	http://localhost:5002/objects/local-upload/2307e8ef-dc6c-4df5-a676-b42d584270f0.png	2	1	t	2025-10-08 18:14:33.243	2025-11-29 16:51:52.131163
25d862bb-da4f-4118-b8ce-308a6575f8b3	{"en": "Family Photobooks", "hy": "Ընտանեկան ֆոտոգրքեր", "ka": "ოჯახური ფოტოწიგნები", "ru": "Семейные фотокниги"}	semeynye-fotoknigi	{"en": "A family photobook brings generations together in one beautiful story. Gather your family's warmest moments — from celebrations to everyday joys — in an elegant premium album.", "hy": "Ընտանեկան ֆոտոգիրքը միավորում է սերունդները մեկ գեղեցիկ պատմության մեջ։ Հավաքեք ձեր ընտանիքի ամենջերմ պահերը՝ ընտանեկան տոներից մինչև ամենօրյա ուրախություններ՝ էլեգանտ պրեմիում ալբոմում։", "ka": "ოჯახური ფოტოწიგნი თაობებს აერთიანებს ერთ მშვენიერ ისტორიაში.", "ru": "Семейная фотокнига объединяет поколения в одной прекрасной истории. Соберите самые тёплые моменты вашей семьи — от семейных праздников до повседневных радостей — в элегантном альбоме премиального качества."}	\N	f65c889f-211e-49dc-92c6-8d420b221d43	https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	\N	\N	3	1	t	2025-10-08 18:14:33.261	2025-11-29 16:51:52.131163
9866dd0d-538d-4054-a320-7d70e4658b59	{"en": "Travel Photobooks", "hy": "Ճանապարհորդական ֆոտոգրքեր", "ka": "სამოგზაურო ფოტოწიგნები", "ru": "Фотокниги о путешествиях"}	fotoknigi-o-puteshestviyakh	{"en": "A travel photobook is your personal guide to unforgettable adventures. Transform every journey into a captivating story with vibrant photos, route maps, and travel notes.", "hy": "Ճանապարհորդական ֆոտոգիրքը ձեր անձնական ուղեցույցն է դեպի անմոռանալի արկածներ։ Վերածեք յուրաքանչյուր ճանապարհորդությունը գրավիչ պատմության՝ վառ լուսանկարներով, երթուղիների քարտեզներով և տպավորությունների գրառումներով։", "ka": "სამოგზაურო ფოტოწიგნი თქვენი პირადი გზამკვლევია დაუვიწყარ თავგადასავლებში.", "ru": "Фотокнига путешествий — ваш личный путеводитель по незабываемым приключениям. Превратите каждую поездку в захватывающую историю с яркими фотографиями, картами маршрутов и записями впечатлений."}	\N	f65c889f-211e-49dc-92c6-8d420b221d43	https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	http://localhost:5002/objects/local-upload/15956a4a-ee14-4176-9e5e-5513c893aa10.jpg	http://localhost:5002/objects/local-upload/3a5fdd77-87d1-400d-8e6c-0386990ce9dd.png	4	1	t	2025-10-08 18:14:33.281	2025-11-29 16:51:52.131163
f2d6b43c-ba20-4fd1-aac7-b1eaf1b9ba1f	{"en": "Gift Photobooks", "hy": "Նվերային ֆոտոգրքեր", "ka": "სასაჩუქრე ფოტოწიგნები", "ru": "Подарочные фотокниги"}	podarochnye-fotoknigi	{"en": "A gift photobook is the most personal and touching present you can create with your own hands. Surprise loved ones with a unique album filled with shared memories and warm wishes.", "hy": "Նվերային ֆոտոգիրքը ամենանկատական և շոշափելի նվերն է, որը կարելի է ստեղծել ձեր ձեռքերով։ Զարմացրեք սիրելիներին եզակի ալբոմով, լի համատեղ հիշողություններով և ջերմ մաղթանքներով։", "ka": "სასაჩუქრე ფოტოწიგნი ყველაზე პერსონალური და შემძრავი საჩუქარია.", "ru": "Подарочная фотокнига — это самый персональный и трогательный подарок, который можно создать своими руками. Удивите близких уникальным альбомом, наполненным общими воспоминаниями и тёплыми пожеланиями."}	\N	f65c889f-211e-49dc-92c6-8d420b221d43	https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	\N	\N	5	1	t	2025-10-08 18:14:33.3	2025-11-29 16:51:52.131163
8f22972a-9fcc-4193-8139-9af65b00600d	{"en": "Anniversary Photobooks", "hy": "Հոբելյանական ֆոտոգրքեր", "ka": "იუბილეური ფოტოწიგნები", "ru": "Юбилейные фотокниги"}	yubileynye-fotoknigi	{"en": "An anniversary photobook is a ceremonial chronicle of important achievements and memorable milestones. Create a magnificent album worthy of the significant date, featuring event chronology, historical photos, and congratulations from loved ones.", "hy": "Հոբելյանական ֆոտոգիրքը կարևոր ձեռքբերումների և հիշարժան կետերի հանդիսավոր քրոնիկան է։ Ստեղծեք վեհանձն ալբոմ, որը արժանի է նշանակալի ամսաթվին՝ իրադարձությունների քրոնոլոգիայով, պատմական լուսանկարներով և մերձավորների շնորհավորություններով։", "ka": "იუბილეური ფოტოწიგნი მნიშვნელოვანი მიღწევებისა და დასამახსოვრებელი ეტაპების ქრონიკაა.", "ru": "Юбилейная фотокнига — торжественная летопись важных достижений и памятных вех. Создайте величественный альбом, достойный значимой даты, с хронологией событий, историческими фотографиями и поздравлениями от близких."}	\N	f65c889f-211e-49dc-92c6-8d420b221d43	https://images.unsplash.com/photo-1464207687429-7505649dae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	\N	\N	6	1	t	2025-10-08 18:14:33.32	2025-11-29 16:51:52.131163
2c8987b3-0a4e-4ef8-ac2e-4a7d0dec5147	{"en": "Corporate Photobooks", "hy": "Կորպորատիվ ֆոտոգրքեր", "ka": "კორპორატიული ფოტოწიგნები", "ru": "Корпоративные фотокниги"}	korporativnye-fotoknigi	{"en": "A corporate photobook is a prestigious tool for presenting your company's history and achievements. Create a professional album featuring office spaces, team members, production processes, and corporate events.", "hy": "Կորպորատիվ ֆոտոգիրքը ձեր ընկերության պատմությունն ու ձեռքբերումները ներկայացնելու պրեստիժային գործիք է։ Ստեղծեք մասնագիտական ալբոմ գրասենյակների, թիմի, արտադրական գործընթացների և կորպորատիվ միջոցառումների լուսանկարներով։", "ka": "კორპორატიული ფოტოწიგნი თქვენი კომპანიის ისტორიისა და მიღწევების წარმოჩენის პრესტიჟული ინსტრუმენტია.", "ru": "Корпоративная фотокнига — престижный инструмент для презентации истории и достижений вашей компании. Создайте профессиональный альбом с фотографиями офисов, команды, производственных процессов и корпоративных мероприятий."}	\N	f65c889f-211e-49dc-92c6-8d420b221d43	https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	\N	\N	7	1	t	2025-10-08 18:14:33.349	2025-11-29 16:51:52.131163
cf618984-8260-4031-b522-9805cb1798a7	{"en": "Graduation Photobooks", "hy": "Ավարտական ֆոտոգրքեր", "ka": "სამაგისტრო ფოტოწიგნები", "ru": "Выпускные фотокниги"}	vypusknye-fotoknigi	{"en": "A graduation photobook is a bright memory of the best years of study and friendship. Collect unforgettable moments of school or student life in a stylish album with class photos, group shots, and personal messages from classmates.", "hy": "Ավարտական ֆոտոգիրքը ուսումների և բարեկամության լավագույն տարիների վառ հիշողությունն է։ Հավաքեք դպրոցական կամ ուսանողական կյանքի անմոռանալի պահերը ոճային ալբոմում դասարանային լուսանկարներով, խմբային նկարներով և դասընկերների անձնական նամակներով։", "ka": "საგამოსადეგო ფოტოწიგნი სწავლისა და მეგობრობის საუკეთესო წლების ნათელი მოგონებაა.", "ru": "Выпускная фотокнига — яркая память о лучших годах учёбы и дружбы. Соберите незабываемые моменты школьной или студенческой жизни в стильном альбоме с классными фотографиями, групповыми снимками и личными посланиями одноклассников."}	\N	f65c889f-211e-49dc-92c6-8d420b221d43	https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	\N	\N	8	1	t	2025-10-08 18:14:33.369	2025-11-29 16:51:52.131163
b161deed-cf28-4356-bff5-6ae3ba7b3d88	{"en": "Personalized Photobooks", "hy": "Անհատականացված ֆոտոգրքեր", "ka": "პერსონალიზებული ფოტოწიგნები", "ru": "Персонализированные фотокниги"}	personalizirovannye-fotoknigi	{"en": "A personalized photobook is the embodiment of your individuality in every detail. Create an absolutely unique album with exclusive design, custom layout, and original decorative elements.", "hy": "Անհատականացված ֆոտոգիրքը ձեր անհատականության մարմնավորումն է յուրաքանչյուր մանրուքում։ Ստեղծեք բացարձակապես եզակի ալբոմ էքսկլյուզիվ դիզայնով, անհատական կոմպոզիցիայով և հեղինակային ձևավորման տարրերով։", "ka": "პერსონალიზებული ფოტოწიგნი თქვენი ინდივიდუალურობის განსახიერებაა ყოველ დეტალში.", "ru": "Персонализированная фотокнига — воплощение вашей индивидуальности в каждой детали. Создайте абсолютно уникальный альбом с эксклюзивным дизайном, индивидуальной вёрсткой и авторскими элементами оформления."}	\N	f65c889f-211e-49dc-92c6-8d420b221d43	https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	\N	\N	9	1	t	2025-10-08 18:14:33.389	2025-11-29 16:51:52.131163
ed5930e6-0add-44ed-a4fb-12672cd1bfb8	{"en": "Premium Photobooks", "hy": "Պրեմիում ֆոտոգրքեր", "ka": "პრემიუმ ფოტოწიგნები", "ru": "Премиум фотокниги"}	premium-fotoknigi	{"en": "A premium photobook is the epitome of luxury and impeccable quality in the world of print production. Crafted from elite materials using cutting-edge printing technologies, it represents a true work of polygraphic art.", "hy": "Պրեմիում ֆոտոգիրքը շքեղության և անբասիր որակի չափանիշն է տպագրական արտադրության աշխարհում։ Պատրաստված էլիտար նյութերից առաջադեմ տպագրական տեխնոլոգիաների օգտագործմամբ՝ այն ներկայացնում է իսկական պոլիգրաֆիական արվեստի գործ։", "ka": "პრემიუმ ფოტოწიგნი ფუფუნების და უმაღლესი ხარისხის ეტალონია.", "ru": "Премиум фотокнига — эталон роскоши и безупречного качества в мире печатной продукции. Изготовленная из элитных материалов с использованием передовых технологий печати, она представляет собой настоящее произведение полиграфического искусства."}	\N	f65c889f-211e-49dc-92c6-8d420b221d43	https://images.unsplash.com/photo-1542038784456-1ea8e935640e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	\N	\N	10	1	t	2025-10-08 18:14:33.408	2025-11-29 16:51:52.131163
aaac9c8e-5898-4db2-b831-758119ff42a4	{"en": "Test Subcategory", "hy": "Փորձնական ենթակատեգորիա", "ka": "სატესტო ქვეკატეგორია", "ru": "Тестовая подкатегория"}	test-podkategoriya	{"en": "Test description", "hy": "Փորձնական նկարագրություն", "ka": "ტესტის აღწერა", "ru": "Тестовое описание"}	\N	f65c889f-211e-49dc-92c6-8d420b221d43	https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300	http://localhost:5002/objects/local-upload/cb239409-5b6f-448a-aca3-0a0aab265bb2.jpg	\N	11	1	t	2025-10-08 21:32:42.258	2025-11-29 16:51:52.131163
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
eb515ccf-4d0c-4065-a1b6-30eea3b14982	AMD	{"en": "Armenian Dram", "hy": "Հայկական դրամ", "ru": "Армянский драм"}	֏	t	t	1	2025-11-29 13:50:38.923	2025-11-29 13:50:38.923
e5d0daf1-67de-4257-88bd-27ca65e07773	USD	{"en": "US Dollar", "hy": "ԱՄՆ դոլար", "ru": "Доллар США"}	$	f	t	2	2025-11-29 13:50:38.94	2025-11-29 13:50:38.94
c6a65745-a354-400a-99ca-fb8759ba5ec2	RUB	{"en": "Russian Ruble", "hy": "Ռուսական ռուբլի", "ru": "Российский рубль"}	₽	f	t	3	2025-11-29 13:50:38.955	2025-11-29 13:50:38.955
\.


--
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.exchange_rates (id, from_currency_id, to_currency_id, rate, source, is_manual, created_at, updated_at) FROM stdin;
7abe2ff3-2301-4f86-a9f7-84729cd5df78	eb515ccf-4d0c-4065-a1b6-30eea3b14982	e5d0daf1-67de-4257-88bd-27ca65e07773	0.00260000	manual	t	2025-11-29 13:50:38.967	2025-11-29 13:50:38.967
b1fb2019-863a-4293-8a7c-b9d3b27a01c8	e5d0daf1-67de-4257-88bd-27ca65e07773	eb515ccf-4d0c-4065-a1b6-30eea3b14982	385.00000000	manual	t	2025-11-29 13:50:38.976	2025-11-29 13:50:38.976
0fcc7ded-7ac9-4699-87dc-f7632f53f655	eb515ccf-4d0c-4065-a1b6-30eea3b14982	c6a65745-a354-400a-99ca-fb8759ba5ec2	0.25000000	manual	t	2025-11-29 13:50:38.983	2025-11-29 13:50:38.983
294288b9-a82f-43e6-8526-eefb67c52758	c6a65745-a354-400a-99ca-fb8759ba5ec2	eb515ccf-4d0c-4065-a1b6-30eea3b14982	4.00000000	manual	t	2025-11-29 13:50:38.999	2025-11-29 13:50:38.999
1b26b708-3bb7-4510-8353-ca751cc638ec	e5d0daf1-67de-4257-88bd-27ca65e07773	c6a65745-a354-400a-99ca-fb8759ba5ec2	96.00000000	manual	t	2025-11-29 13:50:39.005	2025-11-29 13:50:39.005
53a697b1-7758-4844-bee5-af373a25e760	c6a65745-a354-400a-99ca-fb8759ba5ec2	e5d0daf1-67de-4257-88bd-27ca65e07773	0.01040000	manual	t	2025-11-29 13:50:39.011	2025-11-29 13:50:39.011
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.order_items (id, order_id, product_id, product_name, product_image_url, quantity, unit_price, total_price, options, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: photobooks
--

COPY public.orders (id, user_id, customer_name, customer_email, customer_phone, shipping_address, total_amount, currency_id, exchange_rate, status, items, created_at, updated_at) FROM stdin;
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

COPY public.products (id, name, description, hashtags, price, currency_id, original_price, discount_percentage, in_stock, stock_quantity, is_on_sale, image_url, images, video_url, videos, category_id, subcategory_id, options, photobook_format, photobook_size, min_spreads, additional_spread_price, additional_spread_currency_id, paper_type, cover_material, binding_type, production_time, shipping_time, weight, allow_customization, min_custom_price, min_custom_price_currency_id, is_ready_made, cost_price, cost_currency_id, material_costs, labor_costs, overhead_costs, shipping_costs, other_costs, expected_profit_margin, is_active, sort_order, special_pages, created_at) FROM stdin;
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
local-admin	admin@local.test	Админ	Локальный	\N	\N	admin	2025-11-29 14:02:22.043289	2025-11-29 14:02:22.043289
794e6564-3c2a-491a-9406-ad4d86d906fc	admin@photobooks.local	Администратор	PhotoBooks	\N	$2b$12$31bfaSNSxtOBGRWJbxCnTOgcxmZWfGqqIcijwA.naFi2.TsTKRE6S	admin	2025-11-30 07:57:00.321598	2025-11-30 07:57:00.321598
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

\unrestrict eJ6UNNa7HpPZ9sbxFKYCzHIIC1mux2V6dSuxHVPXg8TrlIdOIaEtcRAmNWg2Dsf

