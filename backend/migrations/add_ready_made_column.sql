-- Migration: Add is_ready_made column to products table
-- Date: 2025-10-03
-- Description: Adds boolean column to differentiate ready-made products (frames, albums) from custom products (photobooks)

-- Add the column with default value false
ALTER TABLE products 
ADD COLUMN is_ready_made BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN products.is_ready_made IS 'Готовый товар (рамки, альбомы) vs кастомные товары (фотокниги). false = кастомный, true = готовый';

-- Create index for better query performance (optional but recommended)
CREATE INDEX idx_products_is_ready_made ON products(is_ready_made);

-- Update some example products to be ready-made (optional - for testing)
-- This is commented out so it can be run manually if needed:
-- UPDATE products SET is_ready_made = TRUE WHERE name->>'ru' LIKE '%рамк%' OR name->>'ru' LIKE '%альбом%';