-- Migration: add show_in_header_nav to pages
ALTER TABLE pages ADD COLUMN IF NOT EXISTS show_in_header_nav boolean DEFAULT false;