-- Migration: Add subcategory support and indexes
-- Date: 2025-10-05

-- Add subcategory_id to products table
ALTER TABLE products ADD COLUMN subcategory_id VARCHAR;

-- Add foreign key constraint for subcategory_id
ALTER TABLE products ADD CONSTRAINT products_subcategory_id_fkey 
  FOREIGN KEY (subcategory_id) REFERENCES categories(id);

-- Add indexes for categories table
CREATE INDEX IF NOT EXISTS IDX_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS IDX_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS IDX_categories_active ON categories(is_active);

-- Add index for products subcategory_id
CREATE INDEX IF NOT EXISTS IDX_products_subcategory_id ON products(subcategory_id);