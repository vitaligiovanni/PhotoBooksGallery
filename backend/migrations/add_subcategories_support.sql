-- Migration: Add subcategories support to categories table
-- Date: 2025-10-05

-- Add new columns to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS translations JSONB,
ADD COLUMN IF NOT EXISTS parent_id VARCHAR REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index for parent_id for better performance
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Create index for is_active for better performance  
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Update existing categories to have is_active = true
UPDATE categories SET is_active = true WHERE is_active IS NULL;

-- Migrate existing name and description to translations field (backwards compatibility)
UPDATE categories 
SET translations = jsonb_build_object(
    'ru', jsonb_build_object(
        'name', COALESCE(name->>'ru', ''),
        'slug', slug,
        'description', COALESCE(description->>'ru', '')
    ),
    'hy', jsonb_build_object(
        'name', COALESCE(name->>'hy', ''),
        'slug', slug || '-hy',
        'description', COALESCE(description->>'hy', '')
    ),
    'en', jsonb_build_object(
        'name', COALESCE(name->>'en', ''),
        'slug', slug || '-en', 
        'description', COALESCE(description->>'en', '')
    )
)
WHERE translations IS NULL;

COMMENT ON COLUMN categories.parent_id IS 'Self-referencing foreign key for category hierarchy';
COMMENT ON COLUMN categories.translations IS 'Multi-language support: {ru: {name, slug, description}, hy: {...}, en: {...}}';
COMMENT ON COLUMN categories.is_active IS 'Flag to soft-delete categories';