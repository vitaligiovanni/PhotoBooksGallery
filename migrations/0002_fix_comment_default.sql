-- Fix comment default is_approved value from false to NULL
ALTER TABLE comments ALTER COLUMN is_approved DROP DEFAULT;
ALTER TABLE comments ALTER COLUMN is_approved SET DEFAULT NULL;
