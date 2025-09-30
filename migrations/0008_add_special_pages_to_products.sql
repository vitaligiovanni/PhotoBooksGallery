-- Add special_pages column to products table for special page assignment
ALTER TABLE products ADD COLUMN IF NOT EXISTS special_pages text[] DEFAULT '{}';