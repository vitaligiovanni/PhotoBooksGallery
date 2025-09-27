-- Migration: Add SEO fields to pages table
-- Date: 2025-09-19
-- Description: Adds missing SEO fields (keywords, canonical_url, og_image, twitter_card, structured_data, noindex, language) to pages table

ALTER TABLE pages
ADD COLUMN IF NOT EXISTS keywords text,
ADD COLUMN IF NOT EXISTS canonical_url varchar(500),
ADD COLUMN IF NOT EXISTS og_image varchar(500),
ADD COLUMN IF NOT EXISTS twitter_card varchar(50) DEFAULT 'summary_large_image',
ADD COLUMN IF NOT EXISTS structured_data jsonb,
ADD COLUMN IF NOT EXISTS noindex boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS language varchar(10) DEFAULT 'ru';