-- Migration: Add demo mode fields to ar_projects table
-- Date: 2025-11-22
-- Purpose: Support temporary demo AR projects with 24h expiration

-- Add isDemo flag (default false for existing projects)
ALTER TABLE ar_projects 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Add expiresAt timestamp (null for non-demo projects)
ALTER TABLE ar_projects 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for filtering demo projects
CREATE INDEX IF NOT EXISTS IDX_ar_projects_is_demo ON ar_projects(is_demo);

-- Add index for expiration cleanup queries
CREATE INDEX IF NOT EXISTS IDX_ar_projects_expires_at ON ar_projects(expires_at) WHERE expires_at IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN ar_projects.is_demo IS 'Temporary demo project (auto-deleted after expiration)';
COMMENT ON COLUMN ar_projects.expires_at IS 'Expiration timestamp for demo projects (24h default)';
