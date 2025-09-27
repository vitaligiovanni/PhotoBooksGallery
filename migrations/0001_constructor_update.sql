-- Миграция для обновления таблиц конструктора страниц
-- Добавляем поддержку многоязычных полей и улучшаем структуру

-- Обновляем таблицу pages для поддержки JSONB полей
ALTER TABLE pages 
ALTER COLUMN title TYPE jsonb USING jsonb_build_object('ru', title),
ALTER COLUMN description TYPE jsonb USING jsonb_build_object('ru', description);

-- Добавляем недостающие колонки в таблицу pages
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS meta_title varchar(255),
ADD COLUMN IF NOT EXISTS keywords varchar(500),
ADD COLUMN IF NOT EXISTS is_homepage boolean DEFAULT false;

-- Обновляем таблицу blocks для соответствия новой структуре
ALTER TABLE blocks 
ADD COLUMN IF NOT EXISTS title varchar,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Удаляем старые колонки, если они существуют
ALTER TABLE blocks 
DROP COLUMN IF EXISTS is_visible,
DROP COLUMN IF EXISTS uuid;

-- Создаем индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_is_published ON pages(is_published);
CREATE INDEX IF NOT EXISTS idx_pages_is_homepage ON pages(is_homepage);
CREATE INDEX IF NOT EXISTS idx_blocks_page_id ON blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_blocks_sort_order ON blocks(sort_order);
CREATE INDEX IF NOT EXISTS idx_blocks_is_active ON blocks(is_active);

-- Обновляем существующие данные
UPDATE pages SET 
  meta_title = title->>'ru',
  keywords = '',
  is_homepage = false
WHERE meta_title IS NULL;

-- Устанавливаем homepage, если нужно
UPDATE pages SET is_homepage = true WHERE slug = 'home' OR slug = 'index';
