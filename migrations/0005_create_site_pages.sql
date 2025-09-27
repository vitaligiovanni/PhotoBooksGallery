-- Create table for static site pages meta
CREATE TABLE IF NOT EXISTS site_pages (
  key text PRIMARY KEY,
  title jsonb NOT NULL DEFAULT '{}'::jsonb,
  description jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_title jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_description jsonb NOT NULL DEFAULT '{}'::jsonb,
  hero_image_url text,
  is_published boolean NOT NULL DEFAULT true,
  show_in_header_nav boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed defaults for known pages
INSERT INTO site_pages (key, title, description, is_published, show_in_header_nav, sort_order)
VALUES
 ('catalog',  '{"ru":"Каталог","en":"Catalog","hy":"Կատալոգ"}',  '{}'::jsonb, true, true, 10),
 ('editor',   '{"ru":"Редактор","en":"Editor","hy":"Խմբագիր"}',  '{}'::jsonb, true, true, 20),
 ('blog',     '{"ru":"Блог","en":"Blog","hy":"Բլոգ"}',          '{}'::jsonb, true, true, 30),
 ('about',    '{"ru":"О нас","en":"About","hy":"Մեր մասին"}',    '{}'::jsonb, true, true, 40),
 ('contacts', '{"ru":"Контакты","en":"Contacts","hy":"Կոնտակտներ"}','{}'::jsonb, true, true, 50)
ON CONFLICT (key) DO NOTHING;
