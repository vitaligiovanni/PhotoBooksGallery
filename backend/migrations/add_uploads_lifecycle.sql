-- Add lifecycle support for uploads: admin holds, postponements, and scheduled deletion
DO $$ BEGIN
  -- Add new enum value for upload_status
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'upload_status' AND e.enumlabel = 'scheduled_for_deletion'
  ) THEN
    ALTER TYPE upload_status ADD VALUE 'scheduled_for_deletion';
  END IF;
END $$;

-- Add lifecycle columns if they don't exist
ALTER TABLE uploads
  ADD COLUMN IF NOT EXISTS delete_after_days integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS delete_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_hold boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS postponed_until timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
