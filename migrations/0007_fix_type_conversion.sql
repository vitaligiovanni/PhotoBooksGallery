-- Fix TYPE conversion issues in 0001_lethal_darwin.sql
-- This should be run to clean up before re-running 0001
DO $$
BEGIN
    -- Revert problematic changes if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pages' AND column_name = 'title' AND data_type = 'jsonb') THEN
        ALTER TABLE pages ALTER COLUMN title SET DATA TYPE text USING title::text;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pages' AND column_name = 'description' AND data_type = 'jsonb') THEN
        ALTER TABLE pages ALTER COLUMN description SET DATA TYPE text USING description::text;
    END IF;
END $$;