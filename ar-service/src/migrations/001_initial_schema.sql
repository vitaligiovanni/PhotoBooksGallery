-- AR Service Database Schema
-- Isolated database for AR compilation microservice
-- NO foreign keys to main database (eventual consistency via webhooks)

-- AR Projects Table
CREATE TABLE IF NOT EXISTS ar_projects (
  id VARCHAR(255) PRIMARY KEY,                    -- demo-{timestamp}-{random}
  
  -- User & Order reference (IDs from main database, no FK constraints)
  user_id VARCHAR(255) NOT NULL,
  order_id VARCHAR(255),                          -- NULL for DEMO projects
  
  -- Original files (paths relative to shared storage)
  photo_url VARCHAR(500) NOT NULL,
  video_url VARCHAR(500),                         -- OPTIONAL: AR can work with photo only
  mask_url VARCHAR(500),
  
  -- Compiled assets (relative paths)
  marker_mind_url VARCHAR(500),                   -- /ar-storage/{id}/marker.mind
  viewer_html_url VARCHAR(500),                   -- /ar-storage/{id}/index.html
  qr_code_url VARCHAR(500),                       -- /ar-storage/{id}/qr-code.png
  view_url VARCHAR(500),                          -- Public viewer URL
  
  -- Compilation status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending/queued/processing/ready/error
  queue_job_id VARCHAR(255),                      -- pg-boss job ID
  
  -- Timing
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  queued_at TIMESTAMP,
  compilation_started_at TIMESTAMP,
  compilation_finished_at TIMESTAMP,
  compilation_time_ms INTEGER,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Media metadata
  photo_width INTEGER,
  photo_height INTEGER,
  video_width INTEGER,
  video_height INTEGER,
  video_duration_ms INTEGER,
  photo_aspect_ratio VARCHAR(20),
  video_aspect_ratio VARCHAR(20),
  
  -- Configuration
  config JSONB,                                   -- {fitMode, useSmartCrop, zoom, etc}
  fit_mode VARCHAR(20) DEFAULT 'contain',
  scale_width VARCHAR(20),
  scale_height VARCHAR(20),
  
  -- Demo mode (24h auto-delete)
  is_demo BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP,
  
  -- Notifications
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP,
  
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ar_projects_user_id ON ar_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_ar_projects_order_id ON ar_projects(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ar_projects_status ON ar_projects(status);
CREATE INDEX IF NOT EXISTS idx_ar_projects_created_at ON ar_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_projects_demo_expires ON ar_projects(expires_at) WHERE is_demo = TRUE;

-- Multi-target projects (живые фото albums)
CREATE TABLE IF NOT EXISTS ar_project_items (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL REFERENCES ar_projects(id) ON DELETE CASCADE,
  target_index INTEGER NOT NULL,
  name VARCHAR(255),
  photo_url VARCHAR(500) NOT NULL,
  video_url VARCHAR(500),                         -- OPTIONAL
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ar_project_items_project ON ar_project_items(project_id);
CREATE INDEX IF NOT EXISTS idx_ar_project_items_target_index ON ar_project_items(project_id, target_index);

-- Compilation logs (detailed tracking)
CREATE TABLE IF NOT EXISTS ar_compilation_logs (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL REFERENCES ar_projects(id) ON DELETE CASCADE,
  
  step VARCHAR(100) NOT NULL,                     -- resize/enhance/compile/qr/email
  status VARCHAR(50) NOT NULL,                    -- started/completed/failed
  
  duration_ms INTEGER,
  details JSONB,                                  -- Step-specific data
  error TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ar_logs_project ON ar_compilation_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_ar_logs_created ON ar_compilation_logs(created_at DESC);

-- Webhook events (audit trail)
CREATE TABLE IF NOT EXISTS ar_webhook_events (
  id SERIAL PRIMARY KEY,
  
  event_type VARCHAR(100) NOT NULL,               -- compilation_complete/order_deleted
  project_id VARCHAR(255),
  payload JSONB NOT NULL,
  
  -- HTTP response
  response_status INTEGER,
  response_body TEXT,
  
  -- Retry
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_type ON ar_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_next_retry ON ar_webhook_events(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ar_projects_updated_at 
  BEFORE UPDATE ON ar_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE ar_projects IS 'AR compilation projects - isolated from main database';
COMMENT ON COLUMN ar_projects.user_id IS 'Reference to users.id from main database (no FK)';
COMMENT ON COLUMN ar_projects.order_id IS 'Reference to orders.id from main database (no FK)';
COMMENT ON COLUMN ar_projects.is_demo IS 'DEMO projects auto-delete after 24h';
COMMENT ON TABLE ar_compilation_logs IS 'Detailed step-by-step compilation tracking';
COMMENT ON TABLE ar_webhook_events IS 'Webhook calls to main backend (audit trail)';
