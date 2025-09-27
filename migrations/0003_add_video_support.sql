-- Migration: Add video support to products table
-- Date: 2025-09-14
-- Description: Adds video_url and videos columns to support video uploads for products

ALTER TABLE products 
ADD COLUMN video_url VARCHAR,
ADD COLUMN videos TEXT[];