-- Migration: Add coverImage and bannerImage columns to categories table
-- Date: 2025-01-15
-- Description: Adds support for dual images in subcategories (cover image for cards, banner image for pages)

-- Add coverImage column (for subcategory cards/thumbnails)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS cover_image VARCHAR;

-- Add bannerImage column (for subcategory page hero banners)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS banner_image VARCHAR;

-- Add comments for documentation
COMMENT ON COLUMN categories.cover_image IS 'Cover image URL for subcategory cards and thumbnails';
COMMENT ON COLUMN categories.banner_image IS 'Banner image URL for subcategory page hero sections';