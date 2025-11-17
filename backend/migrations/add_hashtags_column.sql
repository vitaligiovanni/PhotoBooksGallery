-- Migration: Add hashtags column to products table
-- Date: 2025-10-05  
-- Description: Adds JSONB column to store hashtags for SEO optimization with multilanguage support

-- Add the hashtags column with JSONB type
ALTER TABLE products 
ADD COLUMN hashtags JSONB DEFAULT '{"ru": [], "hy": [], "en": []}'::jsonb;

-- Add comment to the column for documentation
COMMENT ON COLUMN products.hashtags IS 'SEO хэштеги для товара в формате {"ru": ["#тег1", "#тег2"], "hy": ["#տեգ1"], "en": ["#tag1", "#tag2"]}';

-- Create GIN index for better JSONB query performance
CREATE INDEX idx_products_hashtags_gin ON products USING GIN(hashtags);

-- Create partial index for hashtags existence for faster lookups
CREATE INDEX idx_products_hashtags_exists ON products(id) WHERE hashtags IS NOT NULL AND hashtags != '{"ru": [], "hy": [], "en": []}'::jsonb;