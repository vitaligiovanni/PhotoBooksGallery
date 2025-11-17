-- Migration: Add order column to categories table for custom sorting
-- Date: 2025-10-11
-- Description: Adds order column to control display order of categories and subcategories

-- Add order column for custom sorting (defaults to 1, higher numbers = lower priority)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 1;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories("order");

-- Add comment for documentation
COMMENT ON COLUMN categories."order" IS 'Display order for categories (lower numbers appear first, 1 = default order)';