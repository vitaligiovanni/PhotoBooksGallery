-- Upload photo sessions table
-- This table stores photo upload sessions from non-registered users

CREATE TYPE upload_status AS ENUM ('pending', 'uploaded', 'processing', 'completed', 'deleted');

CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  format VARCHAR(20) NOT NULL CHECK (format IN ('square', 'album', 'book')),
  size VARCHAR(20) NOT NULL,
  pages INTEGER DEFAULT 24 CHECK (pages >= 20 AND pages <= 200),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  comment TEXT,
  files JSONB DEFAULT '[]'::jsonb,
  status upload_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '48 hours'),
  admin_notified BOOLEAN DEFAULT FALSE,
  telegram_sent BOOLEAN DEFAULT FALSE,
  zip_generated_at TIMESTAMP WITH TIME ZONE,
  zip_downloaded_at TIMESTAMP WITH TIME ZONE,
  total_file_size BIGINT DEFAULT 0,
  file_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_uploads_status ON uploads(status);
CREATE INDEX idx_uploads_created_at ON uploads(created_at);
CREATE INDEX idx_uploads_expires_at ON uploads(expires_at);
CREATE INDEX idx_uploads_phone ON uploads(phone);
CREATE INDEX idx_uploads_admin_notified ON uploads(admin_notified) WHERE admin_notified = false;

-- Add comment
COMMENT ON TABLE uploads IS 'Photo upload sessions from non-registered users for photobook creation';
COMMENT ON COLUMN uploads.files IS 'Array of {key, filename, size, mimeType, uploadedAt} objects';
COMMENT ON COLUMN uploads.expires_at IS 'When the upload session expires and files should be cleaned up';